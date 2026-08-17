// Restore the official skill-filesystem provider and remove legacy rows.
import { disablePresetTakeover } from "../lib/preset-manager.js";

const dshPkg = process.env.DSH_INSTALL_ROOT;
if (!dshPkg) {
  console.error("DSH_INSTALL_ROOT must point at the @deepseek-ai/dsh package directory");
  process.exit(1);
}

try {
  const status = disablePresetTakeover({ dshRoot: dshPkg });
  console.log(`restored official skill-filesystem provider in ${status.total} presets`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
