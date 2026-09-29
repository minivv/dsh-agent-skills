/**
 * Client plugin body: injects the page styles, registers the `agent-skills`
 * locale dictionaries, mounts the `agentSkills` remote namespace, then
 * registers the Agent Skills page into the `settings.section` slot (设置 →
 * Agent Skills).
 *
 * @module dsh-agent-skills/client
 */
import type { Context as ClientContext } from "@deepseek-ai/cordis";
import "./types.js";
/** Services required before this plugin mounts. */
export declare const inject: string[];
/** Mount the browser half. */
export declare function apply(ctx: ClientContext): Promise<void>;
