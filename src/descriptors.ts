/**
 * The `agentSkills` wire-descriptor table, shared by both package faces:
 * `TYPERT.invocations` on the host (src/typert.ts) and
 * `TYPERT_REMOTE.descriptors` on the client (src/client/typert-remote.ts).
 *
 * Keeping one table means the two halves cannot drift: every endpoint, wire
 * field, and strict codec is identical on both sides of the gateway.
 *
 * @module dsh-agent-skills/descriptors
 */
import { z } from "zod";
import {
  addDirInputSchema,
  agentSkillsViewSchema,
  presetTakeoverStatusSchema,
  removeDirInputSchema,
  restartResultSchema,
  toggleDirInputSchema,
  toggleSkillInputSchema
} from "./schemas.js";

/** Owning npm package name; also the typert identity prefix of every endpoint. */
export const PKG = "dsh-agent-skills";

/** The only receiver mode this plugin uses: dispatch to the service method. */
const direct = { kind: "direct" } as const;

/** One strict wire codec as the typert registry/loader expects it. */
export interface StrictCodec {
  mode: "strict";
  typeSymbol: string;
  /** Lazy schema factory every `dsh >= 0.1.6-alpha.2` boundary calls. */
  create: () => z.ZodType;
  /** The same Zod instance as a plain property, for older gateways. */
  schema: z.ZodType;
}

/**
 * Build one strict wire codec.
 *
 * `create` is what the typert loader and registry validate and the gateway
 * then calls as `codec.create().parse(value)`; the materialized schema is
 * cached so repeated boundary calls reuse one instance. `schema` is retained
 * for gateways that read the Zod instance directly.
 */
export function strictCodec(typeSymbol: string, schema: z.ZodType): StrictCodec {
  let materialized: z.ZodType | undefined;
  return {
    mode: "strict",
    typeSymbol: `${PKG}/types#${typeSymbol}`,
    create: () => (materialized ??= schema),
    schema
  };
}

/** One JSON parameter on the wire. */
export interface WireParameter {
  name: string;
  wire: string;
  source: "json";
  codec: StrictCodec;
}

/** One exported endpoint as both the host and the client declare it. */
export interface WireDescriptor {
  id: string;
  service: string;
  namespace: string;
  method: string;
  invocation: typeof direct;
  parameters: WireParameter[];
  result: StrictCodec;
}

/** One endpoint: `id` is globally unique, `method` names the service member. */
function endpoint(
  method: string,
  resultType: string,
  resultSchema: z.ZodType,
  parameters: WireParameter[] = []
): WireDescriptor {
  return {
    id: `${PKG}#agentSkills/${method}`,
    service: "agentSkills",
    namespace: "agentSkills",
    method,
    invocation: direct,
    parameters,
    result: strictCodec(resultType, resultSchema)
  };
}

/** One mutation parameter carrying a JSON input object. */
function input(typeSymbol: string, schema: z.ZodType): WireParameter[] {
  return [{ name: "input", wire: "input", source: "json", codec: strictCodec(typeSymbol, schema) }];
}

/**
 * Build the full descriptor table. A fresh array/object graph per call keeps
 * the two faces independently ownable while their contents stay identical.
 */
export function buildDescriptors(): WireDescriptor[] {
  return [
    endpoint("list", "AgentSkillsView", agentSkillsViewSchema),
    endpoint("takeoverStatus", "PresetTakeoverStatus", presetTakeoverStatusSchema),
    endpoint("enableTakeover", "PresetTakeoverStatus", presetTakeoverStatusSchema),
    endpoint("disableTakeover", "PresetTakeoverStatus", presetTakeoverStatusSchema),
    endpoint("restartDsh", "RestartResult", restartResultSchema),
    endpoint("toggleSkill", "AgentSkillsView", agentSkillsViewSchema, input("ToggleSkillInput", toggleSkillInputSchema)),
    endpoint("toggleDir", "AgentSkillsView", agentSkillsViewSchema, input("ToggleDirInput", toggleDirInputSchema)),
    endpoint("addDir", "AgentSkillsView", agentSkillsViewSchema, input("AddDirInput", addDirInputSchema)),
    endpoint("removeDir", "AgentSkillsView", agentSkillsViewSchema, input("RemoveDirInput", removeDirInputSchema)),
    endpoint("rescan", "AgentSkillsView", agentSkillsViewSchema)
  ];
}
