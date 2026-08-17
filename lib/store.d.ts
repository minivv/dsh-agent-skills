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
/** Absolute path of the state file for a resolved dsh home. */
export declare function stateFilePath(dshHome?: string): string;
/**
 * Read the state file; a missing or malformed file yields the empty state.
 * The host half is the only writer and publishes atomically, so a torn read
 * can only ever observe the previous complete document.
 */
export declare function readState(dshHome?: string): Promise<AgentSkillsState>;
/** Atomic publish: write a temp sibling, fsync, then rename over the target. */
export declare function writeState(state: AgentSkillsState, dshHome?: string): Promise<void>;
