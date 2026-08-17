/**
 * Host typert service backing the Agent Skills settings page. Every mutating
 * method persists the new state, invalidates the skill registry so the next
 * agent step republishes the model catalog, and returns the fresh page view.
 *
 * @module dsh-agent-skills/runtime
 */
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { readState, writeState } from "./store.js";
import { buildView, ensureDiscovered, canonicalizeDir } from "./views.js";
import { invalidateSkillCache } from "./registry.js";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { randomUUID } from "node:crypto";
import { disablePresetTakeover, enablePresetTakeover, inspectPresetTakeover } from "./preset-manager.js";
import { scheduleDshRestart } from "./restart.js";
import type {
  AgentSkillsView,
  AddDirInput,
  PresetTakeoverStatus,
  RestartResult,
  RemoveDirInput,
  ToggleDirInput,
  ToggleSkillInput
} from "./schemas.js";

const BOOT_ID = randomUUID();
let restartScheduled = false;

/** Strip undefined recursively so the strict wire codec always passes. */
function jsonSafe<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => jsonSafe(entry)) as unknown as T;
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry !== undefined) out[key] = jsonSafe(entry);
    }
    return out as unknown as T;
  }
  return value;
}

/** The host service behind the `agentSkills` typert namespace. */
export class AgentSkillsRuntime extends TypertRemoteService {
  constructor(ctx: import("@deepseek-ai/cordis").Context) {
    super(ctx, "agentSkills");
  }

  /** Full page view: sources + catalog + counts. */
  @Remote
  async list(): Promise<AgentSkillsView> {
    return this.refresh();
  }

  /** Read the one-click DSH preset takeover status without exposing local paths. */
  @Remote
  async takeoverStatus(): Promise<PresetTakeoverStatus> {
    return { ...inspectPresetTakeover(), boot: BOOT_ID };
  }

  /** User-triggered, idempotent installation of the preset-scoped provider row. */
  @Remote
  async enableTakeover(): Promise<PresetTakeoverStatus> {
    return { ...enablePresetTakeover(), boot: BOOT_ID };
  }

  /** Restore the official filesystem provider in the shipped presets. */
  @Remote
  async disableTakeover(): Promise<PresetTakeoverStatus> {
    return { ...disablePresetTakeover(), boot: BOOT_ID };
  }

  /** Restart the current DSH web host so a preset provider change is mounted. */
  @Remote
  async restartDsh(): Promise<RestartResult> {
    if (restartScheduled) throw new Error("DSH 重启已在进行中");
    restartScheduled = true;
    try {
      return scheduleDshRestart();
    } catch (error) {
      restartScheduled = false;
      throw error;
    }
  }

  /** Enable or disable one skill by name. */
  @Remote
  async toggleSkill(input: ToggleSkillInput): Promise<AgentSkillsView> {
    const state = await readState();
    const set = new Set(state.disabledSkills);
    if (input.enabled) set.delete(input.name);
    else set.add(input.name);
    state.disabledSkills = [...set].sort();
    await writeState(state);
    return this.refresh();
  }

  /** Enable or disable one scan directory (custom or builtin root). */
  @Remote
  async toggleDir(input: ToggleDirInput): Promise<AgentSkillsView> {
    const state = await readState();
    const path = canonicalizeDir(input.path);
    const custom = state.dirs.find((dir) => canonicalizeDir(dir.path) === path);
    if (custom !== undefined) {
      custom.enabled = input.enabled;
    } else {
      const set = new Set(state.disabledDirs.map((entry) => canonicalizeDir(entry)));
      if (input.enabled) set.delete(path);
      else set.add(path);
      state.disabledDirs = [...set].sort();
    }
    await writeState(state);
    return this.refresh();
  }

  /** Add a custom scan directory. */
  @Remote
  async addDir(input: AddDirInput): Promise<AgentSkillsView> {
    const state = await readState();
    const path = canonicalizeDir(input.path);
    const existing = state.dirs.find((dir) => canonicalizeDir(dir.path) === path);
    if (existing === undefined) state.dirs.push({ path, enabled: true });
    await writeState(state);
    return this.refresh();
  }

  /** Remove a custom scan directory (auto-discovered ones too). */
  @Remote
  async removeDir(input: RemoveDirInput): Promise<AgentSkillsView> {
    const state = await readState();
    const path = canonicalizeDir(input.path);
    state.dirs = state.dirs.filter((dir) => canonicalizeDir(dir.path) !== path);
    await writeState(state);
    return this.refresh();
  }

  /** Re-scan everything and return the fresh view. */
  @Remote
  async rescan(): Promise<AgentSkillsView> {
    return this.refresh();
  }

  /** Shared tail: auto-discover, invalidate the catalog, return the view. */
  private async refresh(): Promise<AgentSkillsView> {
    const dshHome = resolveDshHome();
    const state = await readState(dshHome);
    if (await ensureDiscovered(state)) await writeState(state, dshHome);
    invalidateSkillCache(this.ctx.get("skills"));
    const view = await buildView(this.ctx, state);
    return jsonSafe(view);
  }
}
