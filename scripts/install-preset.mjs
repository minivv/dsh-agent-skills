// Replace the shipped skill-filesystem provider with dsh-agent-skills.
// Usage: DSH_INSTALL_ROOT=<dsh package dir> node scripts/install-preset.mjs
import { enablePresetTakeover } from "../lib/preset-manager.js";

const dshPkg = process.env.DSH_INSTALL_ROOT;
if (!dshPkg) {
  console.error("DSH_INSTALL_ROOT must point at the @deepseek-ai/dsh package directory");
  process.exit(1);
}

try {
  const status = enablePresetTakeover({ dshRoot: dshPkg });
  console.log(`dsh-agent-skills now controls ${status.configured}/${status.total} presets`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
