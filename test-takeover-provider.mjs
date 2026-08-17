import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { createScope } from "@deepseek-ai/dsh-scope";
import { isUserInvocable, SkillRegistry } from "@deepseek-ai/dsh-skill";
import { createAgentSkillsProvider } from "./lib/provider.js";
import { writeState } from "./lib/store.js";

const scratch = mkdtempSync(join(tmpdir(), "dsh-agent-skills-takeover-"));
const dshHome = join(scratch, "dsh-home");
const agentsHome = join(scratch, "agents-home");
const skillsRoot = join(agentsHome, "skills");
process.env.DSH_HOME = dshHome;
process.env.DSH_AGENTS_HOME = agentsHome;

function createSkill(name, description) {
  const dir = join(skillsRoot, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: ${description}\n---\n\nTest body for ${name}.\n`);
}

const app = new Context();
let preset;
let registry;
try {
  createSkill("pdf", "PDF test skill");
  createSkill("alpha", "Enabled test skill");
  await writeState({ version: 1, dirs: [], disabledSkills: ["pdf"], disabledDirs: [] }, dshHome);

  await app.plugin((ctx) => {
    registry = new SkillRegistry(ctx);
  });

  const scopeKey = {};
  preset = createScope(app, scopeKey);
  await preset.ctx.plugin({
    inject: ["skills"],
    apply(ctx) {
      ctx.skills.registerProvider((control) => createAgentSkillsProvider(ctx, control));
    }
  });

  assert.ok(registry);
  const catalog = await registry.list({ scope: scopeKey });
  const pdf = catalog.find((skill) => skill.name === "pdf");
  const alpha = catalog.find((skill) => skill.name === "alpha");
  assert.equal(pdf?.invocation.userInvocable, false);
  assert.equal(pdf?.invocation.modelInvocable, false);
  assert.equal(alpha?.invocation.userInvocable, true);
  const userInvocable = catalog.filter(isUserInvocable).map((skill) => skill.name);
  assert.ok(userInvocable.includes("alpha"));
  assert.ok(!userInvocable.includes("pdf"));

  console.log("takeover provider: ok");
} finally {
  await preset?.dispose();
  rmSync(scratch, { recursive: true, force: true });
}
