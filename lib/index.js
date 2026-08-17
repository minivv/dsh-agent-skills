import { scopeOf } from "@deepseek-ai/dsh-scope";
import { AgentSkillsRuntime } from "./runtime.js";
import { createAgentSkillsProvider } from "./provider.js";
/** Stable cordis plugin name. */
export const name = "agent-skills";
/** The skill registry is required in both planes. */
export const inject = ["skills"];
/**
 * Mount the plugin. Both planes register the skill provider:
 *   - the HOST row registers into the global layer (covers host-level
 *     compositions such as the headless profile, where skill-filesystem is a
 *     host row);
 *   - a PRESET row registers into its preset layer, which outranks the
 *     global layer for agent-visible skills (the web profile's arrangement).
 * The host row additionally provides the settings-page service and the
 * `agentSkills` typert namespace.
 */
export async function apply(ctx) {
    const scope = scopeOf(ctx);
    ctx.skills.registerProvider((control) => createAgentSkillsProvider(ctx, control));
    if (scope === undefined) {
        // Host plane: settings-page service + typert namespace.
        new AgentSkillsRuntime(ctx);
    }
}
//# sourceMappingURL=index.js.map