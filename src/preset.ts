/**
 * Preset-only entry point. It contributes the provider to the preset's
 * scoped skill layer and deliberately does not construct host services such
 * as `agentSkills`.
 *
 * The row this entry replaces (`skill-filesystem`) accepts extra scan
 * directories through `config.customSkillDirs`; the shipped `cordis` preset
 * points that at `@deepseek-ai/dsh-agent-preset/skills`. Takeover only swaps
 * the provider name, so this entry forwards the same config into the
 * replacement provider and those directories keep being scanned.
 *
 * @module dsh-agent-skills/preset
 */
import type { Context } from "@deepseek-ai/cordis";
import { createAgentSkillsProvider } from "./provider.js";

export const name = "agent-skills-preset";
export const inject = ["skills"];

/** Read `customSkillDirs` defensively — the row config is user-editable YAML. */
function customSkillDirsOf(config: unknown): string[] {
  if (config === null || typeof config !== "object") return [];
  const value = (config as { customSkillDirs?: unknown }).customSkillDirs;
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry !== "");
}

export function apply(ctx: Context, config?: unknown): void {
  const customSkillDirs = customSkillDirsOf(config);
  ctx.skills.registerProvider((control) => createAgentSkillsProvider(ctx, control, undefined, customSkillDirs));
}
