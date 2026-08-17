export interface ParsedSkill {
    name: string;
    description: string;
    whenToUse?: string;
    modelInvocable: boolean;
    userInvocable: boolean;
    metadata?: Record<string, unknown>;
    content: string;
    /** Absolute path of the skill file (SKILL.md or flat .md). */
    path: string;
    /** Absolute directory containing the skill file. */
    directory: string;
}
export interface ScannedRoot {
    path: string;
    skills: ParsedSkill[];
}
/** Parse one skill file; returns undefined when the file is not a usable skill. */
export declare function parseSkillFile(path: string, logger: {
    warn(message: string): void;
}): Promise<ParsedSkill | undefined>;
/**
 * Scan one root directory for skills (one level deep: <dir>/SKILL.md or
 * flat *.md files). A missing root yields an empty result; a root that is
 * not a directory is treated the same.
 */
export declare function scanRoot(root: string, logger: {
    warn(message: string): void;
}): Promise<ScannedRoot>;
