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
                readonly name: "takeoverStatus";
                readonly kind: "method";
                readonly signature: "(): Promise<PresetTakeoverStatus>";
            }, {
                readonly name: "enableTakeover";
                readonly kind: "method";
                readonly signature: "(): Promise<PresetTakeoverStatus>";
            }, {
                readonly name: "disableTakeover";
                readonly kind: "method";
                readonly signature: "(): Promise<PresetTakeoverStatus>";
            }, {
                readonly name: "restartDsh";
                readonly kind: "method";
                readonly signature: "(): Promise<RestartResult>";
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
                readonly name: "PresetTakeoverStatus";
                readonly declaration: "export interface PresetTakeoverStatus { available: boolean; enabled: boolean; configured: number; total: number; boot?: string; }";
            }, {
                readonly name: "RestartResult";
                readonly declaration: "export interface RestartResult { scheduled: true; }";
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
    readonly invocations: import("./descriptors.js").WireDescriptor[];
};
