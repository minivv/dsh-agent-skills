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
    get(name: string): { provider: SkillProvider; order: number } | undefined;
    values(): IterableIterator<{ provider: SkillProvider; order: number }>;
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
export function registryOf(skills: unknown): RegistryShape {
  return skills as RegistryShape;
}

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
export const RANK = {
  projectDsh: 100,
  projectAgents: 200,
  runtime: 250,
  custom: 300,
  userDsh: 400,
  userAgents: 500,
  bundled: 600
} as const;

/** The runtime provider name (reserved by the skill registry). */
export const RUNTIME_PROVIDER_NAME = "runtime";

/** Normalize one provider observation into candidates + completeness. */
export function normalizeObservation(
  output: unknown,
  providerName: string
): { candidates: readonly SkillCandidate[]; complete: boolean } {
  if (Array.isArray(output)) return { candidates: output, complete: true };
  if (output === null || typeof output !== "object") return { candidates: [], complete: false };
  const observation = output as { candidates?: unknown; complete?: unknown };
  if (!Array.isArray(observation.candidates) || typeof observation.complete !== "boolean") {
    return { candidates: [], complete: false };
  }
  return { candidates: observation.candidates, complete: observation.complete };
}

/**
 * Collect candidates from one layer: runtime entries first (rank 250), then
 * each provider in registration order. A provider that throws is skipped and
 * marks the observation incomplete (mirrors the registry's own resilience).
 */
export async function collectLayer(
  layer: LayerShape,
  options: SkillLookupOptions,
  logger: { warn(message: string): void },
  excludeProvider?: string
): Promise<{ entries: CandidateEntry[]; complete: boolean }> {
  const entries: CandidateEntry[] = [];
  let complete = true;
  let localOrder = 0;
  for (const [name, definition] of [...layer.runtime.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    entries.push({
      candidate: {
        name,
        description: definition.description,
        ...(definition.whenToUse !== undefined ? { whenToUse: definition.whenToUse } : {}),
        invocation: definition.invocation ?? { modelInvocable: true, userInvocable: true },
        source: definition.source,
        provider: RUNTIME_PROVIDER_NAME,
        rank: RANK.runtime,
        locator: definition,
        ...(definition.resourceBase !== undefined ? { resourceBase: definition.resourceBase } : {}),
        ...(definition.path !== undefined ? { path: definition.path } : {}),
        ...(definition.metadata !== undefined ? { metadata: definition.metadata } : {})
      },
      provider: undefined,
      providerOrder: -1,
      localOrder: localOrder++
    });
  }
  for (const { provider, order } of layer.providers.values()) {
    if (excludeProvider !== undefined && provider.name === excludeProvider) continue;
    let output: unknown;
    try {
      output = await provider.list(options);
    } catch (error) {
      complete = false;
      logger.warn(`agent-skills: provider "${provider.name}" skipped: ${String(error)}`);
      continue;
    }
    const observation = normalizeObservation(output, provider.name);
    if (!observation.complete) complete = false;
    for (const candidate of observation.candidates) {
      entries.push({ candidate, provider, providerOrder: order, localOrder: localOrder++ });
    }
  }
  return { entries, complete };
}

/** Collect candidates from the global layer and every scoped layer. */
export async function collectAllLayers(
  registry: RegistryShape,
  options: SkillLookupOptions,
  logger: { warn(message: string): void },
  excludeProvider?: string
): Promise<{ entries: CandidateEntry[]; complete: boolean }> {
  const entries: CandidateEntry[] = [];
  let complete = true;
  const global = await collectLayer(registry.layers.global, options, logger, excludeProvider);
  entries.push(...global.entries);
  if (!global.complete) complete = false;
  for (const layer of registry.layers.scoped.values()) {
    const collected = await collectLayer(layer, options, logger, excludeProvider);
    entries.push(...collected.entries);
    if (!collected.complete) complete = false;
  }
  return { entries, complete };
}

/** First-wins dedupe after rank/providerOrder/localOrder sort (registry semantics). */
export function dedupeWinners(entries: CandidateEntry[]): CandidateEntry[] {
  const sorted = [...entries].sort((a, b) => {
    const rank = a.candidate.rank - b.candidate.rank;
    if (rank !== 0) return rank;
    const order = a.providerOrder - b.providerOrder;
    if (order !== 0) return order;
    return a.localOrder - b.localOrder;
  });
  const seen = new Set<string>();
  const winners: CandidateEntry[] = [];
  for (const entry of sorted) {
    if (seen.has(entry.candidate.name)) continue;
    seen.add(entry.candidate.name);
    winners.push(entry);
  }
  return winners;
}

/** Force the registry to re-collect on the next `list()`/snapshot. */
export function invalidateSkillCache(skills: unknown): void {
  const registry = registryOf(skills);
  if (typeof registry.invalidateCache === "function") registry.invalidateCache();
}
