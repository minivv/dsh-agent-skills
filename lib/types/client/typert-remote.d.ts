/**
 * Client remote face: installs the `agentSkills` namespace on the client
 * through `ctx.remote.$mount(...)`, mirroring the host TYPERT manifest
 * one-to-one so both directions validate with the same strict codecs.
 *
 * @module dsh-agent-skills/client/typert-remote
 */
import { z } from "zod";
/** Remote contribution consumed by `ctx.remote.$mount(...)`. */
export declare const TYPERT_REMOTE: {
    readonly package: "dsh-agent-skills";
    readonly descriptors: readonly [{
        readonly id: "dsh-agent-skills#agentSkills/list";
        readonly service: "agentSkills";
        readonly namespace: "agentSkills";
        readonly method: "list";
        readonly invocation: {
            readonly kind: "direct";
        };
        readonly parameters: readonly [];
        readonly result: {
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodType;
        };
    }, {
        readonly id: "dsh-agent-skills#agentSkills/takeoverStatus";
        readonly service: "agentSkills";
        readonly namespace: "agentSkills";
        readonly method: "takeoverStatus";
        readonly invocation: {
            readonly kind: "direct";
        };
        readonly parameters: readonly [];
        readonly result: {
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodType;
        };
    }, {
        readonly id: "dsh-agent-skills#agentSkills/enableTakeover";
        readonly service: "agentSkills";
        readonly namespace: "agentSkills";
        readonly method: "enableTakeover";
        readonly invocation: {
            readonly kind: "direct";
        };
        readonly parameters: readonly [];
        readonly result: {
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodType;
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
                mode: "strict";
                typeSymbol: string;
                schema: z.ZodType;
            };
        }];
        readonly result: {
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodType;
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
                mode: "strict";
                typeSymbol: string;
                schema: z.ZodType;
            };
        }];
        readonly result: {
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodType;
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
                mode: "strict";
                typeSymbol: string;
                schema: z.ZodType;
            };
        }];
        readonly result: {
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodType;
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
                mode: "strict";
                typeSymbol: string;
                schema: z.ZodType;
            };
        }];
        readonly result: {
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodType;
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
            mode: "strict";
            typeSymbol: string;
            schema: z.ZodType;
        };
    }];
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
    toggleSkill(input: import("../schemas.js").ToggleSkillInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
    toggleDir(input: import("../schemas.js").ToggleDirInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
    addDir(input: import("../schemas.js").AddDirInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
    removeDir(input: import("../schemas.js").RemoveDirInput): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
    rescan(): Promise<RemoteResult<import("../schemas.js").AgentSkillsView>>;
}
