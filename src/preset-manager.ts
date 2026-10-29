/**
 * Safe, user-triggered management of the preset-scoped provider row.
 * The settings page calls this module through the host remote service; npm
 * lifecycle scripts never mutate another package during installation.
 *
 * @module dsh-agent-skills/preset-manager
 */
import {
  accessSync,
  constants,
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
import { comparablePath } from "./paths.js";

const DSH_PACKAGE = "@deepseek-ai/dsh";
const DSH_PRESET_PACKAGE = "@deepseek-ai/dsh-agent-presets";
const DSH_WEB_APP_PACKAGE = "@deepseek-ai/dsh-web-app";
/**
 * Packages that may own the shipped presets, preferred owner first.
 *
 * `dsh-agent-presets` shipped them until 0.1.6-alpha; DSH 0.1.7-rc.2 moved them
 * into `dsh-web-app/presets/<id>.patch.yml`; very old layouts keep them inside
 * the `@deepseek-ai/dsh` package itself.
 *
 * The order is a *preference*, never a probe order. Upgrading DSH routinely
 * leaves the retired `dsh-agent-presets` copy behind, so one tree level can hold
 * the live and the retired owner at once. Picking whichever is probed first
 * would then rewrite the stale copy — reporting a successful takeover while
 * every file the running CLI actually loads stays untouched. A level therefore
 * collects *all* of its candidates and keeps the best one (see `siblingRoots`).
 *
 * Unscoped names — these are path segments under `node_modules/@deepseek-ai/`.
 */
const PRESET_OWNER_PACKAGES = ["dsh-web-app", "dsh-agent-presets", "dsh"] as const;
const PRESET_IDS = ["standard", "code", "ptc", "cordis"] as const;
const OFFICIAL_PROVIDER = "@deepseek-ai/dsh-skill-filesystem";
const TAKEOVER_PROVIDER = "dsh-agent-skills/preset";
const CURRENT_ROW = /((?:^|\n)[ \t]*- id: skill-filesystem[ \t]*\r?\n[ \t]+name:[ \t]*)['"]?dsh-agent-skills\/preset['"]?(?=\r?\n|$)/m;
const OFFICIAL_ROW = /((?:^|\n)[ \t]*- id: skill-filesystem[ \t]*\r?\n[ \t]+name:[ \t]*)['"]?@deepseek-ai\/dsh-skill-filesystem['"]?(?=\r?\n|$)/m;
const LEGACY_OVERRIDE_ROW = /((?:^|\n)[ \t]*- id: skill-filesystem[ \t]*\r?\n[ \t]+name:[ \t]*)['"]?dsh-agent-skills['"]?(?=\r?\n|$)/m;
const LEGACY_MANAGED_BLOCK = /\n?# ── dsh-agent-skills ─+\r?\n# Registered by dsh-agent-skills:[\s\S]*?- id: agent-skills\r?\n  name: dsh-agent-skills(?:\/preset)?\r?\n?\s*$/m;

/**
 * Error text for a verified install whose presets cannot be rewritten. DSH
 * desktop builds pack the runtime into an Electron `app.asar`: reads go through
 * Electron's virtual fs layer, but writes reach the real filesystem, where the
 * archive is a single regular file (ENOTDIR).
 */
const READ_ONLY_INSTALL_MESSAGE =
  "当前 DSH 安装的预设文件不可写（例如桌面版把运行时封装在 app.asar 中），无法修改技能接管；请改用 npm 安装的 dsh，或等待桌面版适配";
/** Filesystem errors that mean the preset location is not writable. */
const READ_ONLY_ERROR_CODES = new Set(["ENOTDIR", "EROFS", "EACCES", "EPERM"]);

export interface PresetManagerOptions {
  /** Explicit package root, primarily for tests and manual recovery. */
  dshRoot?: string;
  /** Override the running CLI entry used for package-root discovery. */
  argvEntry?: string;
}

/** `name` from a package manifest, or undefined when it cannot be read. */
function packageNameOf(dir: string): string | undefined {
  const manifest = join(dir, "package.json");
  if (!existsSync(manifest)) return undefined;
  try {
    const pkg = JSON.parse(readFileSync(manifest, "utf8")) as { name?: unknown };
    return typeof pkg.name === "string" ? pkg.name : undefined;
  } catch {
    return undefined;
  }
}

/** Oldest layout: `<@deepseek-ai/dsh>/config/agent-presets/<id>/`. */
function isLegacyDshRoot(dir: string): boolean {
  return packageNameOf(dir) === DSH_PACKAGE && existsSync(join(dir, "config", "agent-presets"));
}

/**
 * Layouts that ship the presets as their own package files:
 * `dsh-agent-presets/presets/<id>/agent.cordis.yml` and, since DSH
 * 0.1.7-rc.2, `dsh-web-app/presets/<id>.patch.yml`.
 */
function isPresetPackageRoot(dir: string): boolean {
  const name = packageNameOf(dir);
  if (name !== DSH_PRESET_PACKAGE && name !== DSH_WEB_APP_PACKAGE) return false;
  return presetFiles(dir).length > 0;
}

/** True when `dir` owns at least one preset this plugin can rewrite. */
function isTakeoverRoot(dir: string): boolean {
  return isLegacyDshRoot(dir) || isPresetPackageRoot(dir);
}

function tryRealpath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * True when `path` is inside an Electron `app.asar` archive.
 *
 * Electron's fs layer virtualizes reads for archive members, so read probes
 * (`existsSync` / `statSync` / `readFileSync`) succeed even though the archive
 * is one regular file on disk. Writes cannot be virtualized, so the archive is
 * detected from the path shape instead of from the fs shim.
 */
function isAsarPath(path: string): boolean {
  return /(?:^|\/)[^/]*\.asar(?:\/|$)/.test(comparablePath(path));
}

/** Non-mutating writability probe for the directory that would hold the temp file. */
function isWritableDirectory(dir: string): boolean {
  if (isAsarPath(dir)) return false;
  try {
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** True when every preset file sits in a directory this process can rewrite. */
function presetFilesWritable(files: string[]): boolean {
  return files.length > 0 && files.every((file) => isWritableDirectory(dirname(file)));
}

/** Turn archive/read-only write failures into the actionable takeover message. */
function readableWriteError(error: unknown): Error {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  if (typeof code === "string" && READ_ONLY_ERROR_CODES.has(code)) {
    return new Error(READ_ONLY_INSTALL_MESSAGE, { cause: error });
  }
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Sibling installs of the preset-owning packages at one tree level, best
 * candidate first.
 *
 * Both the npm-flat spot (`<dir>/node_modules/@deepseek-ai/<pkg>`) and pnpm's
 * hoisted peer directory (`<dir>/node_modules/.pnpm/node_modules/…`) are real
 * layouts, and the package-owning installs also keep their own dependencies as
 * siblings — which is where `dsh-web-app` lives next to the `dsh` package.
 *
 * Every candidate is collected before choosing, so a retired copy can never win
 * merely by being probed first; `PRESET_OWNER_PACKAGES` order decides instead.
 */
function siblingRoots(dir: string, predicate: (dir: string) => boolean): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const pkg of PRESET_OWNER_PACKAGES) {
    for (const sibling of [
      join(dir, "node_modules", "@deepseek-ai", pkg),
      join(dir, "node_modules", ".pnpm", "node_modules", "@deepseek-ai", pkg)
    ]) {
      if (!predicate(sibling)) continue;
      const resolved = tryRealpath(sibling);
      const key = comparablePath(resolved);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(resolved);
    }
  }
  return found;
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
      // The package containing the running CLI is always the closest owner.
      if (predicate(current)) return tryRealpath(current);
      const [sibling] = siblingRoots(current, predicate);
      if (sibling !== undefined) return sibling;

      const parent = dirname(current);
      if (parent === current || current === parse(current).root) break;
      current = parent;
    }
  }
  return undefined;
}

/** Directory part of a path that may be a file, or undefined when unusable. */
function directoryOf(path: string): string | undefined {
  try {
    return statSync(path).isDirectory() ? path : dirname(path);
  } catch {
    // A not-yet-existing file can still live in an existing directory.
    const dir = dirname(path);
    return existsSync(dir) ? dir : undefined;
  }
}

/**
 * Resolve the verified preset root: the legacy `@deepseek-ai/dsh` package, the
 * retired `@deepseek-ai/dsh-agent-presets` package, or the `dsh-web-app`
 * package that owns the presets from DSH 0.1.7-rc.2 on.
 */
export function resolveDshPackageRoot(options: PresetManagerOptions = {}): string | undefined {
  const candidates = [
    options.dshRoot,
    process.env.DSH_INSTALL_ROOT,
    options.argvEntry ?? process.argv[1]
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === "") continue;
    // The candidate may be the owning package itself, a file inside it (the
    // CLI entry), or a deeper subdirectory of it.
    const dir = directoryOf(candidate);
    if (dir !== undefined) {
      for (const probe of [dir, dirname(dir)]) {
        if (isTakeoverRoot(probe)) return tryRealpath(probe);
      }
    }
    const found = walkForRoot(candidate, isTakeoverRoot);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Every on-disk shape one preset id may use, in probe order. */
function presetFileProbes(root: string, id: string): string[] {
  return [
    join(root, "config", "agent-presets", id, "agent.cordis.yml"),
    join(root, "presets", id, "agent.cordis.yml"),
    join(root, "presets", `${id}.patch.yml`)
  ];
}

/**
 * Existing preset files, one per shipped id, in `PRESET_IDS` order.
 *
 * The probes cover every historical layout, and deduplication compares
 * separator-normalized paths so a Windows `\` path and its `/` equivalent
 * never double-count.
 */
function presetFiles(root: string): string[] {
  const seen = new Set<string>();
  const files: string[] = [];
  for (const id of PRESET_IDS) {
    for (const file of presetFileProbes(root, id)) {
      if (!existsSync(file)) continue;
      const key = comparablePath(file);
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(file);
      break;
    }
  }
  return files;
}

function statusFor(root: string | undefined): PresetTakeoverStatus {
  if (root === undefined) return { available: false, writable: false, enabled: false, configured: 0, total: 0 };
  const files = presetFiles(root);
  const configured = files.filter((file) => {
    const text = readFileSync(file, "utf8");
    return CURRENT_ROW.test(text) && !OFFICIAL_ROW.test(text) && !LEGACY_MANAGED_BLOCK.test(text);
  }).length;
  return {
    available: files.length > 0,
    writable: presetFilesWritable(files),
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
  } catch (error) {
    throw readableWriteError(error);
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

/** Whether `text` still contains a row this plugin knows how to rewrite. */
function hasTakeoverRow(text: string): boolean {
  return OFFICIAL_ROW.test(text) || CURRENT_ROW.test(text) || LEGACY_OVERRIDE_ROW.test(text);
}

/** Idempotently replace the shipped filesystem provider in every supported preset. */
export function enablePresetTakeover(options: PresetManagerOptions = {}): PresetTakeoverStatus {
  const root = resolveDshPackageRoot(options);
  if (root === undefined) throw new Error("未找到 DSH 安装位置，请确认当前页面由 DSH 启动后重试");
  const files = presetFiles(root);
  if (files.length === 0) throw new Error("当前 DSH 安装中没有 standard 或 code Agent 预设");

  // A shipped preset may carry no skill row at all (the `minimal` preset does
  // not), so only files that really have a rewritable row are targets.
  const updates = files.flatMap((file) => {
    const current = readFileSync(file, "utf8");
    if (!hasTakeoverRow(current)) return [];
    return [{ file, current, next: takeoverContent(file, current) }];
  });
  if (updates.length === 0) throw new Error("当前 DSH 安装中没有可接管的 skill-filesystem provider");
  const changes = updates.filter((update) => update.next !== update.current);
  // Probe before writing: an app.asar-packaged install would otherwise fail
  // with a raw ENOTDIR while creating the temporary file below.
  if (changes.length > 0 && !presetFilesWritable(changes.map((update) => update.file))) {
    throw new Error(READ_ONLY_INSTALL_MESSAGE);
  }
  for (const change of changes) replaceAtomically(change.file, change.next);
  return statusFor(root);
}

/** Restore the official filesystem provider and remove legacy appended rows. */
export function disablePresetTakeover(options: PresetManagerOptions = {}): PresetTakeoverStatus {
  const root = resolveDshPackageRoot(options);
  if (root === undefined) throw new Error("未找到 DSH 安装位置，请确认 DSH_INSTALL_ROOT 是否正确");
  const files = presetFiles(root);
  if (files.length === 0) throw new Error("当前 DSH 安装中没有 standard 或 code Agent 预设");
  const changes = files.flatMap((file) => {
    const current = readFileSync(file, "utf8");
    const next = restoreContent(current);
    return next === current ? [] : [{ file, next }];
  });
  if (changes.length > 0 && !presetFilesWritable(changes.map((change) => change.file))) {
    throw new Error(READ_ONLY_INSTALL_MESSAGE);
  }
  for (const change of changes) replaceAtomically(change.file, change.next);
  return statusFor(root);
}
