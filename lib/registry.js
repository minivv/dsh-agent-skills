/** Cast a `ctx.skills` service to the structural shape. */
export function registryOf(skills) {
    return skills;
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
};
/** The runtime provider name (reserved by the skill registry). */
export const RUNTIME_PROVIDER_NAME = "runtime";
/** Normalize one provider observation into candidates + completeness. */
export function normalizeObservation(output, providerName) {
    if (Array.isArray(output))
        return { candidates: output, complete: true };
    if (output === null || typeof output !== "object")
        return { candidates: [], complete: false };
    const observation = output;
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
export async function collectLayer(layer, options, logger, excludeProvider) {
    const entries = [];
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
        if (excludeProvider !== undefined && provider.name === excludeProvider)
            continue;
        let output;
        try {
            output = await provider.list(options);
        }
        catch (error) {
            complete = false;
            logger.warn(`agent-skills: provider "${provider.name}" skipped: ${String(error)}`);
            continue;
        }
        const observation = normalizeObservation(output, provider.name);
        if (!observation.complete)
            complete = false;
        for (const candidate of observation.candidates) {
            entries.push({ candidate, provider, providerOrder: order, localOrder: localOrder++ });
        }
    }
    return { entries, complete };
}
/** Collect candidates from the global layer and every scoped layer. */
export async function collectAllLayers(registry, options, logger, excludeProvider) {
    const entries = [];
    let complete = true;
    const global = await collectLayer(registry.layers.global, options, logger, excludeProvider);
    entries.push(...global.entries);
    if (!global.complete)
        complete = false;
    for (const layer of registry.layers.scoped.values()) {
        const collected = await collectLayer(layer, options, logger, excludeProvider);
        entries.push(...collected.entries);
        if (!collected.complete)
            complete = false;
    }
    return { entries, complete };
}
/** First-wins dedupe after rank/providerOrder/localOrder sort (registry semantics). */
export function dedupeWinners(entries) {
    const sorted = [...entries].sort((a, b) => {
        const rank = a.candidate.rank - b.candidate.rank;
        if (rank !== 0)
            return rank;
        const order = a.providerOrder - b.providerOrder;
        if (order !== 0)
            return order;
        return a.localOrder - b.localOrder;
    });
    const seen = new Set();
    const winners = [];
    for (const entry of sorted) {
        if (seen.has(entry.candidate.name))
            continue;
        seen.add(entry.candidate.name);
        winners.push(entry);
    }
    return winners;
}
/** Force the registry to re-collect on the next `list()`/snapshot. */
export function invalidateSkillCache(skills) {
    const registry = registryOf(skills);
    if (typeof registry.invalidateCache === "function")
        registry.invalidateCache();
}
//# sourceMappingURL=registry.js.map