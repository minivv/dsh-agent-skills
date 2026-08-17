/**
 * Host TYPERT manifest for the `agentSkills` namespace, discovered
 * automatically by @deepseek-ai/dsh-typert-loader through the `./typert`
 * export. Hand-written in the same shape the typert generator emits; the
 * client mirror lives in src/client/typert-remote.ts.
 *
 * @module dsh-agent-skills/typert
 */
import { z } from "zod";
/** Strict host contribution: `agentSkills/*` endpoints dispatched to ctx.agentSkills. */
export declare const TYPERT: {
    readonly package: "dsh-agent-skills";
    readonly face: "host";
    readonly schemas: readonly [];
    readonly model: {
        readonly services: readonly [{
            readonly tags: readonly [];
            readonly key: "agentSkills";
            readonly exportName: "agentSkills";
            readonly members: readonly [{
                readonly name: "list";
                readonly kind: "method";
                readonly signature: "(): Promise<AgentSkillsView>";
            }, {
                readonly name: "toggleSkill";
                readonly kind: "method";
                readonly signature: "(input: ToggleSkillInput): Promise<AgentSkillsView>";
            }, {
                readonly name: "toggleDir";
                readonly kind: "method";
                readonly signature: "(input: ToggleDirInput): Promise<AgentSkillsView>";
            }, {
                readonly name: "addDir";
                readonly kind: "method";
                readonly signature: "(input: AddDirInput): Promise<AgentSkillsView>";
            }, {
                readonly name: "removeDir";
                readonly kind: "method";
                readonly signature: "(input: RemoveDirInput): Promise<AgentSkillsView>";
            }, {
                readonly name: "rescan";
                readonly kind: "method";
                readonly signature: "(): Promise<AgentSkillsView>";
            }];
            readonly types: readonly [{
                readonly name: "DirView";
                readonly declaration: "export interface DirView { path: string; kind: 'custom' | 'builtin'; exists: boolean; enabled: boolean; skillCount: number; tag: 'user' | 'builtin'; }";
            }, {
                readonly name: "SkillView";
                readonly declaration: "export interface SkillView { name: string; description: string; whenToUse?: string; source: string; kind: 'custom' | 'global' | 'builtin'; directory?: string; enabled: boolean; toggleable: boolean; }";
            }, {
                readonly name: "SkillCounts";
                readonly declaration: "export interface SkillCounts { total: number; custom: number; global: number; builtin: number; }";
            }, {
                readonly name: "AgentSkillsView";
                readonly declaration: "export interface AgentSkillsView { dirs: DirView[]; skills: SkillView[]; counts: SkillCounts; validDirs: number; missingDirs: number; }";
            }, {
                readonly name: "ToggleSkillInput";
                readonly declaration: "export interface ToggleSkillInput { name: string; enabled: boolean; }";
            }, {
                readonly name: "ToggleDirInput";
                readonly declaration: "export interface ToggleDirInput { path: string; enabled: boolean; }";
            }, {
                readonly name: "AddDirInput";
                readonly declaration: "export interface AddDirInput { path: string; }";
            }, {
                readonly name: "RemoveDirInput";
                readonly declaration: "export interface RemoveDirInput { path: string; }";
            }];
        }];
        readonly events: readonly [];
        readonly objects: readonly [];
    };
    readonly invocations: readonly [{
        readonly id: "dsh-agent-skills#agentSkills/list";
        readonly service: "agentSkills";
        readonly namespace: "agentSkills";
        readonly method: "list";
        readonly invocation: {
            readonly kind: "direct";
        };
        readonly parameters: readonly [];
        readonly result: {
            mode: string;
            typeSymbol: string;
            schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
        };
    }, {
        readonly id: "dsh-agent-skills#agentSkills/toggleSkill";
        readonly service: "agentSkills";
        readonly namespace: "agentSkills";
        readonly method: "toggleSkill";
        readonly invocation: {
            readonly kind: "direct";
        };
        readonly parameters: readonly [{
            readonly name: "input";
            readonly wire: "input";
            readonly source: "json";
            readonly codec: {
                mode: string;
                typeSymbol: string;
                schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
            };
        }];
        readonly result: {
            mode: string;
            typeSymbol: string;
            schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
        };
    }, {
        readonly id: "dsh-agent-skills#agentSkills/toggleDir";
        readonly service: "agentSkills";
        readonly namespace: "agentSkills";
        readonly method: "toggleDir";
        readonly invocation: {
            readonly kind: "direct";
        };
        readonly parameters: readonly [{
            readonly name: "input";
            readonly wire: "input";
            readonly source: "json";
            readonly codec: {
                mode: string;
                typeSymbol: string;
                schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
            };
        }];
        readonly result: {
            mode: string;
            typeSymbol: string;
            schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
        };
    }, {
        readonly id: "dsh-agent-skills#agentSkills/addDir";
        readonly service: "agentSkills";
        readonly namespace: "agentSkills";
        readonly method: "addDir";
        readonly invocation: {
            readonly kind: "direct";
        };
        readonly parameters: readonly [{
            readonly name: "input";
            readonly wire: "input";
            readonly source: "json";
            readonly codec: {
                mode: string;
                typeSymbol: string;
                schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
            };
        }];
        readonly result: {
            mode: string;
            typeSymbol: string;
            schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
        };
    }, {
        readonly id: "dsh-agent-skills#agentSkills/removeDir";
        readonly service: "agentSkills";
        readonly namespace: "agentSkills";
        readonly method: "removeDir";
        readonly invocation: {
            readonly kind: "direct";
        };
        readonly parameters: readonly [{
            readonly name: "input";
            readonly wire: "input";
            readonly source: "json";
            readonly codec: {
                mode: string;
                typeSymbol: string;
                schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
            };
        }];
        readonly result: {
            mode: string;
            typeSymbol: string;
            schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
        };
    }, {
        readonly id: "dsh-agent-skills#agentSkills/rescan";
        readonly service: "agentSkills";
        readonly namespace: "agentSkills";
        readonly method: "rescan";
        readonly invocation: {
            readonly kind: "direct";
        };
        readonly parameters: readonly [];
        readonly result: {
            mode: string;
            typeSymbol: string;
            schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
        };
    }];
};
