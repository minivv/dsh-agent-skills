/**
 * Platform-independent path comparisons.
 *
 * Windows separates paths with `\`, so any comparison written against a `/`
 * literal — a `startsWith(root + "/")` prefix test or an
 * `endsWith("/<id>/agent.cordis.yml")` suffix test — silently fails there.
 * Every path comparison in this plugin goes through the helpers below.
 *
 * @module dsh-agent-skills/paths
 */
/**
 * Canonical form used for comparisons only — never for filesystem access.
 *
 * Backslashes become forward slashes (Windows accepts both separators),
 * trailing separators are dropped, and Windows paths fold case because the
 * filesystem does.
 */
export function comparablePath(path) {
    const slashed = path.replace(/\\/g, "/").replace(/\/+$/, "");
    return process.platform === "win32" ? slashed.toLowerCase() : slashed;
}
/** True when `path` is `root` itself or a descendant of it. */
export function isSameOrInside(path, root) {
    const candidate = comparablePath(path);
    const base = comparablePath(root);
    return candidate === base || candidate.startsWith(`${base}/`);
}
//# sourceMappingURL=paths.js.map