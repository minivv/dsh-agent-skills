/**
 * Safe, user-triggered management of the preset-scoped provider row.
 * The settings page calls this module through the host remote service; npm
 * lifecycle scripts never mutate another package during installation.
 *
 * @module dsh-agent-skills/preset-manager
 */
import { existsSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, parse } from "node:path";
const DSH_PACKAGE = "@deepseek-ai/dsh";
const PRESET_IDS = ["standard", "code"];
const OFFICIAL_PROVIDER = "@deepseek-ai/dsh-skill-filesystem";
const TAKEOVER_PROVIDER = "dsh-agent-skills/preset";
const CURRENT_ROW = /((?:^|\n)[ \t]*- id: skill-filesystem[ \t]*\r?\n[ \t]+name:[ \t]*)['"]?dsh-agent-skills\/preset['"]?(?=\r?\n|$)/m;
const OFFICIAL_ROW = /((?:^|\n)[ \t]*- id: skill-filesystem[ \t]*\r?\n[ \t]+name:[ \t]*)['"]?@deepseek-ai\/dsh-skill-filesystem['"]?(?=\r?\n|$)/m;
const LEGACY_OVERRIDE_ROW = /((?:^|\n)[ \t]*- id: skill-filesystem[ \t]*\r?\n[ \t]+name:[ \t]*)['"]?dsh-agent-skills['"]?(?=\r?\n|$)/m;
const LEGACY_MANAGED_BLOCK = /\n?# ── dsh-agent-skills ─+\r?\n# Registered by dsh-agent-skills:[\s\S]*?- id: agent-skills\r?\n  name: dsh-agent-skills(?:\/preset)?\r?\n?\s*$/m;
function verifiedPackageRoot(start) {
    if (start === undefined || start === "" || !existsSync(start))
        return undefined;
    let current;
    try {
        const resolved = realpathSync(start);
        current = statSync(resolved).isDirectory() ? resolved : dirname(resolved);
    }
    catch {
        return undefined;
    }
    while (true) {
        const manifest = join(current, "package.json");
        if (existsSync(manifest)) {
            try {
                const pkg = JSON.parse(readFileSync(manifest, "utf8"));
                if (pkg.name === DSH_PACKAGE && existsSync(join(current, "config", "agent-presets")))
                    return current;
            }
            catch {
                // Keep walking; a parent package may still be the DSH package.
            }
        }
        const parent = dirname(current);
        if (parent === current || current === parse(current).root)
            return undefined;
        current = parent;
    }
}
/** Resolve only verified @deepseek-ai/dsh package roots. */
export function resolveDshPackageRoot(options = {}) {
    const candidates = [
        options.dshRoot,
        process.env.DSH_INSTALL_ROOT,
        options.argvEntry ?? process.argv[1]
    ];
    for (const candidate of candidates) {
        const root = verifiedPackageRoot(candidate);
        if (root !== undefined)
            return root;
    }
    return undefined;
}
function presetFiles(root) {
    const presetRoot = join(root, "config", "agent-presets");
    return PRESET_IDS.map((id) => join(presetRoot, id, "agent.cordis.yml")).filter((file) => existsSync(file));
}
function statusFor(root) {
    if (root === undefined)
        return { available: false, enabled: false, configured: 0, total: 0 };
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
export function inspectPresetTakeover(options = {}) {
    return statusFor(resolveDshPackageRoot(options));
}
function replaceAtomically(file, content) {
    const temporary = join(dirname(file), `.${basename(file)}.dsh-agent-skills-${process.pid}-${randomUUID()}`);
    try {
        writeFileSync(temporary, content, {
            encoding: "utf8",
            flag: "wx",
            mode: statSync(file).mode
        });
        renameSync(temporary, file);
    }
    finally {
        if (existsSync(temporary))
            unlinkSync(temporary);
    }
}
function replaceProvider(text, matcher, provider) {
    return text.replace(matcher, `$1${provider}`);
}
function takeoverContent(file, text) {
    const cleaned = text.replace(LEGACY_MANAGED_BLOCK, "").replace(/\s*$/, "\n");
    if (CURRENT_ROW.test(cleaned) && !OFFICIAL_ROW.test(cleaned))
        return cleaned;
    if (OFFICIAL_ROW.test(cleaned))
        return replaceProvider(cleaned, OFFICIAL_ROW, TAKEOVER_PROVIDER);
    if (LEGACY_OVERRIDE_ROW.test(cleaned))
        return replaceProvider(cleaned, LEGACY_OVERRIDE_ROW, TAKEOVER_PROVIDER);
    throw new Error(`预设 ${file} 中没有可接管的 skill-filesystem provider`);
}
function restoreContent(text) {
    const cleaned = text.replace(LEGACY_MANAGED_BLOCK, "").replace(/\s*$/, "\n");
    if (CURRENT_ROW.test(cleaned))
        return replaceProvider(cleaned, CURRENT_ROW, OFFICIAL_PROVIDER);
    if (LEGACY_OVERRIDE_ROW.test(cleaned))
        return replaceProvider(cleaned, LEGACY_OVERRIDE_ROW, OFFICIAL_PROVIDER);
    return cleaned;
}
/** Idempotently replace the shipped filesystem provider in every supported preset. */
export function enablePresetTakeover(options = {}) {
    const root = resolveDshPackageRoot(options);
    if (root === undefined)
        throw new Error("未找到 DSH 安装位置，请确认当前页面由 DSH 启动后重试");
    const files = presetFiles(root);
    if (files.length === 0)
        throw new Error("当前 DSH 安装中没有 standard 或 code Agent 预设");
    const updates = files.map((file) => {
        const current = readFileSync(file, "utf8");
        return { file, current, next: takeoverContent(file, current) };
    });
    for (const update of updates) {
        if (update.next !== update.current)
            replaceAtomically(update.file, update.next);
    }
    return statusFor(root);
}
/** Restore the official filesystem provider and remove legacy appended rows. */
export function disablePresetTakeover(options = {}) {
    const root = resolveDshPackageRoot(options);
    if (root === undefined)
        throw new Error("未找到 DSH 安装位置，请确认 DSH_INSTALL_ROOT 是否正确");
    const files = presetFiles(root);
    if (files.length === 0)
        throw new Error("当前 DSH 安装中没有 standard 或 code Agent 预设");
    for (const file of files) {
        const current = readFileSync(file, "utf8");
        const next = restoreContent(current);
        if (next !== current)
            replaceAtomically(file, next);
    }
    return statusFor(root);
}
//# sourceMappingURL=preset-manager.js.map