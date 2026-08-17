/** Well-known skill roots of other AI coding agents (relative to home). */
export declare const AGENT_SKILL_DIRS: ReadonlyArray<readonly [id: string, rel: string]>;
/** Whether a directory exists and is a directory. */
export declare function directoryExists(path: string): Promise<boolean>;
/**
 * Discover agent skill directories that exist on this machine, home-expanded.
 * @returns absolute paths, existing only.
 */
export declare function discoverAgentSkillDirs(home?: string): Promise<string[]>;
