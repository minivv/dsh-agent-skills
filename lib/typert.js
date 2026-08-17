import { addDirInputSchema, agentSkillsViewSchema, presetTakeoverStatusSchema, removeDirInputSchema, toggleDirInputSchema, toggleSkillInputSchema } from "./schemas.js";
const PKG = "dsh-agent-skills";
const direct = { kind: "direct" };
function jsonCodec(typeSymbol, schema) {
    return { mode: "strict", typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}
function result(typeSymbol, schema) {
    return { mode: "strict", typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}
/** Strict host contribution: `agentSkills/*` endpoints dispatched to ctx.agentSkills. */
export const TYPERT = {
    package: PKG,
    face: "host",
    schemas: [],
    model: {
        services: [
            {
                tags: [],
                key: "agentSkills",
                exportName: "agentSkills",
                members: [
                    { name: "list", kind: "method", signature: "(): Promise<AgentSkillsView>" },
                    { name: "takeoverStatus", kind: "method", signature: "(): Promise<PresetTakeoverStatus>" },
                    { name: "enableTakeover", kind: "method", signature: "(): Promise<PresetTakeoverStatus>" },
                    { name: "toggleSkill", kind: "method", signature: "(input: ToggleSkillInput): Promise<AgentSkillsView>" },
                    { name: "toggleDir", kind: "method", signature: "(input: ToggleDirInput): Promise<AgentSkillsView>" },
                    { name: "addDir", kind: "method", signature: "(input: AddDirInput): Promise<AgentSkillsView>" },
                    { name: "removeDir", kind: "method", signature: "(input: RemoveDirInput): Promise<AgentSkillsView>" },
                    { name: "rescan", kind: "method", signature: "(): Promise<AgentSkillsView>" }
                ],
                types: [
                    {
                        name: "DirView",
                        declaration: "export interface DirView { path: string; kind: 'custom' | 'builtin'; exists: boolean; enabled: boolean; skillCount: number; tag: 'user' | 'builtin'; }"
                    },
                    {
                        name: "SkillView",
                        declaration: "export interface SkillView { name: string; description: string; whenToUse?: string; source: string; kind: 'custom' | 'global' | 'builtin'; directory?: string; enabled: boolean; toggleable: boolean; }"
                    },
                    {
                        name: "SkillCounts",
                        declaration: "export interface SkillCounts { total: number; custom: number; global: number; builtin: number; }"
                    },
                    {
                        name: "AgentSkillsView",
                        declaration: "export interface AgentSkillsView { dirs: DirView[]; skills: SkillView[]; counts: SkillCounts; validDirs: number; missingDirs: number; }"
                    },
                    {
                        name: "PresetTakeoverStatus",
                        declaration: "export interface PresetTakeoverStatus { available: boolean; enabled: boolean; configured: number; total: number; }"
                    },
                    {
                        name: "ToggleSkillInput",
                        declaration: "export interface ToggleSkillInput { name: string; enabled: boolean; }"
                    },
                    {
                        name: "ToggleDirInput",
                        declaration: "export interface ToggleDirInput { path: string; enabled: boolean; }"
                    },
                    {
                        name: "AddDirInput",
                        declaration: "export interface AddDirInput { path: string; }"
                    },
                    {
                        name: "RemoveDirInput",
                        declaration: "export interface RemoveDirInput { path: string; }"
                    }
                ]
            }
        ],
        events: [],
        objects: []
    },
    invocations: [
        {
            id: `${PKG}#agentSkills/list`,
            service: "agentSkills",
            namespace: "agentSkills",
            method: "list",
            invocation: direct,
            parameters: [],
            result: result("AgentSkillsView", agentSkillsViewSchema)
        },
        {
            id: `${PKG}#agentSkills/takeoverStatus`,
            service: "agentSkills",
            namespace: "agentSkills",
            method: "takeoverStatus",
            invocation: direct,
            parameters: [],
            result: result("PresetTakeoverStatus", presetTakeoverStatusSchema)
        },
        {
            id: `${PKG}#agentSkills/enableTakeover`,
            service: "agentSkills",
            namespace: "agentSkills",
            method: "enableTakeover",
            invocation: direct,
            parameters: [],
            result: result("PresetTakeoverStatus", presetTakeoverStatusSchema)
        },
        {
            id: `${PKG}#agentSkills/toggleSkill`,
            service: "agentSkills",
            namespace: "agentSkills",
            method: "toggleSkill",
            invocation: direct,
            parameters: [
                {
                    name: "input",
                    wire: "input",
                    source: "json",
                    codec: jsonCodec("ToggleSkillInput", toggleSkillInputSchema)
                }
            ],
            result: result("AgentSkillsView", agentSkillsViewSchema)
        },
        {
            id: `${PKG}#agentSkills/toggleDir`,
            service: "agentSkills",
            namespace: "agentSkills",
            method: "toggleDir",
            invocation: direct,
            parameters: [
                {
                    name: "input",
                    wire: "input",
                    source: "json",
                    codec: jsonCodec("ToggleDirInput", toggleDirInputSchema)
                }
            ],
            result: result("AgentSkillsView", agentSkillsViewSchema)
        },
        {
            id: `${PKG}#agentSkills/addDir`,
            service: "agentSkills",
            namespace: "agentSkills",
            method: "addDir",
            invocation: direct,
            parameters: [
                {
                    name: "input",
                    wire: "input",
                    source: "json",
                    codec: jsonCodec("AddDirInput", addDirInputSchema)
                }
            ],
            result: result("AgentSkillsView", agentSkillsViewSchema)
        },
        {
            id: `${PKG}#agentSkills/removeDir`,
            service: "agentSkills",
            namespace: "agentSkills",
            method: "removeDir",
            invocation: direct,
            parameters: [
                {
                    name: "input",
                    wire: "input",
                    source: "json",
                    codec: jsonCodec("RemoveDirInput", removeDirInputSchema)
                }
            ],
            result: result("AgentSkillsView", agentSkillsViewSchema)
        },
        {
            id: `${PKG}#agentSkills/rescan`,
            service: "agentSkills",
            namespace: "agentSkills",
            method: "rescan",
            invocation: direct,
            parameters: [],
            result: result("AgentSkillsView", agentSkillsViewSchema)
        }
    ]
};
//# sourceMappingURL=typert.js.map