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
export declare const name = "agent-skills-preset";
export declare const inject: string[];
export declare function apply(ctx: Context, config?: unknown): void;
