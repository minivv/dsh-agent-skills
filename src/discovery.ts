/**
 * Auto-discovery of other AI coding agents' skill directories. On first run
 * (and on every scan) any of the well-known homes that actually exists is
 * offered as a scan source, so skills from Claude Code, Codex, Gemini CLI,
 * Cursor, Qoder, Continue, Roo, Cline and Kilo flow into the catalog without
 * any manual setup.
 *
 * @module dsh-agent-skills/discovery
 */
import { homedir } from "node:os";
import { access } from "node:fs/promises";
import { join } from "node:path";

/** Well-known skill roots of other AI coding agents (relative to home). */
export const AGENT_SKILL_DIRS: ReadonlyArray<readonly [id: string, rel: string]> = [
  ["claude", join(".claude", "skills")],
  ["codex", join(".codex", "skills")],
  ["gemini", join(".gemini", "skills")],
  ["cursor", join(".cursor", "skills")],
  ["qoder", join(".qoder", "skills")],
  ["continue", join(".continue", "skills")],
  ["roo", join(".roo", "skills")],
  ["cline", join(".cline", "skills")],
  ["kilo", join(".kilo", "skills")]
];

/** Whether a directory exists and is a directory. */
export async function directoryExists(path: string): Promise<boolean> {
  try {
    const info = await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Discover agent skill directories that exist on this machine, home-expanded.
 * @returns absolute paths, existing only.
 */
export async function discoverAgentSkillDirs(home = homedir()): Promise<string[]> {
  const found: string[] = [];
  for (const [, rel] of AGENT_SKILL_DIRS) {
    const path = join(home, rel);
    if (await directoryExists(path)) found.push(path);
  }
  return found;
}
