/**
 * Client remote face: installs the `agentSkills` namespace on the client
 * through `ctx.remote.$mount(...)`, mirroring the host TYPERT manifest
 * one-to-one so both directions validate with the same strict codecs.
 *
 * @module dsh-agent-skills/client/typert-remote
 */
import { z } from "zod";
import {
  addDirInputSchema,
  agentSkillsViewSchema,
  presetTakeoverStatusSchema,
  removeDirInputSchema,
  toggleDirInputSchema,
  toggleSkillInputSchema
} from "../schemas.js";

const PKG = "dsh-agent-skills";
const direct = { kind: "direct" } as const;

function jsonCodec(typeSymbol: string, schema: z.ZodType): { mode: "strict"; typeSymbol: string; schema: z.ZodType } {
  return { mode: "strict", typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

function result(typeSymbol: string, schema: z.ZodType): { mode: "strict"; typeSymbol: string; schema: z.ZodType } {
  return { mode: "strict", typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

/** Remote contribution consumed by `ctx.remote.$mount(...)`. */
export const TYPERT_REMOTE = {
  package: PKG,
  descriptors: [
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
} as const;

/** Result envelope of every remote method. */
export type RemoteResult<T> = { ok: true; value: T } | { ok: false; error: { message: string } };

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
