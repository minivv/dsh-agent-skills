// Isolation test: exercise the preset provider's list()/get() against a fake
// registry (empty layers) and a real state file + custom skill directory.
import { createAgentSkillsProvider } from "./lib/provider.js";
import { readState, writeState } from "./lib/store.js";

process.env.DSH_HOME = "/tmp/dsh-test-home2";
process.env.DSH_AGENTS_HOME = "/tmp/nonexistent-agents";

const emptyLayer = { providers: { get: () => undefined, values: () => [][Symbol.iterator]() }, runtime: new Map() };
const fakeSkills = { layers: { global: emptyLayer, scoped: new Map() } };
const ctx = {
  skills: fakeSkills,
  logger: { warn: (m) => console.log("WARN:", m) }
};

const control = { signal: new AbortController().signal, invalidate: () => {} };
const provider = createAgentSkillsProvider(ctx, control);

const state = await readState();
console.log("state:", JSON.stringify(state));

const obs = await provider.list({});
console.log("complete:", obs.complete);
console.log("candidates:", obs.candidates.map((c) => c.name + " @" + c.rank + " src=" + c.source + " inv=" + JSON.stringify(c.invocation)));

// get() should load the body via the custom path
for (const c of obs.candidates) {
  const def = await provider.get(c, {});
  console.log("get", c.name, "->", def?.name, "| content head:", def?.content?.slice(0, 30));
}
