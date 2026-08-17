/**
 * Host typert service backing the Agent Skills settings page. Every mutating
 * method persists the new state, invalidates the skill registry so the next
 * agent step republishes the model catalog, and returns the fresh page view.
 *
 * @module dsh-agent-skills/runtime
 */
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import type { AgentSkillsView, AddDirInput, PresetTakeoverStatus, RemoveDirInput, ToggleDirInput, ToggleSkillInput } from "./schemas.js";
/** The host service behind the `agentSkills` typert namespace. */
export declare class AgentSkillsRuntime extends TypertRemoteService {
    constructor(ctx: import("@deepseek-ai/cordis").Context);
    /** Full page view: sources + catalog + counts. */
    list(): Promise<AgentSkillsView>;
    /** Read the one-click DSH preset takeover status without exposing local paths. */
    takeoverStatus(): Promise<PresetTakeoverStatus>;
    /** User-triggered, idempotent installation of the preset-scoped provider row. */
    enableTakeover(): Promise<PresetTakeoverStatus>;
    /** Enable or disable one skill by name. */
    toggleSkill(input: ToggleSkillInput): Promise<AgentSkillsView>;
    /** Enable or disable one scan directory (custom or builtin root). */
    toggleDir(input: ToggleDirInput): Promise<AgentSkillsView>;
    /** Add a custom scan directory. */
    addDir(input: AddDirInput): Promise<AgentSkillsView>;
    /** Remove a custom scan directory (auto-discovered ones too). */
    removeDir(input: RemoveDirInput): Promise<AgentSkillsView>;
    /** Re-scan everything and return the fresh view. */
    rescan(): Promise<AgentSkillsView>;
    /** Shared tail: auto-discover, invalidate the catalog, return the view. */
    private refresh;
}
