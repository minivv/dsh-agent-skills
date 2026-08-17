/**
 * Auto-discovery of other AI coding agents' skill directories. On first run
 * (and on every scan) any of the well-known homes that actually exists is
 * offered as a scan source, so skills from Claude Code, Codex, Gemini CLI,
 * Cursor, Qoder, Continue, Roo, Cline and Kilo flow into the catalog without
 * any manual setup.
 *
 * @module dsh-agent-skills/discovery
 */
import { homedir } from "node:os";
import { access } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Builtin skill roots exposed by the settings page (relative to home). */
export const AGENT_SKILL_DIRS: ReadonlyArray<readonly [id: string, rel: string]> = [
  ["agents", join(".agents", "skills")],
  ["claude", join(".claude", "skills")],
  ["codex", join(".codex", "skills")],
  ["opencode", join(".config", "opencode", "skills")],
  ["gemini", join(".gemini", "skills")]
];

/** Absolute builtin roots, honoring the configurable .agents home. */
export function builtinAgentSkillDirs(home = homedir(), agentsHome = process.env.DSH_AGENTS_HOME): string[] {
  return AGENT_SKILL_DIRS.map(([, rel]) =>
    rel === join(".agents", "skills")
      ? join(agentsHome ?? join(home, ".agents"), "skills")
      : join(home, rel)
  ).map((path) => resolve(path));
}

/** Whether a directory exists and is a directory. */
export async function directoryExists(path: string): Promise<boolean> {
  try {
    const info = await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Discover builtin agent skill directories that exist on this machine.
 * @returns absolute paths, existing only.
 */
export async function discoverAgentSkillDirs(home = homedir()): Promise<string[]> {
  const found: string[] = [];
  for (const path of builtinAgentSkillDirs(home)) {
    if (await directoryExists(path)) found.push(path);
  }
  return found;
}
