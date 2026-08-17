// Idempotently append the dsh-agent-skills row to the shipped agent preset
// compositions (standard / code) that mount skill-filesystem, so the plugin's
// provider registers into the PRESET layer of the skill registry — the layer
// that wins for agent-visible skills. Without this row the settings page and
// custom directories still work, but per-skill toggles cannot shadow the
// preset's own filesystem provider.
//
// Usage: DSH_INSTALL_ROOT=<dsh package dir> node scripts/install-preset.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dshPkg = process.env.DSH_INSTALL_ROOT;
if (!dshPkg) {
  console.error("DSH_INSTALL_ROOT must point at the @deepseek-ai/dsh package directory (e.g. .../lib/node_modules/@deepseek-ai/dsh)");
  process.exit(1);
}
const presetRoot = join(dshPkg, "config/agent-presets");
if (!existsSync(join(presetRoot, "standard", "agent.cordis.yml"))) {
  console.error("agent-presets root not found under", presetRoot);
  process.exit(1);
}

const ROW = [
  "",
  "# ── dsh-agent-skills ───────────────────────────────────────────────────────",
  "# Registered by dsh-agent-skills: provides per-skill/per-source toggles and",
  "# custom scan directories for THIS preset layer of the skill registry.",
  "- id: agent-skills",
  "  name: dsh-agent-skills/preset",
  ""
].join("\n");

let patched = 0;
for (const id of ["standard", "code"]) {
  const file = join(presetRoot, id, "agent.cordis.yml");
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  const legacy = /\n?# ── dsh-agent-skills ─+\n# Registered by dsh-agent-skills:[\s\S]*?- id: agent-skills\n  name: dsh-agent-skills\n?\s*$/m;
  const current = /\n?# ── dsh-agent-skills ─+\n# Registered by dsh-agent-skills:[\s\S]*?- id: agent-skills\n  name: dsh-agent-skills\/preset\n?\s*$/m;
  if (current.test(text)) {
    console.log("already patched:", file);
    continue;
  }
  const cleaned = text.replace(legacy, "").replace(/\s*$/, "");
  writeFileSync(file, cleaned + ROW);
  patched += 1;
  console.log(legacy.test(text) ? "migrated:" : "patched:", file);
}
if (patched === 0) console.log("no preset needed patching");
