// Preset-layer simulation: build a REAL SkillRegistry, register a scoped
// "filesystem-like" provider (as the agent preset does), then register THIS
// plugin's provider into the same scoped layer and verify:
//   1. the scoped (preset) layer outranks the global layer;
//   2. my provider's copies win per-name dedupe and carry the toggle policy;
//   3. get() delegates to the original provider.
import { Context } from "@deepseek-ai/cordis";
import { createScope } from "@deepseek-ai/dsh-scope";
import { SkillRegistry } from "@deepseek-ai/dsh-skill";
import { createAgentSkillsProvider } from "./lib/provider.js";
import { writeState } from "./lib/store.js";

process.env.DSH_HOME = "/tmp/dsh-test-home2";
process.env.DSH_AGENTS_HOME = "/tmp/nonexistent-agents";

const app = new Context();
app.plugin((ctx) => {
  new SkillRegistry(ctx);
});
await app.start();

const registry = app.skills;
const scoped = createScope(app, Symbol("preset"));
const presetCtx = scoped.ctx;

// Fake filesystem provider registered in the PRESET layer (like the preset's
// skill-filesystem row).
presetCtx.skills.registerProvider(() => ({
  name: "filesystem",
  async list() {
    return [
      { name: "alpha", description: "alpha skill", source: "user-agents", provider: "filesystem", rank: 500, invocation: { modelInvocable: true, userInvocable: true }, locator: { path: "/tmp/x/alpha/SKILL.md", directory: "/tmp/x/alpha" } },
      { name: "beta", description: "beta skill", source: "user-agents", provider: "filesystem", rank: 500, invocation: { modelInvocable: true, userInvocable: true }, locator: { path: "/tmp/x/beta/SKILL.md", directory: "/tmp/x/beta" } }
    ];
  },
  async get(candidate) {
    return { name: candidate.name, description: candidate.description, source: candidate.source, provider: "filesystem", content: "BODY:" + candidate.name, invocation: { modelInvocable: true, userInvocable: true } };
  }
}));

// The plugin's provider into the SAME preset layer (the patched preset row).
presetCtx.skills.registerProvider((control) => createAgentSkillsProvider(presetCtx, control));

// Global-layer provider (mimics a global contributor that must LOSE to preset).
app.skills.registerProvider(() => ({
  name: "globalish",
  async list() {
    return [
      { name: "alpha", description: "alpha global", source: "bundled", provider: "globalish", rank: 600, invocation: { modelInvocable: true, userInvocable: true }, locator: {} }
    ];
  },
  async get(candidate) {
    return { name: candidate.name, description: candidate.description, source: candidate.source, provider: "globalish", content: "GLOBAL", invocation: { modelInvocable: true, userInvocable: true } };
  }
}));

// State: disable "alpha" (custom dir list empty).
await writeState({ version: 1, dirs: [], disabledSkills: ["alpha"], disabledDirs: [] });

const view = await registry.list({ scope: app }); // unscoped view — hmm, scope must be the agent-ish key
const all = await registry.list({});
console.log("global view:", all.map((s) => s.name + ":" + s.provider).join(", "));

// get alpha through the registry: must come from the preset-layer provider and be disabled
const alpha = all.find((s) => s.name === "alpha");
console.log("alpha invocation:", JSON.stringify(alpha?.invocation));
const def = await registry.get("alpha", {});
console.log("alpha body:", def?.content);

// now disable "beta" too and re-list
await writeState({ version: 1, dirs: [], disabledSkills: ["alpha", "beta"], disabledDirs: [] });
registry.invalidateCache();
const view2 = await registry.list({});
console.log("after beta disable:", view2.map((s) => s.name + ":" + JSON.stringify(s.invocation)).join(", "));

await app.stop();
