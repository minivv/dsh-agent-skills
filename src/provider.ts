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
import { scopeOf } from "@deepseek-ai/dsh-scope";
import type { SkillCandidate, SkillDefinition, SkillLookupOptions, SkillProvider, SkillProviderControl } from "@deepseek-ai/dsh-skill";
import { readState, stateFilePath, type AgentSkillsState } from "./store.js";
import { collectAllLayers, dedupeWinners, registryOf, RANK, RUNTIME_PROVIDER_NAME, type CandidateEntry, type LayerShape, type RegistryShape } from "./registry.js";
import { scanRoot } from "./scan.js";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { watch } from "node:fs";
import { resolve } from "node:path";

/** The provider name this plugin registers (never "runtime"). */
export const PROVIDER_NAME = "agent-skills";

export interface RootPolicy {
  /** Absolute root path. */
  path: string;
  /** True when the root is disabled by the user. */
  disabled: boolean;
}

export interface StateReader {
  read(): Promise<AgentSkillsState>;
}

export function stateReaderOf(): StateReader {
  let cached: { mtimeMs: number; state: AgentSkillsState } | undefined;
  return {
    async read() {
      const { stat } = await import("node:fs/promises");
      const file = stateFilePath();
      let mtimeMs = 0;
      try {
        mtimeMs = (await stat(file)).mtimeMs;
      } catch {
        /* missing file counts as the empty state */
      }
      if (cached !== undefined && cached.mtimeMs === mtimeMs) return cached.state;
      const state = await readState();
      cached = { mtimeMs, state };
      return state;
    }
  };
}

/** Longest matching root wins; returns undefined when no root covers the path. */
export function rootFor(path: string | undefined, roots: RootPolicy[]): RootPolicy | undefined {
  if (path === undefined) return undefined;
  let best: RootPolicy | undefined;
  for (const root of roots) {
    if (path === root.path || path.startsWith(root.path.endsWith("/") ? root.path : root.path + "/")) {
      if (best === undefined || root.path.length > best.path.length) best = root;
    }
  }
  return best;
}

/** Builtin roots resolved from the environment (mirrors dsh-skill-filesystem). */
export async function builtinRoots(dshHome = resolveDshHome()): Promise<RootPolicy[]> {
  const { homedir } = await import("node:os");
  const roots: RootPolicy[] = [];
  roots.push({ path: resolve(dshHome, "skills"), disabled: false });
  const agentsHome = process.env.DSH_AGENTS_HOME ?? resolve(homedir(), ".agents");
  roots.push({ path: resolve(agentsHome, "skills"), disabled: false });
  if (process.env.DSH_BUNDLED_SKILL_DIR !== undefined && process.env.DSH_BUNDLED_SKILL_DIR !== "") {
    roots.push({ path: resolve(process.env.DSH_BUNDLED_SKILL_DIR), disabled: false });
  }
  return roots;
}

/** Origins of an emitted candidate, attached for `get()` delegation. */
interface Origin {
  kind: "provider" | "runtime" | "custom";
  provider?: SkillProvider;
  candidate?: SkillCandidate;
}

const origins = new WeakMap<object, Origin>();

export function originOf(candidate: SkillCandidate): Origin | undefined {
  return origins.get(candidate);
}

function emit(candidate: SkillCandidate, origin: Origin, rank: number): SkillCandidate {
  const emitted = {
    ...candidate,
    rank,
    provider: PROVIDER_NAME
  };
  origins.set(emitted, origin);
  return emitted;
}

/** Custom-dir candidates (rank 300) from the current state. */
async function customCandidates(
  state: AgentSkillsState,
  logger: { warn(message: string): void }
): Promise<{ candidates: SkillCandidate[]; roots: RootPolicy[] }> {
  const candidates: SkillCandidate[] = [];
  const roots: RootPolicy[] = [];
  let localOrder = 0;
  for (const dir of state.dirs) {
    const path = resolve(dir.path);
    roots.push({ path, disabled: dir.enabled === false });
    const scanned = await scanRoot(path, logger);
    for (const skill of scanned.skills) {
      candidates.push(
        emit(
          {
            name: skill.name,
            description: skill.description,
            ...(skill.whenToUse !== undefined ? { whenToUse: skill.whenToUse } : {}),
            invocation: { modelInvocable: skill.modelInvocable, userInvocable: skill.userInvocable },
            source: "custom",
            provider: PROVIDER_NAME,
            rank: RANK.custom,
            locator: { path: skill.path, directory: skill.directory },
            ...(skill.metadata !== undefined ? { metadata: skill.metadata } : {}),
            resourceBase: { kind: "directory", path: skill.directory },
            path: skill.path
          },
          { kind: "custom" },
          RANK.custom - 1
        )
      );
      localOrder += 1;
    }
  }
  return { candidates, roots };
}

