import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  disablePresetTakeover,
  enablePresetTakeover,
  inspectPresetTakeover,
  resolveDshPackageRoot
} from "./lib/preset-manager.js";

const scratch = mkdtempSync(join(tmpdir(), "dsh-agent-skills-preset-"));
try {
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
    assert.equal((text.match(/- id: skill-filesystem/g) ?? []).length, 1);
    assert.doesNotMatch(text, /- id: agent-skills/);
    assert.match(text, /name: @deepseek-ai\/dsh-skill-filesystem/);
  }

  enablePresetTakeover({ dshRoot: scratch });
  assert.equal(inspectPresetTakeover({ dshRoot: scratch }).enabled, true);

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
