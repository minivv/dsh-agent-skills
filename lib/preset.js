import { createAgentSkillsProvider } from "./provider.js";
export const name = "agent-skills-preset";
export const inject = ["skills"];
/** Read `customSkillDirs` defensively — the row config is user-editable YAML. */
function customSkillDirsOf(config) {
    if (config === null || typeof config !== "object")
        return [];
    const value = config.customSkillDirs;
    if (!Array.isArray(value))
        return [];
    return value.filter((entry) => typeof entry === "string" && entry !== "");
}
export function apply(ctx, config) {
    const customSkillDirs = customSkillDirsOf(config);
    ctx.skills.registerProvider((control) => createAgentSkillsProvider(ctx, control, undefined, customSkillDirs));
}
//# sourceMappingURL=preset.js.map