/** Scan the built-in user roots when no filesystem provider is mounted yet. */
async function builtinCandidates(
  roots: RootPolicy[],
  logger: { warn(message: string): void }
): Promise<SkillCandidate[]> {
  const candidates: SkillCandidate[] = [];
  for (const root of roots) {
    const scanned = await scanRoot(root.path, logger);
    const source = root.path.endsWith("/skills") && root.path.includes("/.agents/")
      ? "user-agents"
      : root.path.endsWith("/skills") && root.path.includes("/.dsh/")
        ? "user-dsh"
        : "bundled";
    const rank = source === "user-agents" ? RANK.userAgents : source === "user-dsh" ? RANK.userDsh : RANK.bundled;
    for (const skill of scanned.skills) {
      candidates.push(emit({
        name: skill.name,
        description: skill.description,
        ...(skill.whenToUse !== undefined ? { whenToUse: skill.whenToUse } : {}),
        invocation: { modelInvocable: skill.modelInvocable, userInvocable: skill.userInvocable },
        source,
        provider: PROVIDER_NAME,
        rank,
        locator: { path: skill.path, directory: skill.directory },
        resourceBase: { kind: "directory", path: skill.directory },
        path: skill.path,
        ...(skill.metadata !== undefined ? { metadata: skill.metadata } : {})
      }, { kind: "custom" }, rank - 1));
    }
  }
  return candidates;
}

/**
 * Create the preset-scope provider. Watchers on the user's custom directories
 * invalidate the registry cache on file changes so the catalog follows disk
 * edits without a restart.
 */
