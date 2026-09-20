/**
 * Client remote face: installs the `agentSkills` namespace on the client
 * through `ctx.remote.$mount(...)`. The descriptor table comes from
 * src/descriptors.ts, the same one the host manifest publishes, so both
 * directions validate with identical strict codecs.
 *
 * @module dsh-agent-skills/client/typert-remote
 */
import { PKG, buildDescriptors } from "../descriptors.js";

/** Remote contribution consumed by `ctx.remote.$mount(...)`. */
export const TYPERT_REMOTE = {
  package: PKG,
  descriptors: buildDescriptors()
} as const;

/** Result envelope of every remote method. */
export type RemoteResult<T> = { ok: true; value: T } | { ok: false; error: { message: string } };

/** The client-side `agentSkills` remote API. */
export interface AgentSkillsApi {
  list(): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
  takeoverStatus(): Promise<RemoteResult<import("../schemas.js").PresetTakeoverStatus>>;
  enableTakeover(): Promise<RemoteResult<import("../schemas.js").PresetTakeoverStatus>>;
  disableTakeover(): Promise<RemoteResult<import("../schemas.js").PresetTakeoverStatus>>;
  restartDsh(): Promise<RemoteResult<import("../schemas.js").RestartResult>>;
  toggleSkill(input: import("../schemas.js").ToggleSkillInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
  toggleDir(input: import("../schemas.js").ToggleDirInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
  addDir(input: import("../schemas.js").AddDirInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
  removeDir(input: import("../schemas.js").RemoveDirInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
  rescan(): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
}
