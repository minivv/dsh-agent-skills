/**
 * Preset-only entry point. It contributes the provider to the preset's
 * scoped skill layer and deliberately does not construct host services such
 * as `agentSkills`.
 */
import type { Context } from "@deepseek-ai/cordis";
import { createAgentSkillsProvider } from "./provider.js";

export const name = "agent-skills-preset";
export const inject = ["skills"];

export function apply(ctx: Context): void {
  ctx.skills.registerProvider((control) => createAgentSkillsProvider(ctx, control));
}
