/**
 * Wire schemas shared by the host typert face and the client remote.
 * Zod v4 instances — the typert gateway re-checks JSON-safety after schema
 * parsing, so optional fields must never be `undefined` on the wire.
 *
 * @module dsh-agent-skills/schemas
 */
import { z } from "zod";
/** A scan directory shown on the Agent Skills page. */
export declare const dirViewSchema: z.ZodObject<{
    path: z.ZodString;
    kind: z.ZodEnum<{
        custom: "custom";
        builtin: "builtin";
    }>;
    exists: z.ZodBoolean;
    enabled: z.ZodBoolean;
    skillCount: z.ZodNumber;
    tag: z.ZodEnum<{
        builtin: "builtin";
        user: "user";
    }>;
    auto: z.ZodOptional<z.ZodBoolean>;
    skills: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type DirView = z.infer<typeof dirViewSchema>;
/** One skill shown on the Agent Skills page. */
export declare const skillViewSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    whenToUse: z.ZodOptional<z.ZodString>;
    source: z.ZodString;
    kind: z.ZodEnum<{
        custom: "custom";
        builtin: "builtin";
        global: "global";
    }>;
    directory: z.ZodOptional<z.ZodString>;
    enabled: z.ZodBoolean;
    toggleable: z.ZodBoolean;
}, z.core.$strip>;
export type SkillView = z.infer<typeof skillViewSchema>;
/** The full page view. */
export declare const agentSkillsViewSchema: z.ZodObject<{
    dirs: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        kind: z.ZodEnum<{
            custom: "custom";
            builtin: "builtin";
        }>;
        exists: z.ZodBoolean;
        enabled: z.ZodBoolean;
        skillCount: z.ZodNumber;
        tag: z.ZodEnum<{
            builtin: "builtin";
            user: "user";
        }>;
        auto: z.ZodOptional<z.ZodBoolean>;
        skills: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    skills: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        whenToUse: z.ZodOptional<z.ZodString>;
        source: z.ZodString;
        kind: z.ZodEnum<{
            custom: "custom";
            builtin: "builtin";
            global: "global";
        }>;
        directory: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        toggleable: z.ZodBoolean;
    }, z.core.$strip>>;
    counts: z.ZodObject<{
        total: z.ZodNumber;
        custom: z.ZodNumber;
        global: z.ZodNumber;
        builtin: z.ZodNumber;
    }, z.core.$strip>;
    validDirs: z.ZodNumber;
    missingDirs: z.ZodNumber;
}, z.core.$strip>;
export type AgentSkillsView = z.infer<typeof agentSkillsViewSchema>;
/** Whether the plugin provider is mounted in DSH's shipped Agent presets. */
export declare const presetTakeoverStatusSchema: z.ZodObject<{
    available: z.ZodBoolean;
    enabled: z.ZodBoolean;
    configured: z.ZodNumber;
    total: z.ZodNumber;
    boot: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PresetTakeoverStatus = z.infer<typeof presetTakeoverStatusSchema>;
/** A restart request accepted by the host. */
export declare const restartResultSchema: z.ZodObject<{
    scheduled: z.ZodLiteral<true>;
}, z.core.$strip>;
export type RestartResult = z.infer<typeof restartResultSchema>;
/** Input for toggling one skill. */
export declare const toggleSkillInputSchema: z.ZodObject<{
    name: z.ZodString;
    enabled: z.ZodBoolean;
}, z.core.$strip>;
export type ToggleSkillInput = z.infer<typeof toggleSkillInputSchema>;
/** Input for toggling one scan directory. */
export declare const toggleDirInputSchema: z.ZodObject<{
    path: z.ZodString;
    enabled: z.ZodBoolean;
}, z.core.$strip>;
export type ToggleDirInput = z.infer<typeof toggleDirInputSchema>;
/** Input for adding a custom scan directory. */
export declare const addDirInputSchema: z.ZodObject<{
    path: z.ZodString;
}, z.core.$strip>;
export type AddDirInput = z.infer<typeof addDirInputSchema>;
/** Input for removing a custom scan directory. */
export declare const removeDirInputSchema: z.ZodObject<{
    path: z.ZodString;
}, z.core.$strip>;
export type RemoveDirInput = z.infer<typeof removeDirInputSchema>;
