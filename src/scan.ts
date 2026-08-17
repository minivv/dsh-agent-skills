/**
 * Skill discovery for user-configured scan directories. Mirrors the parsing
 * rules of @deepseek-ai/dsh-skill-filesystem so a skill authored for Claude
 * Code / Codex / DSH looks identical from every source:
 *   - a directory carrying SKILL.md, or a flat *.md file, per root entry;
 *   - YAML frontmatter requiring name + description;
 *   - optional whenToUse, disable-model-invocation, user-invocable, metadata.
 *
 * @module dsh-agent-skills/scan
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { load as parseYaml } from "js-yaml";

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ParsedSkill {
  name: string;
  description: string;
  whenToUse?: string;
  modelInvocable: boolean;
  userInvocable: boolean;
  metadata?: Record<string, unknown>;
  content: string;
  /** Absolute path of the skill file (SKILL.md or flat .md). */
  path: string;
  /** Absolute directory containing the skill file. */
  directory: string;
}

export interface ScannedRoot {
  path: string;
  skills: ParsedSkill[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function frontmatterBoolean(data: Record<string, unknown>, key: string): boolean | undefined {
  if (!Object.hasOwn(data, key)) return undefined;
  const value = data[key];
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (lowered === "true" || lowered === "yes" || lowered === "on") return true;
    if (lowered === "false" || lowered === "no" || lowered === "off") return false;
  }
  return undefined;
}

/** Split a raw skill file into frontmatter data and body; undefined when invalid. */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } | undefined {
  const firstLineEnd = raw.indexOf("\n");
  if (firstLineEnd < 0) return undefined;
  if (raw.slice(0, firstLineEnd).replace(/\r$/, "") !== "---") return undefined;
  const start = firstLineEnd + 1;
  let lineStart = start;
  while (lineStart <= raw.length) {
    const nextNewline = raw.indexOf("\n", lineStart);
    const lineEnd = nextNewline < 0 ? raw.length : nextNewline;
    if (raw.slice(lineStart, lineEnd).replace(/\r$/, "") === "---") {
      const bodyStart = nextNewline < 0 ? raw.length : nextNewline + 1;
      let parsed: unknown;
      try {
        parsed = parseYaml(raw.slice(start, lineStart));
      } catch {
        return undefined;
      }
      if (!isRecord(parsed)) return undefined;
      return { data: parsed, body: raw.slice(bodyStart) };
    }
    if (nextNewline < 0) return undefined;
    lineStart = nextNewline + 1;
  }
  return undefined;
}

/** Parse one skill file; returns undefined when the file is not a usable skill. */
export async function parseSkillFile(
  path: string,
  logger: { warn(message: string): void }
): Promise<ParsedSkill | undefined> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return undefined;
  }
  const parsed = parseFrontmatter(raw);
  if (parsed === undefined) {
    logger.warn(`agent-skills: skill file ${path} ignored: missing or invalid YAML frontmatter`);
    return undefined;
  }
  const name = stringField(parsed.data, "name");
  const description = stringField(parsed.data, "description");
  if (name === undefined || description === undefined) {
    logger.warn(`agent-skills: skill file ${path} ignored: frontmatter requires name and description`);
    return undefined;
  }
  if (!SKILL_NAME.test(name)) {
    logger.warn(`agent-skills: skill file ${path} ignored: invalid skill name "${name}"`);
    return undefined;
  }
  const disableModelInvocation = frontmatterBoolean(parsed.data, "disable-model-invocation");
  const userInvocable = frontmatterBoolean(parsed.data, "user-invocable");
  const metadata = parsed.data.metadata;
  return {
    name,
    description,
    ...(stringField(parsed.data, "whenToUse") !== undefined ? { whenToUse: stringField(parsed.data, "whenToUse") } : {}),
    modelInvocable: disableModelInvocation !== true,
    userInvocable: userInvocable !== false,
    ...(isRecord(metadata) ? { metadata } : {}),
    content: parsed.body.trim(),
    path,
    directory: dirname(path)
  };
}

/**
 * Scan one root directory for skills (one level deep: <dir>/SKILL.md or
 * flat *.md files). A missing root yields an empty result; a root that is
 * not a directory is treated the same.
 */
export async function scanRoot(
  root: string,
  logger: { warn(message: string): void }
): Promise<ScannedRoot> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true, encoding: "utf8" });
  } catch {
    return { path: root, skills: [] };
  }
  const skills: ParsedSkill[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === ".system") continue;
    const path = join(root, entry.name);
    let kind: "directory" | "file" | undefined;
    if (entry.isDirectory()) kind = "directory";
    else if (entry.isFile()) kind = "file";
    else if (entry.isSymbolicLink()) {
      try {
        const info = await stat(path);
        kind = info.isDirectory() ? "directory" : info.isFile() ? "file" : undefined;
      } catch {
        continue;
      }
    }
    const locator =
      kind === "directory"
        ? { path: join(path, "SKILL.md"), directory: path }
        : kind === "file" && entry.name.endsWith(".md")
          ? { path, directory: root }
          : undefined;
    if (locator === undefined) continue;
    const parsed = await parseSkillFile(locator.path, logger);
    if (parsed !== undefined) skills.push(parsed);
  }
  return { path: root, skills };
}
