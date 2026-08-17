/**
 * Wire schemas shared by the host typert face and the client remote.
 * Zod v4 instances — the typert gateway re-checks JSON-safety after schema
 * parsing, so optional fields must never be `undefined` on the wire.
 *
 * @module dsh-agent-skills/schemas
 */
import { z } from "zod";

/** A scan directory shown on the Agent Skills page. */
export const dirViewSchema = z.object({
  /** Absolute directory path. */
  path: z.string(),
  /** custom = user-added or auto-discovered; builtin = default DSH root. */
  kind: z.enum(["custom", "builtin"]),
  /** Whether the directory exists on disk right now. */
  exists: z.boolean(),
  /** Whether scanning this directory is enabled. */
  enabled: z.boolean(),
  /** Number of valid skills discovered in this directory. */
  skillCount: z.number().int().min(0),
  /** UI tag: "用户配置" or "内置路径" — resolved client-side from kind. */
  tag: z.enum(["user", "builtin"]),
  /** True for auto-discovered agent directories (custom kind only). */
  auto: z.boolean().optional(),
  /** Every valid skill discovered in this directory (undeduplicated). */
  skills: z.array(
    z.object({
      name: z.string(),
      description: z.string()
    })
  )
});
export type DirView = z.infer<typeof dirViewSchema>;

/** One skill shown on the Agent Skills page. */
export const skillViewSchema = z.object({
  /** Kebab-case skill name. */
  name: z.string(),
  /** One-line description from frontmatter. */
  description: z.string(),
  /** Optional trigger guidance from frontmatter. */
  whenToUse: z.string().optional(),
  /** Raw provider source id (custom / user-agents / user-dsh / bundled / ...). */
  source: z.string(),
  /** UI category: 自定义 / 全局 / 内置. */
  kind: z.enum(["custom", "global", "builtin"]),
  /** Directory the skill lives in (resource base), when known. */
  directory: z.string().optional(),
  /** Effective enabled state (source toggle AND skill toggle). */
  enabled: z.boolean(),
  /** True when the skill is user-toggleable (has a file-backed source). */
  toggleable: z.boolean()
});
export type SkillView = z.infer<typeof skillViewSchema>;

/** The full page view. */
export const agentSkillsViewSchema = z.object({
  dirs: z.array(dirViewSchema),
  skills: z.array(skillViewSchema),
  counts: z.object({
    total: z.number().int().min(0),
    custom: z.number().int().min(0),
    global: z.number().int().min(0),
    builtin: z.number().int().min(0)
  }),
  /** Sources summary: existing / missing directories. */
  validDirs: z.number().int().min(0),
  missingDirs: z.number().int().min(0)
});
export type AgentSkillsView = z.infer<typeof agentSkillsViewSchema>;

/** Whether the plugin provider is mounted in DSH's shipped Agent presets. */
export const presetTakeoverStatusSchema = z.object({
  /** Whether a verified DSH install with supported presets was found. */
  available: z.boolean(),
  /** Whether every available standard/code preset contains the managed row. */
  enabled: z.boolean(),
  /** Number of preset files that already contain the managed row. */
  configured: z.number().int().min(0),
  /** Number of supported preset files found in this DSH installation. */
  total: z.number().int().min(0)
});
export type PresetTakeoverStatus = z.infer<typeof presetTakeoverStatusSchema>;

/** Input for toggling one skill. */
export const toggleSkillInputSchema = z.object({
  name: z.string(),
  enabled: z.boolean()
});
export type ToggleSkillInput = z.infer<typeof toggleSkillInputSchema>;

/** Input for toggling one scan directory. */
export const toggleDirInputSchema = z.object({
  path: z.string(),
  enabled: z.boolean()
});
export type ToggleDirInput = z.infer<typeof toggleDirInputSchema>;

/** Input for adding a custom scan directory. */
export const addDirInputSchema = z.object({
  path: z.string().min(1)
});
export type AddDirInput = z.infer<typeof addDirInputSchema>;

/** Input for removing a custom scan directory. */
export const removeDirInputSchema = z.object({
  path: z.string().min(1)
});
export type RemoveDirInput = z.infer<typeof removeDirInputSchema>;
