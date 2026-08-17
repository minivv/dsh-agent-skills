/**
 * Internal access to the skill registry's layered provider tables.
 *
 * The official types keep `SkillRegistry.layers` private; this module is the
 * single place that reaches through (cast to a structural shape), reads
 * provider candidates, and triggers catalog invalidation. Everything here is
 * read-only except `invalidateSkillCache`, which is exactly what the
 * "重新扫描" button and every toggle need to republish the model catalog.
 *
 * @module dsh-agent-skills/registry
 */
import type { SkillCandidate, SkillDefinition, SkillLookupOptions, SkillProvider } from "@deepseek-ai/dsh-skill";
/** Structural view of one registry layer (the compiled class shape). */
export interface LayerShape {
    providers: {
        get(name: string): {
            provider: SkillProvider;
            order: number;
        } | undefined;
        values(): IterableIterator<{
            provider: SkillProvider;
            order: number;
        }>;
    };
    runtime: Map<string, SkillDefinition>;
}
/** Structural view of the SkillRegistry service. */
export interface RegistryShape {
    layers: {
        global: LayerShape;
        scoped: Map<unknown, LayerShape>;
    };
    invalidateCache(): void;
}
/** Cast a `ctx.skills` service to the structural shape. */
export declare function registryOf(skills: unknown): RegistryShape;
/** One collected candidate plus its origin, mirroring the registry's internal entry. */
export interface CandidateEntry {
    candidate: SkillCandidate;
    /** Original provider for `get()` delegation; undefined for runtime entries. */
    provider: SkillProvider | undefined;
    /** Original provider registration order (tie-break for equal ranks). */
    providerOrder: number;
    /** Per-provider emission order (tie-break). */
    localOrder: number;
}
/** Skill rank constants mirroring @deepseek-ai/dsh-skill-filesystem. */
export declare const RANK: {
    readonly projectDsh: 100;
    readonly projectAgents: 200;
    readonly runtime: 250;
    readonly custom: 300;
    readonly userDsh: 400;
    readonly userAgents: 500;
    readonly bundled: 600;
};
/** The runtime provider name (reserved by the skill registry). */
export declare const RUNTIME_PROVIDER_NAME = "runtime";
/** Normalize one provider observation into candidates + completeness. */
export declare function normalizeObservation(output: unknown, providerName: string): {
    candidates: readonly SkillCandidate[];
    complete: boolean;
};
/**
 * Collect candidates from one layer: runtime entries first (rank 250), then
 * each provider in registration order. A provider that throws is skipped and
 * marks the observation incomplete (mirrors the registry's own resilience).
 */
export declare function collectLayer(layer: LayerShape, options: SkillLookupOptions, logger: {
    warn(message: string): void;
}, excludeProvider?: string): Promise<{
    entries: CandidateEntry[];
    complete: boolean;
}>;
/** Collect candidates from the global layer and every scoped layer. */
export declare function collectAllLayers(registry: RegistryShape, options: SkillLookupOptions, logger: {
    warn(message: string): void;
}, excludeProvider?: string): Promise<{
    entries: CandidateEntry[];
    complete: boolean;
}>;
/** First-wins dedupe after rank/providerOrder/localOrder sort (registry semantics). */
export declare function dedupeWinners(entries: CandidateEntry[]): CandidateEntry[];
/** Force the registry to re-collect on the next `list()`/snapshot. */
export declare function invalidateSkillCache(skills: unknown): void;
