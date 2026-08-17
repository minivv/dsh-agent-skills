import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
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
    writeFileSync(file, `- id: filesystem-${id}\n  name: @deepseek-ai/dsh-skill-filesystem\n`);
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
    assert.equal((text.match(/- id: agent-skills/g) ?? []).length, 1);
    assert.match(text, /name: dsh-agent-skills\/preset/);
  }

  enablePresetTakeover({ dshRoot: scratch });
  assert.deepEqual(files.map((file) => readFileSync(file, "utf8")), firstPass, "repeat enable must be a no-op");

  writeFileSync(
    files[1],
    `${firstPass[1].replace(/\n?# ── dsh-agent-skills[\s\S]*$/, "")}\n# ── dsh-agent-skills ──\n# Registered by dsh-agent-skills: legacy\n- id: agent-skills\n  name: dsh-agent-skills\n`
  );
  assert.equal(inspectPresetTakeover({ dshRoot: scratch }).enabled, false);
  enablePresetTakeover({ dshRoot: scratch });
  const migrated = readFileSync(files[1], "utf8");
  assert.equal((migrated.match(/- id: agent-skills/g) ?? []).length, 1);
  assert.match(migrated, /name: dsh-agent-skills\/preset/);

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

  console.log("preset manager: ok");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
