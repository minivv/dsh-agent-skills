/**
 * Preset-only entry point. It contributes the provider to the preset's
 * scoped skill layer and deliberately does not construct host services such
 * as `agentSkills`.
 */
import type { Context } from "@deepseek-ai/cordis";
export declare const name = "agent-skills-preset";
export declare const inject: string[];
export declare function apply(ctx: Context): void;
