import type { PresetTakeoverStatus } from "./schemas.js";
export interface PresetManagerOptions {
    /** Explicit package root, primarily for tests and manual recovery. */
    dshRoot?: string;
    /** Override the running CLI entry used for package-root discovery. */
    argvEntry?: string;
}
/** Resolve only verified @deepseek-ai/dsh package roots. */
export declare function resolveDshPackageRoot(options?: PresetManagerOptions): string | undefined;
/** Inspect whether every shipped standard/code preset already mounts the provider. */
export declare function inspectPresetTakeover(options?: PresetManagerOptions): PresetTakeoverStatus;
/** Idempotently mount the preset-only provider in every available shipped preset. */
export declare function enablePresetTakeover(options?: PresetManagerOptions): PresetTakeoverStatus;
