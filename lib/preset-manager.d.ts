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
/** Idempotently replace the shipped filesystem provider in every supported preset. */
export declare function enablePresetTakeover(options?: PresetManagerOptions): PresetTakeoverStatus;
/** Restore the official filesystem provider and remove legacy appended rows. */
export declare function disablePresetTakeover(options?: PresetManagerOptions): PresetTakeoverStatus;