export function createAgentSkillsProvider(
  ctx: Context,
  control: SkillProviderControl,
  stateReader: StateReader = stateReaderOf()
): SkillProvider {
  const logger = ctx.logger;
  const scope = scopeOf(ctx);
  const watchers = new Map<string, ReturnType<typeof watch>>();
  let invalidateQueued = false;

  const queueInvalidate = () => {
    if (invalidateQueued) return;
    invalidateQueued = true;
    queueMicrotask(() => {
      invalidateQueued = false;
      control.invalidate();
    });
  };

  const startWatchers = async () => {
    const state = await stateReader.read();
    for (const dir of state.dirs) {
      const path = resolve(dir.path);
      if (watchers.has(path)) continue;
      try {
        const watcher = watch(path, { recursive: true }, (_event, filename) => {
          if (filename === null || typeof filename !== "string") return;
          if (!filename.endsWith(".md")) return;
          queueInvalidate();
        });
        watchers.set(path, watcher);
      } catch {
        /* recursive watching unsupported or the dir is gone — rescan covers it */
      }
    }
  };
  void startWatchers();

  control.signal.addEventListener(
    "abort",
    () => {
      for (const watcher of watchers.values()) {
        try {
          watcher.close();
        } catch {
          /* already closed */
        }
      }
      watchers.clear();
    },
    { once: true }
  );

  return {
    name: PROVIDER_NAME,
    async list(options: SkillLookupOptions) {
      const state = await stateReader.read();
      const registry: RegistryShape = registryOf(ctx.skills);
      const myLayer: LayerShape | undefined =
        scope === undefined ? registry.layers.global : registry.layers.scoped.get(scope);
      void myLayer; // self is skipped by name below, layer lookup only needed for structure
      const inner = await collectAllLayers(registry, options, logger, PROVIDER_NAME);
      const custom = await customCandidates(state, logger);
      const builtins = await builtinRoots();
      const builtin = await builtinCandidates(builtins, logger);
      const roots: RootPolicy[] = [...custom.roots, ...builtins];

      const disabledDirs = new Set(state.disabledDirs);
      const disabledSkills = new Set(state.disabledSkills);

      const policy: RootPolicy[] = roots.map((root) => ({
        path: root.path,
        disabled: root.disabled || disabledDirs.has(root.path)
      }));

      const winners = dedupeWinners(inner.entries);
      const emitted: SkillCandidate[] = winners.map((entry: CandidateEntry) => {
        const dir = rootFor(entry.candidate.resourceBase?.kind === "directory" ? entry.candidate.resourceBase.path : entry.candidate.path, policy);
        const disabled = disabledSkills.has(entry.candidate.name) || (dir !== undefined && dir.disabled);
        const invocation =
          entry.candidate.invocation ?? { modelInvocable: true, userInvocable: true };
        const origin: Origin =
          entry.provider === undefined
            ? { kind: "runtime" }
            : { kind: "provider", provider: entry.provider, candidate: entry.candidate };
        return emit(
          {
            ...entry.candidate,
            invocation: disabled ? { modelInvocable: false, userInvocable: false } : invocation,
            provider: PROVIDER_NAME
          },
          origin,
          entry.candidate.rank - 1
        );
      });

      // Custom candidates flow through the same policy (a disabled custom dir
      // hides its skills; an explicitly disabled skill wins over the dir flag).
      for (const candidate of custom.candidates) {
        const dir = rootFor(candidate.resourceBase?.kind === "directory" ? candidate.resourceBase.path : candidate.path, policy);
        const disabled = disabledSkills.has(candidate.name) || (dir !== undefined && dir.disabled);
        if (disabled) {
          emitted.push({ ...candidate, invocation: { modelInvocable: false, userInvocable: false } });
        } else {
          emitted.push(candidate);
        }
      }

      // The host settings service can be ready before the preset's filesystem
      // provider. Keep the page and the next model step useful during that
      // window by scanning the same built-in roots directly. When the official
      // provider is present its candidates have the same rank and the wrapper
      // above wins the duplicate deterministically.
      for (const candidate of builtin) {
        const dir = rootFor(candidate.resourceBase?.kind === "directory" ? candidate.resourceBase.path : candidate.path, policy);
        const disabled = disabledSkills.has(candidate.name) || (dir !== undefined && dir.disabled);
        if (disabled) emitted.push({ ...candidate, invocation: { modelInvocable: false, userInvocable: false } });
        else emitted.push(candidate);
      }

      const unique = dedupeWinners(emitted.map((candidate, localOrder) => ({
        candidate,
        provider: undefined,
        providerOrder: 0,
        localOrder
      }))).map((entry) => entry.candidate);

      return {
        candidates: unique,
        complete: inner.complete
      };
    },
    async get(candidate: SkillCandidate, options: SkillLookupOptions): Promise<SkillDefinition | undefined> {
      const origin = origins.get(candidate);
      if (origin === undefined) return undefined;
      if (origin.kind === "provider" && origin.provider !== undefined && origin.candidate !== undefined) {
        const definition = await origin.provider.get(origin.candidate, options);
        if (definition === undefined) return undefined;
        return definition;
      }
      if (origin.kind === "runtime") {
        const locator = (candidate as unknown as { locator?: SkillDefinition }).locator;
        return locator;
      }
      if (origin.kind === "custom") {
        const locator = candidate as unknown as { locator?: { path?: string } };
        if (locator.locator?.path === undefined) return undefined;
        const { parseSkillFile } = await import("./scan.js");
        const parsed = await parseSkillFile(locator.locator.path, logger);
        if (parsed === undefined) return undefined;
        return {
          name: parsed.name,
          description: parsed.description,
          ...(parsed.whenToUse !== undefined ? { whenToUse: parsed.whenToUse } : {}),
          invocation: { modelInvocable: parsed.modelInvocable, userInvocable: parsed.userInvocable },
          source: candidate.source,
          provider: PROVIDER_NAME,
          resourceBase: { kind: "directory", path: parsed.directory },
          path: parsed.path,
          ...(parsed.metadata !== undefined ? { metadata: parsed.metadata } : {}),
          content: parsed.content
        };
      }
      return undefined;
    }
  };
}

/** Find this plugin's provider in any scoped layer (the preset instance). */
export function findPresetProvider(skills: unknown): { provider: SkillProvider } | undefined {
  const registry = registryOf(skills);
  for (const layer of registry.layers.scoped.values()) {
    const found = layer.providers.get(PROVIDER_NAME);
    if (found !== undefined) return found;
  }
  return undefined;
}
