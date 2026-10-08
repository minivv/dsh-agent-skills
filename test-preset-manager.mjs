import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { load as parseYaml } from "js-yaml";
import {
  disablePresetTakeover,
  enablePresetTakeover,
  inspectPresetTakeover,
  resolveDshPackageRoot
} from "./lib/preset-manager.js";

const scratch = mkdtempSync(join(tmpdir(), "dsh-agent-skills-preset-"));
try {
  // ── legacy layout: <@deepseek-ai/dsh>/config/agent-presets/<id>/ ──────────
  writeFileSync(join(scratch, "package.json"), JSON.stringify({ name: "@deepseek-ai/dsh" }));
  const files = ["standard", "code"].map((id) => {
    const dir = join(scratch, "config", "agent-presets", id);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "agent.cordis.yml");
    writeFileSync(file, `- id: skill-filesystem\n  name: '@deepseek-ai/dsh-skill-filesystem'\n- id: tool-${id}\n  name: example-tool\n`);
    return file;
  });
  const binDir = join(scratch, "lib");
  mkdirSync(binDir);
  const bin = join(binDir, "bin.js");
  writeFileSync(bin, "");

  assert.equal(resolveDshPackageRoot({ argvEntry: bin }), realpathSync(scratch));
  assert.deepEqual(inspectPresetTakeover({ dshRoot: scratch }), {
    available: true,
    enabled: false,
    configured: 0,
    total: 2
  });

  const enabled = enablePresetTakeover({ dshRoot: scratch });
  assert.deepEqual(enabled, { available: true, enabled: true, configured: 2, total: 2 });
  const firstPass = files.map((file) => readFileSync(file, "utf8"));
  for (const text of firstPass) {
    assert.doesNotThrow(() => parseYaml(text));
    assert.equal((text.match(/- id: skill-filesystem/g) ?? []).length, 1);
    assert.doesNotMatch(text, /- id: agent-skills/);
    assert.doesNotMatch(text, /name: ['"]?@deepseek-ai\/dsh-skill-filesystem/);
    assert.match(text, /- id: skill-filesystem\n  name: dsh-agent-skills\/preset/);
  }

  enablePresetTakeover({ dshRoot: scratch });
  assert.deepEqual(files.map((file) => readFileSync(file, "utf8")), firstPass, "repeat enable must be a no-op");

  writeFileSync(
    files[1],
    `- id: skill-filesystem\n  name: '@deepseek-ai/dsh-skill-filesystem'\n# ── dsh-agent-skills ──\n# Registered by dsh-agent-skills: legacy\n- id: agent-skills\n  name: dsh-agent-skills\n`
  );
  assert.equal(inspectPresetTakeover({ dshRoot: scratch }).enabled, false);
  enablePresetTakeover({ dshRoot: scratch });
  const migrated = readFileSync(files[1], "utf8");
  assert.equal((migrated.match(/- id: skill-filesystem/g) ?? []).length, 1);
  assert.doesNotMatch(migrated, /- id: agent-skills/);
  assert.match(migrated, /- id: skill-filesystem\n  name: dsh-agent-skills\/preset/);

  const restored = disablePresetTakeover({ dshRoot: scratch });
  assert.deepEqual(restored, { available: true, enabled: false, configured: 0, total: 2 });
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.doesNotThrow(() => parseYaml(text));
    assert.equal((text.match(/- id: skill-filesystem/g) ?? []).length, 1);
    assert.doesNotMatch(text, /- id: agent-skills/);
    assert.match(text, /name: '@deepseek-ai\/dsh-skill-filesystem'/);
  }

  enablePresetTakeover({ dshRoot: scratch });
  assert.equal(inspectPresetTakeover({ dshRoot: scratch }).enabled, true);

  // ── DSH >= 0.1.7-rc.2: <install>/node_modules/@deepseek-ai/dsh-web-app ───
  // The presets moved out of the retired dsh-agent-presets package into
  // dsh-web-app, flattened to presets/<id>.patch.yml (DSH issue #4).
  const install = mkdtempSync(join(tmpdir(), "dsh-agent-skills-install-"));
  try {
    const dshPkg = join(install, "node_modules", "@deepseek-ai", "dsh");
    const webApp = join(install, "node_modules", "@deepseek-ai", "dsh-web-app");
    mkdirSync(join(dshPkg, "lib"), { recursive: true });
    mkdirSync(join(webApp, "presets"), { recursive: true });
    writeFileSync(join(dshPkg, "package.json"), JSON.stringify({ name: "@deepseek-ai/dsh" }));
    writeFileSync(join(webApp, "package.json"), JSON.stringify({ name: "@deepseek-ai/dsh-web-app" }));
    const bin = join(dshPkg, "lib", "bin.js");
    writeFileSync(bin, "");

    const presetRow = (id, extra = "") =>
      `- insert:\n    - id: preset-${id}\n      name: '@deepseek-ai/dsh-agent-preset'\n` +
      `      config:\n        id: ${id}\n        order: 1\n        plugins:\n` +
      `          - id: skill-filesystem\n            name: '@deepseek-ai/dsh-skill-filesystem'\n${extra}` +
      `          - id: tool-skill\n            name: '@deepseek-ai/dsh-tool-skill'\n`;
    const webFiles = {
      standard: join(webApp, "presets", "standard.patch.yml"),
      ptc: join(webApp, "presets", "ptc.patch.yml"),
      cordis: join(webApp, "presets", "cordis.patch.yml")
    };
    writeFileSync(webFiles.standard, presetRow("standard"));
    writeFileSync(webFiles.ptc, presetRow("ptc"));
    // The cordis preset is the only one whose row carries extra skill dirs.
    const cordisJsExpression = "                - !!js process.getBuiltinModule('node:path').join('x')";
    writeFileSync(
      webFiles.cordis,
      presetRow("cordis", `            config:\n              customSkillDirs:\n${cordisJsExpression}\n`)
    );
    // The minimal preset ships no skill row at all and must stay untouched.
    const minimal = join(webApp, "presets", "minimal.patch.yml");
    writeFileSync(minimal, "- insert:\n    - id: preset-minimal\n      name: '@deepseek-ai/dsh-agent-preset'\n");
    const minimalBefore = readFileSync(minimal, "utf8");

    // Found by walking up from the CLI entry inside the dsh package.
    assert.equal(resolveDshPackageRoot({ argvEntry: bin }), realpathSync(webApp));
    // Also found when DSH_INSTALL_ROOT-style config points at either package.
    assert.equal(resolveDshPackageRoot({ dshRoot: webApp }), realpathSync(webApp));
    assert.equal(resolveDshPackageRoot({ dshRoot: join(webApp, "presets") }), realpathSync(webApp));

    assert.deepEqual(inspectPresetTakeover({ argvEntry: bin }), {
      available: true,
      enabled: false,
      configured: 0,
      total: 3
    });

    const enabledNew = enablePresetTakeover({ argvEntry: bin });
    assert.deepEqual(enabledNew, { available: true, enabled: true, configured: 3, total: 3 });
    for (const id of ["standard", "ptc"]) {
      const text = readFileSync(webFiles[id], "utf8");
      assert.doesNotThrow(() => parseYaml(text));
      assert.match(text, /- id: skill-filesystem\n            name: dsh-agent-skills\/preset/);
      assert.doesNotMatch(text, /@deepseek-ai\/dsh-skill-filesystem/);
    }
    const cordisText = readFileSync(webFiles.cordis, "utf8");
    assert.match(cordisText, /- id: skill-filesystem\n            name: dsh-agent-skills\/preset/);
    assert.ok(cordisText.includes(cordisJsExpression), "customSkillDirs must survive takeover");
    assert.equal(readFileSync(minimal, "utf8"), minimalBefore, "minimal preset must stay untouched");

    // The new layout is idempotent and reversible too.
    enablePresetTakeover({ argvEntry: bin });
    assert.equal(inspectPresetTakeover({ argvEntry: bin }).configured, 3);
    assert.deepEqual(disablePresetTakeover({ argvEntry: bin }), {
      available: true,
      enabled: false,
      configured: 0,
      total: 3
    });
    for (const file of Object.values(webFiles)) {
      assert.match(readFileSync(file, "utf8"), /name: '@deepseek-ai\/dsh-skill-filesystem'/);
    }
  } finally {
    rmSync(install, { recursive: true, force: true });
  }

  const invalid = mkdtempSync(join(tmpdir(), "dsh-agent-skills-invalid-"));
  try {
    assert.deepEqual(inspectPresetTakeover({ dshRoot: invalid, argvEntry: invalid }), {
      available: false,
      enabled: false,
      configured: 0,
      total: 0
    });
    assert.throws(() => enablePresetTakeover({ dshRoot: invalid, argvEntry: invalid }), /未找到 DSH 安装位置/);
  } finally {
    rmSync(invalid, { recursive: true, force: true });
  }

  const unsupported = mkdtempSync(join(tmpdir(), "dsh-agent-skills-unsupported-"));
  try {
    writeFileSync(join(unsupported, "package.json"), JSON.stringify({ name: "@deepseek-ai/dsh" }));
    const dir = join(unsupported, "config", "agent-presets", "standard");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "agent.cordis.yml"), "- id: unrelated\n  name: example\n");
    assert.throws(() => enablePresetTakeover({ dshRoot: unsupported }), /没有可接管的 skill-filesystem provider/);
  } finally {
    rmSync(unsupported, { recursive: true, force: true });
  }

  console.log("preset manager: ok");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
