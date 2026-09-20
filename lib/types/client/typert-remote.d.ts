/** Remote contribution consumed by `ctx.remote.$mount(...)`. */
export declare const TYPERT_REMOTE: {
    readonly package: "dsh-agent-skills";
    readonly descriptors: import("../descriptors.js").WireDescriptor[];
};
/** Result envelope of every remote method. */
export type RemoteResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: {
        message: string;
    };
};
/** The client-side `agentSkills` remote API. */
export interface AgentSkillsApi {
    list(): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
    takeoverStatus(): Promise<RemoteResult<import("../schemas.js").PresetTakeoverStatus>>;
    enableTakeover(): Promise<RemoteResult<import("../schemas.js").PresetTakeoverStatus>>;
    disableTakeover(): Promise<RemoteResult<import("../schemas.js").PresetTakeoverStatus>>;
    restartDsh(): Promise<RemoteResult<import("../schemas.js").RestartResult>>;
    toggleSkill(input: import("../schemas.js").ToggleSkillInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
    toggleDir(input: import("../schemas.js").ToggleDirInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
    addDir(input: import("../schemas.js").AddDirInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
    removeDir(input: import("../schemas.js").RemoveDirInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
    rescan(): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
}
