/** Builtin skill roots exposed by the settings page (relative to home). */
export declare const AGENT_SKILL_DIRS: ReadonlyArray<readonly [id: string, rel: string]>;
/** Absolute builtin roots, honoring the configurable .agents home. */
export declare function builtinAgentSkillDirs(home?: string, agentsHome?: string | undefined): string[];
/** Whether a directory exists and is a directory. */
export declare function directoryExists(path: string): Promise<boolean>;
/**
 * Discover builtin agent skill directories that exist on this machine.
 * @returns absolute paths, existing only.
 */
export declare function discoverAgentSkillDirs(home?: string): Promise<string[]>;
