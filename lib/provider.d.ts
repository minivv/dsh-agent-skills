/**
 * The per-agent-preset skill provider. Registered by the preset-scoped half
 * of this plugin into the preset layer of the skill registry — the layer
 * that outranks the global layer for agent-visible skills.
 *
 * Responsibilities:
 *   - re-emit every candidate from the layers' other providers (the preset's
 *     own skill-filesystem, global providers, runtime registrations) at
 *     rank - 1, so this provider's copies win the per-name dedupe and can
 *     carry the user's enable/disable policy;
 *   - discover user-configured custom scan directories itself;
 *   - delegate `get()` to the original provider / file so skill bodies are
 *     always loaded by the same code that owns them.
 *
 * @module dsh-agent-skills/provider
 */
import type { Context } from "@deepseek-ai/cordis";
import type { SkillCandidate, SkillProvider, SkillProviderControl } from "@deepseek-ai/dsh-skill";
import { type AgentSkillsState } from "./store.js";
/** The provider name this plugin registers (never "runtime"). */
export declare const PROVIDER_NAME = "agent-skills";
export interface RootPolicy {
    /** Absolute root path. */
    path: string;
    /** True when the root is disabled by the user. */
    disabled: boolean;
}
export interface StateReader {
    read(): Promise<AgentSkillsState>;
}
export declare function stateReaderOf(): StateReader;
/** Longest matching root wins; returns undefined when no root covers the path. */
export declare function rootFor(path: string | undefined, roots: RootPolicy[]): RootPolicy | undefined;
/** Builtin roots resolved from the environment (mirrors dsh-skill-filesystem). */
export declare function builtinRoots(dshHome?: string): Promise<RootPolicy[]>;
/** Origins of an emitted candidate, attached for `get()` delegation. */
interface Origin {
    kind: "provider" | "runtime" | "custom";
    provider?: SkillProvider;
    candidate?: SkillCandidate;
}
export declare function originOf(candidate: SkillCandidate): Origin | undefined;
/**
 * Create the preset-scope provider. Watchers on the user's custom directories
 * invalidate the registry cache on file changes so the catalog follows disk
 * edits without a restart.
 */
export declare function createAgentSkillsProvider(ctx: Context, control: SkillProviderControl, stateReader?: StateReader): SkillProvider;
/** Find this plugin's provider in any scoped layer (the preset instance). */
export declare function findPresetProvider(skills: unknown): {
    provider: SkillProvider;
} | undefined;
export {};
