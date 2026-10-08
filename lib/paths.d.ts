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
export declare function comparablePath(path: string): string;
/** True when `path` is `root` itself or a descendant of it. */
export declare function isSameOrInside(path: string, root: string): boolean;
