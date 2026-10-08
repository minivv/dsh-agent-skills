// Windows regression test (DSH issue #3): every path comparison must work on
// both separators, because Windows paths produced by path.join/resolve use `\`
// while the comparisons used to be written against a `/` literal.
import assert from "node:assert/strict";
import { comparablePath, isSameOrInside } from "./lib/paths.js";
import { rootFor } from "./lib/provider.js";

const HOME = "C:\\Users\\we i\\.claude\\skills";
/** Windows case-folds comparison keys, POSIX keeps them verbatim. */
const fold = (path) => (process.platform === "win32" ? path.toLowerCase() : path);

assert.equal(comparablePath("C:\\a\\b"), fold("C:/a/b"));
assert.equal(comparablePath("C:/a/b/"), fold("C:/a/b"));
assert.equal(comparablePath("/home/wei/.claude/skills/"), "/home/wei/.claude/skills");

assert.equal(isSameOrInside("C:\\a\\b", "C:\\a"), true);
assert.equal(isSameOrInside("C:\\a\\b", "C:\\a\\b"), true);
assert.equal(isSameOrInside("C:\\ab", "C:\\a"), false, "prefix must stop at a separator");
assert.equal(isSameOrInside("/home/wei/.claude/skills/pdf/SKILL.md", HOME.replace(/\\/g, "/")), false);
if (process.platform === "win32") {
  // Windows filesystems are case-insensitive, so comparisons fold case there.
  assert.equal(isSameOrInside("C:\\A\\B\\skill\\SKILL.md", "c:/a/b"), true);
}

// The exact shape lib/provider.js used before the fix: a root and a child path
// that only differ in separator.
const roots = [{ path: HOME, disabled: true }];
assert.equal(rootFor(HOME, roots)?.disabled, true, "exact root match");
assert.equal(
  rootFor("C:\\Users\\we i\\.claude\\skills\\pdf", roots)?.disabled,
  true,
  "child directory must resolve to its root"
);
assert.equal(
  rootFor("C:\\Users\\we i\\.claude\\skills\\pdf\\SKILL.md", roots)?.disabled,
  true,
  "skill file must resolve to its root"
);
assert.equal(rootFor("C:\\Users\\we i\\.codex\\skills\\pdf", roots), undefined);
assert.equal(rootFor(undefined, roots), undefined);

// Longest match wins, unchanged by normalization.
const nested = [
  { path: "C:\\Users\\we i", disabled: false },
  { path: "C:\\Users\\we i\\.claude\\skills", disabled: true }
];
assert.equal(rootFor("C:\\Users\\we i\\.claude\\skills\\a\\b.md", nested)?.disabled, true);

console.log("paths: ok");
