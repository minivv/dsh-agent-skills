// Regression tests for the layering trap behind the DSH issue #4 follow-up.
//
// Upgrading DSH routinely leaves a retired `dsh-agent-presets` copy behind, so
// one tree level can hold the live (`dsh-web-app`) and the retired owner at the
// same time. The live owner has to win: picking whichever is probed first
// rewrites a copy the running CLI never loads while still reporting success.
import assert from "node:assert/strict";
import { dirname } from "node:path";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  disablePresetTakeover,
  enablePresetTakeover,
  inspectPresetTakeover,
  resolveDshPackageRoot
} from "./lib/preset-manager.js";

/** `<node_modules>/@deepseek-ai` — the npm-flat scope next to a level. */
const SCOPE = ["node_modules", "@deepseek-ai"];
/** pnpm's hoisted peer directory, where upgrades leave the retired copy. */
const HOISTED = ["node_modules", ".pnpm", "node_modules", "@deepseek-ai"];
const IDS = ["standard", "ptc"];

/** Current layout: `dsh-web-app/presets/<id>.patch.yml`, DSH >= 0.1.7-rc.2. */
const livePreset = (id) =>
  `- insert:\n    - id: preset-${id}\n      name: '@deepseek-ai/dsh-agent-preset'\n` +
  `      config:\n        id: ${id}\n        plugins:\n` +
  `          - id: skill-filesystem\n            name: '@deepseek-ai/dsh-skill-filesystem'\n`;

/** Retired layout: `dsh-agent-presets/presets/<id>/agent.cordis.yml`. */
const retiredPreset = (id) =>
  `- id: skill-filesystem\n  name: '@deepseek-ai/dsh-skill-filesystem'\n- id: tool-${id}\n  name: example-tool\n`;

function writePackage(dir, name) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name }));
}

/** A `dsh` package with an empty CLI entry; returns the entry path. */
function writeDshPackage(dir) {
  writePackage(dir, "@deepseek-ai/dsh");
  mkdirSync(join(dir, "lib"), { recursive: true });
  const bin = join(dir, "lib", "bin.js");
  writeFileSync(bin, "");
  return bin;
}

/** The live owner holding `ids`; returns the preset files it ships. */
function writeLiveOwner(dir, ids) {
  writePackage(dir, "@deepseek-ai/dsh-web-app");
  mkdirSync(join(dir, "presets"), { recursive: true });
  return ids.map((id) => {
    const file = join(dir, "presets", `${id}.patch.yml`);
    writeFileSync(file, livePreset(id));
    return file;
  });
}

/** The retired owner holding `ids`; returns the preset files it ships. */
function writeRetiredOwner(dir, ids) {
  writePackage(dir, "@deepseek-ai/dsh-agent-presets");
  return ids.map((id) => {
    const file = join(dir, "presets", id, "agent.cordis.yml");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, retiredPreset(id));
    return file;
  });
}

const scratch = mkdtempSync(join(tmpdir(), "dsh-agent-skills-copies-"));
try {
  // ── npm flat layout: both owners hoisted into the same scope ─────────────
  {
    const scope = join(scratch, "flat", ...SCOPE);
    const bin = writeDshPackage(join(scope, "dsh"));
    const live = writeLiveOwner(join(scope, "dsh-web-app"), IDS);
    const retired = writeRetiredOwner(join(scope, "dsh-agent-presets"), ["standard"]);
    const retiredBefore = readFileSync(retired[0], "utf8");

    assert.equal(resolveDshPackageRoot({ argvEntry: bin }), realpathSync(join(scope, "dsh-web-app")));
    assert.deepEqual(enablePresetTakeover({ argvEntry: bin }), {
      available: true,
      enabled: true,
      configured: 2,
      total: 2
    });
    for (const file of live) {
      assert.match(readFileSync(file, "utf8"), /name: dsh-agent-skills\/preset/);
    }
    assert.equal(readFileSync(retired[0], "utf8"), retiredBefore, "the retired copy must stay untouched");
  }

  // ── pnpm layout: the CLI and both owners sit under `.pnpm/node_modules` ──
  // This is the exact shape the reporter reproduced on Windows.
  {
    const root = join(scratch, "pnpm");
    const bin = writeDshPackage(join(root, ...SCOPE, "dsh"));
    const hoisted = join(root, ...HOISTED);
    const live = writeLiveOwner(join(hoisted, "dsh-web-app"), IDS);
    const retired = writeRetiredOwner(join(hoisted, "dsh-agent-presets"), ["standard"]);
    const retiredBefore = readFileSync(retired[0], "utf8");

    assert.equal(resolveDshPackageRoot({ argvEntry: bin }), realpathSync(join(hoisted, "dsh-web-app")));
    assert.deepEqual(inspectPresetTakeover({ argvEntry: bin }), {
      available: true,
      enabled: false,
      configured: 0,
      total: 2
    });
    assert.deepEqual(enablePresetTakeover({ argvEntry: bin }), {
      available: true,
      enabled: true,
      configured: 2,
      total: 2
    });
    assert.equal(readFileSync(retired[0], "utf8"), retiredBefore, "the retired copy must stay untouched");
    // Round-tripping the live owner proves the rewritten files are the loaded ones.
    assert.deepEqual(disablePresetTakeover({ argvEntry: bin }), {
      available: true,
      enabled: false,
      configured: 0,
      total: 2
    });
    for (const file of live) {
      assert.match(readFileSync(file, "utf8"), /name: '@deepseek-ai\/dsh-skill-filesystem'/);
    }
  }

  // ── live owner nested inside the dsh package (real 0.1.7-rc.2 install) ──
  {
    const dsh = join(scratch, "nested", ...SCOPE, "dsh");
    const bin = writeDshPackage(dsh);
    const live = writeLiveOwner(join(dsh, ...SCOPE, "dsh-web-app"), IDS);
    // A retired copy higher up the tree must lose to the closer live owner.
    writeRetiredOwner(join(scratch, "nested", ...HOISTED, "dsh-agent-presets"), IDS);

    assert.equal(resolveDshPackageRoot({ argvEntry: bin }), realpathSync(join(dsh, ...SCOPE, "dsh-web-app")));
    assert.deepEqual(enablePresetTakeover({ argvEntry: bin }), {
      available: true,
      enabled: true,
      configured: 2,
      total: 2
    });
    for (const file of live) {
      assert.match(readFileSync(file, "utf8"), /name: dsh-agent-skills\/preset/);
    }
  }

  // ── a retired owner that is the only one still gets taken over (old DSH) ──
  {
    const root = join(scratch, "retired-only");
    const bin = writeDshPackage(join(root, ...SCOPE, "dsh"));
    const retired = writeRetiredOwner(join(root, ...HOISTED, "dsh-agent-presets"), IDS);

    assert.equal(resolveDshPackageRoot({ argvEntry: bin }), realpathSync(join(root, ...HOISTED, "dsh-agent-presets")));
    assert.deepEqual(enablePresetTakeover({ argvEntry: bin }), {
      available: true,
      enabled: true,
      configured: 2,
      total: 2
    });
    for (const file of retired) {
      const text = readFileSync(file, "utf8");
      assert.match(text, /name: dsh-agent-skills\/preset/);
      assert.match(text, /- id: tool-/);
    }
  }

  console.log("preset copies: ok");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
