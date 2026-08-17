/**
 * Durable state of the Agent Skills page: custom scan directories, per-directory
 * and per-skill switches. Owned by the host half; persisted atomically under
 * `$DSH_HOME/agent-skills/state.json` so toggles survive restarts without
 * touching the profile patch layer.
 *
 * @module dsh-agent-skills/store
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";

/** One configured scan directory (user-added or auto-discovered). */
export interface StateDir {
  path: string;
  enabled: boolean;
  /** True when auto-discovered from another AI coding agent's home. */
  auto?: boolean;
}

export interface AgentSkillsState {
  version: 1;
  /** Custom + auto-discovered scan directories (the "用户配置" sources). */
  dirs: StateDir[];
  /** Skill names the user switched off. */
  disabledSkills: string[];
  /** Builtin root paths the user switched off ("内置路径" sources). */
  disabledDirs: string[];
}

const STATE_VERSION = 1 as const;
const EMPTY: AgentSkillsState = {
  version: STATE_VERSION,
  dirs: [],
  disabledSkills: [],
  disabledDirs: []
};

/** Absolute path of the state file for a resolved dsh home. */
export function stateFilePath(dshHome = resolveDshHome()): string {
  return join(dshHome, "agent-skills", "state.json");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseState(raw: string): AgentSkillsState | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || parsed.version !== STATE_VERSION) return undefined;
  const dirs: StateDir[] = [];
  if (Array.isArray(parsed.dirs)) {
    for (const entry of parsed.dirs) {
      if (!isRecord(entry) || typeof entry.path !== "string" || entry.path === "") continue;
      dirs.push({
        path: resolve(entry.path),
        enabled: entry.enabled !== false,
        ...(entry.auto === true ? { auto: true } : {})
      });
    }
  }
  const disabledSkills: string[] = [];
  if (Array.isArray(parsed.disabledSkills)) {
    for (const name of parsed.disabledSkills) {
      if (typeof name === "string" && name !== "") disabledSkills.push(name);
    }
  }
  const disabledDirs: string[] = [];
  if (Array.isArray(parsed.disabledDirs)) {
    for (const path of parsed.disabledDirs) {
      if (typeof path === "string" && path !== "") disabledDirs.push(resolve(path));
    }
  }
  return { version: STATE_VERSION, dirs, disabledSkills, disabledDirs };
}

/**
 * Read the state file; a missing or malformed file yields the empty state.
 * The host half is the only writer and publishes atomically, so a torn read
 * can only ever observe the previous complete document.
 */
export async function readState(dshHome?: string): Promise<AgentSkillsState> {
  const file = stateFilePath(dshHome);
  try {
    const raw = await readFile(file, "utf8");
    return parseState(raw) ?? structuredClone(EMPTY);
  } catch {
    return structuredClone(EMPTY);
  }
}

/** Atomic publish: write a temp sibling, fsync, then rename over the target. */
export async function writeState(state: AgentSkillsState, dshHome?: string): Promise<void> {
  const file = stateFilePath(dshHome);
  await mkdir(dirname(file), { recursive: true });
  const tmp = join(dirname(file), `.state.${process.pid}.${Date.now().toString(36)}.tmp`);
  const serialized = JSON.stringify(state, null, 2);
  await writeFile(tmp, serialized, "utf8");
  await rename(tmp, file);
}
