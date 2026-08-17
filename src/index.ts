/**
 * dsh-agent-skills — host entry.
 *
 * The same package is mounted in two planes:
 *
 * 1. HOST row (web profile bundle, id `agent-skills`): the settings-page
 *    service. It owns the durable store (custom scan dirs + toggles), exposes
 *    the `agentSkills` typert namespace for the browser half, and publishes
 *    catalog invalidations so toggles reach the model on the next agent step.
 *
 * 2. PRESET row (replaces the shipped `skill-filesystem` provider through
 *    scripts/install-preset.mjs): registers the `agent-skills` provider into
 *    the preset layer of the skill registry, where it re-emits every
 *    candidate with the user's enable/disable policy and scans the custom
 *    directories. The preset layer outranks the global layer, which is what
 *    makes the toggles authoritative for built-in filesystem skills.
 *
 * @module dsh-agent-skills
 */
import type { Context } from "@deepseek-ai/cordis";
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
 *   - the PRESET row replaces the official filesystem provider in its preset
 *     layer, while still scanning the same built-in roots itself.
 * The host row additionally provides the settings-page service and the
 * `agentSkills` typert namespace.
 */
export async function apply(ctx: Context): Promise<void> {
  const scope = scopeOf(ctx);
  ctx.skills.registerProvider((control) => createAgentSkillsProvider(ctx, control));
  if (scope === undefined) {
    // Host plane: settings-page service + typert namespace.
    new AgentSkillsRuntime(ctx);
  }
}
