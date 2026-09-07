/**
 * Safe, user-triggered management of the preset-scoped provider row.
 * The settings page calls this module through the host remote service; npm
 * lifecycle scripts never mutate another package during installation.
 *
 * @module dsh-agent-skills/preset-manager
 */
import {
  existsSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, parse } from "node:path";
import type { PresetTakeoverStatus } from "./schemas.js";

const DSH_PACKAGE = "@deepseek-ai/dsh";
const DSH_PRESET_PACKAGE = "@deepseek-ai/dsh-agent-presets";
const PRESET_IDS = ["standard", "code", "ptc", "cordis"] as const;
const OFFICIAL_PROVIDER = "@deepseek-ai/dsh-skill-filesystem";
const TAKEOVER_PROVIDER = "dsh-agent-skills/preset";
const CURRENT_ROW = /((?:^|\n)[ \t]*- id: skill-filesystem[ \t]*\r?\n[ \t]+name:[ \t]*)['"]?dsh-agent-skills\/preset['"]?(?=\r?\n|$)/m;
const OFFICIAL_ROW = /((?:^|\n)[ \t]*- id: skill-filesystem[ \t]*\r?\n[ \t]+name:[ \t]*)['"]?@deepseek-ai\/dsh-skill-filesystem['"]?(?=\r?\n|$)/m;
const LEGACY_OVERRIDE_ROW = /((?:^|\n)[ \t]*- id: skill-filesystem[ \t]*\r?\n[ \t]+name:[ \t]*)['"]?dsh-agent-skills['"]?(?=\r?\n|$)/m;
const LEGACY_MANAGED_BLOCK = /\n?# ── dsh-agent-skills ─+\r?\n# Registered by dsh-agent-skills:[\s\S]*?- id: agent-skills\r?\n  name: dsh-agent-skills(?:\/preset)?\r?\n?\s*$/m;

export interface PresetManagerOptions {
  /** Explicit package root, primarily for tests and manual recovery. */
  dshRoot?: string;
  /** Override the running CLI entry used for package-root discovery. */
  argvEntry?: string;
}

function isLegacyDshRoot(dir: string): boolean {
  const manifest = join(dir, "package.json");
  if (!existsSync(manifest)) return false;
  try {
    const pkg = JSON.parse(readFileSync(manifest, "utf8")) as { name?: unknown };
    if (pkg.name !== DSH_PACKAGE) return false;
    // Accept both old layout (config/agent-presets present) and new DSH package
    // that still carries the name but whose presets moved to a sibling package.
    // For the latter we don't return true here; preset-package walk will handle it.
    return existsSync(join(dir, "config", "agent-presets"));
  } catch {
    return false;
  }
}

function isPresetPackageRoot(dir: string): boolean {
  const manifest = join(dir, "package.json");
  if (!existsSync(manifest)) return false;
  try {
    const pkg = JSON.parse(readFileSync(manifest, "utf8")) as { name?: unknown };
    if (pkg.name !== DSH_PRESET_PACKAGE) return false;
    return existsSync(join(dir, "presets"));
  } catch {
    return false;
  }
}

function tryRealpath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

function walkForRoot(start: string | undefined, predicate: (dir: string) => boolean): string | undefined {
  if (start === undefined || start === "" || !existsSync(start)) return undefined;
  const bases: string[] = [];
  // Keep the original symlink path for pnpm global layout; realpath is kept as fallback.
  try {
    const stat = statSync(start);
    const baseDir = stat.isDirectory() ? start : dirname(start);
    bases.push(baseDir);
  } catch {
    return undefined;
  }
  try {
    const real = realpathSync(start);
    const stat = statSync(real);
    const realDir = stat.isDirectory() ? real : dirname(real);
    if (!bases.includes(realDir)) bases.push(realDir);
  } catch {
    // ignore realpath failures
  }

  for (const base of bases) {
    let current = base;
    while (true) {
      if (predicate(current)) return tryRealpath(current);

      // Check sibling package installations at this level (pnpm / npm flat layouts).
      const presetSibling = join(current, "node_modules", "@deepseek-ai", "dsh-agent-presets");
      if (predicate(presetSibling)) return tryRealpath(presetSibling);
      const pnpmPreset = join(current, "node_modules", ".pnpm", "node_modules", "@deepseek-ai", "dsh-agent-presets");
      if (predicate(pnpmPreset)) return tryRealpath(pnpmPreset);
      const dshSibling = join(current, "node_modules", "@deepseek-ai", "dsh");
      if (predicate(dshSibling)) return tryRealpath(dshSibling);
      const pnpmDsh = join(current, "node_modules", ".pnpm", "node_modules", "@deepseek-ai", "dsh");
      if (predicate(pnpmDsh)) return tryRealpath(pnpmDsh);

      const parent = dirname(current);
      if (parent === current || current === parse(current).root) break;
      current = parent;
    }
  }
  return undefined;
}

function verifiedPackageRoot(start: string | undefined): string | undefined {
  return walkForRoot(start, isLegacyDshRoot);
}

function verifiedPresetPackageRoot(start: string | undefined): string | undefined {
  return walkForRoot(start, isPresetPackageRoot);
}

/** Resolve verified preset roots - legacy DSH package OR new dsh-agent-presets package. */
export function resolveDshPackageRoot(options: PresetManagerOptions = {}): string | undefined {
  const candidates = [
    options.dshRoot,
    process.env.DSH_INSTALL_ROOT,
    options.argvEntry ?? process.argv[1]
  ];
  for (const candidate of candidates) {
    // Explicit dshRoot may itself be the preset package root.
    if (candidate !== undefined && candidate !== "") {
      if (isPresetPackageRoot(candidate) || isLegacyDshRoot(candidate)) return tryRealpath(candidate);
      // Also allow direct path to a preset package's subdirectory.
      try {
        const stat = statSync(candidate);
        const dir = stat.isDirectory() ? candidate : dirname(candidate);
        if (isPresetPackageRoot(dir) || isLegacyDshRoot(dir)) return tryRealpath(dir);
      } catch {}
    }
    const legacy = walkForRoot(candidate, isLegacyDshRoot);
    if (legacy !== undefined) return legacy;
    const preset = walkForRoot(candidate, isPresetPackageRoot);
    if (preset !== undefined) return preset;
  }
  return undefined;
}

function presetFiles(root: string): string[] {
  const candidates = [
    join(root, "config", "agent-presets"),
    join(root, "presets")
  ];
  const files: string[] = [];
  for (const presetRoot of candidates) {
    for (const id of PRESET_IDS) {
      const file = join(presetRoot, id, "agent.cordis.yml");
      if (existsSync(file) && !files.includes(file)) files.push(file);
    }
  }
  if (files.length === 0) return [];
  // Preserve PRESET_IDS order for deterministic status reporting.
  return PRESET_IDS.map((id) =>
    files.find((f) => f.endsWith(`/${id}/agent.cordis.yml`))
  ).filter((f): f is string => f !== undefined);
}

function statusFor(root: string | undefined): PresetTakeoverStatus {
  if (root === undefined) return { available: false, enabled: false, configured: 0, total: 0 };
  const files = presetFiles(root);
  const configured = files.filter((file) => {
    const text = readFileSync(file, "utf8");
    return CURRENT_ROW.test(text) && !OFFICIAL_ROW.test(text) && !LEGACY_MANAGED_BLOCK.test(text);
  }).length;
  return {
    available: files.length > 0,
    enabled: files.length > 0 && configured === files.length,
    configured,
    total: files.length
  };
}

/** Inspect whether every shipped standard/code preset already mounts the provider. */
export function inspectPresetTakeover(options: PresetManagerOptions = {}): PresetTakeoverStatus {
  return statusFor(resolveDshPackageRoot(options));
}

function replaceAtomically(file: string, content: string): void {
  const temporary = join(dirname(file), `.${basename(file)}.dsh-agent-skills-${process.pid}-${randomUUID()}`);
  try {
    writeFileSync(temporary, content, {
      encoding: "utf8",
      flag: "wx",
      mode: statSync(file).mode
    });
    renameSync(temporary, file);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function replaceProvider(text: string, matcher: RegExp, provider: string): string {
  const yamlScalar = provider.startsWith("@") ? `'${provider}'` : provider;
  return text.replace(matcher, `$1${yamlScalar}`);
}

function takeoverContent(file: string, text: string): string {
  const cleaned = text.replace(LEGACY_MANAGED_BLOCK, "").replace(/\s*$/, "\n");
  if (CURRENT_ROW.test(cleaned) && !OFFICIAL_ROW.test(cleaned)) return cleaned;
  if (OFFICIAL_ROW.test(cleaned)) return replaceProvider(cleaned, OFFICIAL_ROW, TAKEOVER_PROVIDER);
  if (LEGACY_OVERRIDE_ROW.test(cleaned)) return replaceProvider(cleaned, LEGACY_OVERRIDE_ROW, TAKEOVER_PROVIDER);
  throw new Error(`预设 ${file} 中没有可接管的 skill-filesystem provider`);
}

function restoreContent(text: string): string {
  const cleaned = text.replace(LEGACY_MANAGED_BLOCK, "").replace(/\s*$/, "\n");
  if (CURRENT_ROW.test(cleaned)) return replaceProvider(cleaned, CURRENT_ROW, OFFICIAL_PROVIDER);
  if (LEGACY_OVERRIDE_ROW.test(cleaned)) return replaceProvider(cleaned, LEGACY_OVERRIDE_ROW, OFFICIAL_PROVIDER);
  return cleaned;
}

/** Idempotently replace the shipped filesystem provider in every supported preset. */
export function enablePresetTakeover(options: PresetManagerOptions = {}): PresetTakeoverStatus {
  const root = resolveDshPackageRoot(options);
  if (root === undefined) throw new Error("未找到 DSH 安装位置，请确认当前页面由 DSH 启动后重试");
  const files = presetFiles(root);
  if (files.length === 0) throw new Error("当前 DSH 安装中没有 standard 或 code Agent 预设");

  const updates = files.map((file) => {
    const current = readFileSync(file, "utf8");
    return { file, current, next: takeoverContent(file, current) };
  });
  for (const update of updates) {
    if (update.next !== update.current) replaceAtomically(update.file, update.next);
  }
  return statusFor(root);
}

/** Restore the official filesystem provider and remove legacy appended rows. */
export function disablePresetTakeover(options: PresetManagerOptions = {}): PresetTakeoverStatus {
  const root = resolveDshPackageRoot(options);
  if (root === undefined) throw new Error("未找到 DSH 安装位置，请确认 DSH_INSTALL_ROOT 是否正确");
  const files = presetFiles(root);
  if (files.length === 0) throw new Error("当前 DSH 安装中没有 standard 或 code Agent 预设");
  for (const file of files) {
    const current = readFileSync(file, "utf8");
    const next = restoreContent(current);
    if (next !== current) replaceAtomically(file, next);
  }
  return statusFor(root);
}
