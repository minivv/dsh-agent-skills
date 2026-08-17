import { createAgentSkillsProvider } from "./provider.js";
export const name = "agent-skills-preset";
export const inject = ["skills"];
export function apply(ctx) {
    ctx.skills.registerProvider((control) => createAgentSkillsProvider(ctx, control));
}
//# sourceMappingURL=preset.js.map