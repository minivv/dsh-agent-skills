import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { createScope } from "@deepseek-ai/dsh-scope";
import { isUserInvocable, SkillRegistry } from "@deepseek-ai/dsh-skill";
import { createAgentSkillsProvider } from "./lib/provider.js";
import { writeState } from "./lib/store.js";
import * as presetEntry from "./lib/preset.js";

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

  // The replaced preset row's own customSkillDirs keep working after takeover:
  // the shipped `cordis` preset points them at @deepseek-ai/dsh-agent-preset.
  const presetDir = join(scratch, "preset-skills");
  mkdirSync(join(presetDir, "cordis-dev"), { recursive: true });
  writeFileSync(
    join(presetDir, "cordis-dev", "SKILL.md"),
    "---\nname: cordis-dev\ndescription: preset-provided skill\n---\n\nBody.\n"
  );
  const presetProvider = createAgentSkillsProvider(
    app,
    { signal: new AbortController().signal, invalidate: () => {} },
    undefined,
    [presetDir]
  );
  const withPreset = await presetProvider.list({});
  assert.ok(
    withPreset.candidates.some((skill) => skill.name === "cordis-dev"),
    "preset customSkillDirs must be scanned by the replacement provider"
  );
  assert.ok(!catalog.some((skill) => skill.name === "cordis-dev"), "extra dirs stay opt-in per provider");

  // The mounted preset row passes that config straight to the entry point.
  const presetScopeKey = {};
  const presetScope = createScope(app, presetScopeKey);
  await presetScope.ctx.plugin(presetEntry, { customSkillDirs: [presetDir] });
  const scopedCatalog = await registry.list({ scope: presetScopeKey });
  assert.ok(
    scopedCatalog.some((skill) => skill.name === "cordis-dev"),
    "the replaced row's config must reach the preset entry point"
  );
  await presetScope.dispose();

  console.log("takeover provider: ok");
} finally {
  await preset?.dispose();
  rmSync(scratch, { recursive: true, force: true });
}
