import { addDirInputSchema, agentSkillsViewSchema, presetTakeoverStatusSchema, removeDirInputSchema, restartResultSchema, toggleDirInputSchema, toggleSkillInputSchema } from "./schemas.js";
/** Owning npm package name; also the typert identity prefix of every endpoint. */
export const PKG = "dsh-agent-skills";
/** The only receiver mode this plugin uses: dispatch to the service method. */
const direct = { kind: "direct" };
/**
 * Build one strict wire codec.
 *
 * `create` is what the typert loader and registry validate and the gateway
 * then calls as `codec.create().parse(value)`; the materialized schema is
 * cached so repeated boundary calls reuse one instance. `schema` is retained
 * for gateways that read the Zod instance directly.
 */
export function strictCodec(typeSymbol, schema) {
    let materialized;
    return {
        mode: "strict",
        typeSymbol: `${PKG}/types#${typeSymbol}`,
        create: () => (materialized ??= schema),
        schema
    };
}
/** One endpoint: `id` is globally unique, `method` names the service member. */
function endpoint(method, resultType, resultSchema, parameters = []) {
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
function input(typeSymbol, schema) {
    return [{ name: "input", wire: "input", source: "json", codec: strictCodec(typeSymbol, schema) }];
}
/**
 * Build the full descriptor table. A fresh array/object graph per call keeps
 * the two faces independently ownable while their contents stay identical.
 */
export function buildDescriptors() {
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
//# sourceMappingURL=descriptors.js.map