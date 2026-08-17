/**
 * Host-side page views: directories (sources) and the full skill catalog,
 * built from the live registry plus the durable store. Used by the typert
 * service that backs the Agent Skills settings page.
 *
 * @module dsh-agent-skills/views
 */
import type { Context } from "@deepseek-ai/cordis";
import type { AgentSkillsState } from "./store.js";
import type { AgentSkillsView } from "./schemas.js";
import { type RootPolicy } from "./provider.js";
/** Resolve every scan root (custom + auto + builtin) with its current policy. */
export declare function resolveRoots(ctx: Context, state: AgentSkillsState, dshHome?: string): Promise<{
    roots: RootPolicy[];
    builtin: RootPolicy[];
}>;
/** Map one candidate to the skill category shown in the UI. */
export declare function skillKindOf(source: string): "custom" | "global" | "builtin";
/**
 * Build the full page view. Mutations are not performed here; the typert
 * service calls this after each write so the returned payload is always the
 * fresh post-write state.
 */
export declare function buildView(ctx: Context, state: AgentSkillsState): Promise<AgentSkillsView>;
/** Auto-discover other agents' skill dirs into the state (once per process). */
export declare function ensureDiscovered(state: AgentSkillsState): Promise<boolean>;
export declare function canonicalizeDir(path: string): string;
