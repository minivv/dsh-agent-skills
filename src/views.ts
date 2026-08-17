/**
 * Host-side page views: directories (sources) and the full skill catalog,
 * built from the live registry plus the durable store. Used by the typert
 * service that backs the Agent Skills settings page.
 *
 * @module dsh-agent-skills/views
 */
import type { Context } from "@deepseek-ai/cordis";
import type { AgentSkillsState } from "./store.js";
import type { AgentSkillsView, DirView, SkillView } from "./schemas.js";
import { builtinRoots, findPresetProvider, PROVIDER_NAME, rootFor, type RootPolicy } from "./provider.js";
import { collectAllLayers, dedupeWinners, registryOf, RANK, type CandidateEntry } from "./registry.js";
import type { SkillCandidate } from "@deepseek-ai/dsh-skill";
import { scanRoot } from "./scan.js";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { resolve } from "node:path";
import { access } from "node:fs/promises";

/** Resolve every scan root (custom + auto + builtin) with its current policy. */
export async function resolveRoots(
  ctx: Context,
  state: AgentSkillsState,
  dshHome = resolveDshHome()
): Promise<{ roots: RootPolicy[]; builtin: RootPolicy[] }> {
  const custom: RootPolicy[] = state.dirs.map((dir) => ({
    path: resolve(dir.path),
    disabled: dir.enabled === false
  }));
  const builtin = await builtinRoots(dshHome);
  return { roots: [...custom, ...builtin], builtin };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function kindOf(root: RootPolicy, builtinPaths: Set<string>): "custom" | "builtin" {
  return builtinPaths.has(root.path) ? "builtin" : "custom";
}

/** Map one candidate to the skill category shown in the UI. */
export function skillKindOf(source: string): "custom" | "global" | "builtin" {
  if (source === "custom") return "custom";
  if (source === "bundled") return "builtin";
  return "global";
}

/**
 * The catalog the agent sees: prefer the preset-scope provider's emission
 * (it already merges every layer and applies toggles); fall back to a plain
 * global merge when the preset row is not mounted.
 */
async function catalogCandidates(ctx: Context): Promise<CandidateEntry[]> {
  const preset = findPresetProvider(ctx.skills);
  if (preset !== undefined) {
    try {
      const observation = await preset.provider.list({});
      const candidates = Array.isArray(observation)
        ? observation
        : (observation as { candidates: readonly SkillCandidate[] }).candidates;
      return [...candidates].map((candidate) => ({
        candidate,
        provider: undefined,
        providerOrder: 0,
        localOrder: 0
      }));
    } catch {
      /* fall through to the raw merge */
    }
  }
  // Fallback (no preset row mounted, e.g. before the next restart): merge
  // every layer INCLUDING this plugin's own provider, so custom directories
  // and toggles still surface in the page view.
  const registry = registryOf(ctx.skills);
  const collected = await collectAllLayers(registry, {}, ctx.logger);
  return dedupeWinners(collected.entries);
}

/**
 * Build the full page view. Mutations are not performed here; the typert
 * service calls this after each write so the returned payload is always the
 * fresh post-write state.
 */
export async function buildView(ctx: Context, state: AgentSkillsState): Promise<AgentSkillsView> {
  const dshHome = resolveDshHome();
  const { roots, builtin } = await resolveRoots(ctx, state, dshHome);
  const builtinPaths = new Set(builtin.map((root) => root.path));
  const disabledDirs = new Set(state.disabledDirs);
  const disabledSkills = new Set(state.disabledSkills);

  // Per-directory raw discovery: builtin roots come from the filesystem
  // provider's own candidates; custom roots are scanned directly (this
  // plugin's own provider is excluded so its re-emissions are not double
  // counted).
  const registry = registryOf(ctx.skills);
  const collected = await collectAllLayers(registry, {}, ctx.logger, PROVIDER_NAME);
  const rawByDir = new Map<string, number>();
  for (const entry of collected.entries) {
    const dir = rootFor(
      entry.candidate.resourceBase?.kind === "directory" ? entry.candidate.resourceBase.path : entry.candidate.path,
      roots
    );
    if (dir === undefined) continue;
    rawByDir.set(dir.path, (rawByDir.get(dir.path) ?? 0) + 1);
  }
  for (const dir of state.dirs) {
    const { scanRoot } = await import("./scan.js");
    const scanned = await scanRoot(dir.path, ctx.logger);
    rawByDir.set(scanned.path, scanned.skills.length);
  }
  // The host can render before a preset-scoped filesystem provider exists.
  // Fill only missing roots so a live provider remains the source of truth.
  for (const root of builtin) {
    if (rawByDir.has(root.path)) continue;
    const scanned = await scanRoot(root.path, ctx.logger);
    rawByDir.set(scanned.path, scanned.skills.length);
  }

  // Undeduplicated per-directory skill lists (the "查看技能" expansion).
  const skillsByDir = new Map<string, Array<{ name: string; description: string }>>();
  for (const entry of collected.entries) {
    const dir = rootFor(
      entry.candidate.resourceBase?.kind === "directory" ? entry.candidate.resourceBase.path : entry.candidate.path,
      roots
    );
    if (dir === undefined) continue;
    const list = skillsByDir.get(dir.path) ?? [];
    list.push({ name: entry.candidate.name, description: entry.candidate.description });
    skillsByDir.set(dir.path, list);
  }
  for (const dir of state.dirs) {
    const { scanRoot } = await import("./scan.js");
    const scanned = await scanRoot(dir.path, ctx.logger);
    const list = skillsByDir.get(scanned.path) ?? [];
    for (const skill of scanned.skills) {
      list.push({ name: skill.name, description: skill.description });
    }
    skillsByDir.set(scanned.path, list);
  }
  for (const root of builtin) {
    if (skillsByDir.has(root.path)) continue;
    const scanned = await scanRoot(root.path, ctx.logger);
    skillsByDir.set(scanned.path, scanned.skills.map((skill) => ({
      name: skill.name,
      description: skill.description
    })));
  }
  for (const list of skillsByDir.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const autoDirs = new Set(state.dirs.filter((dir) => dir.auto === true).map((dir) => resolve(dir.path)));
  const dirs: DirView[] = [];
  let validDirs = 0;
  let missingDirs = 0;
  for (const root of roots) {
    const existing = await exists(root.path);
    let skillCount = rawByDir.get(root.path) ?? 0;
    if (!existing) skillCount = 0;
    if (existing) validDirs += 1;
    else missingDirs += 1;
    const kind = kindOf(root, builtinPaths);
    const enabled = root.disabled !== true && !disabledDirs.has(root.path);
    dirs.push({
      path: root.path,
      kind,
      exists: existing,
      enabled,
      skillCount,
      tag: kind === "builtin" ? "builtin" : "user",
      ...(kind === "custom" && autoDirs.has(root.path) ? { auto: true } : {}),
      skills: (skillsByDir.get(root.path) ?? []).map((skill) => ({ ...skill }))
    });
  }
  dirs.sort((a, b) => (a.kind === b.kind ? a.path.localeCompare(b.path) : a.kind === "custom" ? -1 : 1));

  // The agent-visible catalog with effective toggles.
  const catalog = await catalogCandidates(ctx);
  const skills: SkillView[] = [];
  const counts = { total: 0, custom: 0, global: 0, builtin: 0 };
  for (const entry of catalog) {
    const candidate = entry.candidate;
    const dir = rootFor(
      candidate.resourceBase?.kind === "directory" ? candidate.resourceBase.path : candidate.path,
      roots
    );
    const enabled =
      !disabledSkills.has(candidate.name) &&
      (dir === undefined || (!dir.disabled && !disabledDirs.has(dir.path)));
    const kind = skillKindOf(candidate.source);
    if (enabled) {
      counts.total += 1;
      if (kind === "custom") counts.custom += 1;
      else if (kind === "builtin") counts.builtin += 1;
      else counts.global += 1;
    }
    skills.push({
      name: candidate.name,
      description: candidate.description,
      ...(candidate.whenToUse !== undefined ? { whenToUse: candidate.whenToUse } : {}),
      source: candidate.source,
      kind,
      ...(dir !== undefined ? { directory: dir.path } : {}),
      enabled,
      toggleable: true
    });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));

  return {
    dirs,
    skills,
    counts,
    validDirs,
    missingDirs
  };
}

/** Auto-discover other agents' skill dirs into the state (once per process). */
export async function ensureDiscovered(state: AgentSkillsState): Promise<boolean> {
  let changed = false;
  const builtin = new Set((await builtinRoots()).map((root) => root.path));
  const retained: AgentSkillsState["dirs"] = [];
  const disabledDirs = new Set(state.disabledDirs.map((path) => resolve(path)));
  for (const dir of state.dirs) {
    const path = resolve(dir.path);
    if (!builtin.has(path)) {
      retained.push(dir);
      continue;
    }
    if (dir.enabled === false) disabledDirs.add(path);
    changed = true;
  }
  state.dirs = retained;
  state.disabledDirs = [...disabledDirs].sort();
  return changed;
}

export function canonicalizeDir(path: string): string {
  return resolve(path);
}
