/**
 * Client plugin body: injects the page styles, registers the `agent-skills`
 * locale dictionaries, mounts the `agentSkills` remote namespace, then
 * registers the Agent Skills page into the `settings.section` slot (设置 →
 * Agent Skills).
 *
 * @module dsh-agent-skills/client
 */
// The browser context type is cordis' own `Context`: `dsh-client-runtime`
// stopped shipping after 0.1.1-rc.2, and the 0.2 client packages type their
// root context as `@deepseek-ai/cordis`.
import type { Context as ClientContext } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-client-ui-slots";
// `ctx.slots` (the SlotRegistry service merge) is declared by ui-renderer in
// the 0.2 client packages.
import type {} from "@deepseek-ai/dsh-client-ui-renderer/client";
import type {} from "@deepseek-ai/dsh-client-ui-settings/client";
import type {} from "@deepseek-ai/dsh-client-locale/client";
import "./types.js";
import { en, zh } from "./locales.js";
import { AgentSkillsSection } from "./AgentSkillsSection.js";
import { injectStyles, removeStyles } from "./styles.js";
import { TYPERT_REMOTE } from "./typert-remote.js";

/** Dictionary namespace owned by this plugin (settings page copy). */
const NS = "agent-skills";

/** Services required before this plugin mounts. */
export const inject = ["slots", "remote", "locale"];

/** Mount the browser half. */
export async function apply(ctx: ClientContext): Promise<void> {
  const style = injectStyles();
  ctx.effect(() => () => {
    style.remove();
    removeStyles();
  }, "agent-skills: styles");
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "agent-skills: dictionaries");
  await ctx.remote.$mount(TYPERT_REMOTE);
  // Stable per-namespace translate; reads the active locale at call time, so
  // the label thunk below follows language switches without re-registration.
  const t = ctx.locale.bind(NS);
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "agent-skills",
    order: 25,
    label: () => t("nav"),
    locale: NS,
    inject: () => ({
      api: ctx.get("remote.agentSkills")
    })
  }, AgentSkillsSection));
}
