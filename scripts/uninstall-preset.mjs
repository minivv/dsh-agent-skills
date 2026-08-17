// Remove only the block previously installed by dsh-agent-skills.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dshPkg = process.env.DSH_INSTALL_ROOT;
if (!dshPkg) {
  console.error("DSH_INSTALL_ROOT must point at the @deepseek-ai/dsh package directory");
  process.exit(1);
}
const presetRoot = join(dshPkg, "config/agent-presets");
let removed = 0;
for (const id of ["standard", "code"]) {
  const file = join(presetRoot, id, "agent.cordis.yml");
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  const block = /\n?# ── dsh-agent-skills ─+\n# Registered by dsh-agent-skills:[\s\S]*?- id: agent-skills\n  name: dsh-agent-skills(?:\/preset)?\n?\s*$/m;
  if (!block.test(text)) continue;
  writeFileSync(file, text.replace(block, "").replace(/\s*$/, "\n"));
  removed += 1;
  console.log("removed:", file);
}
if (removed === 0) console.log("no dsh-agent-skills preset rows found");
