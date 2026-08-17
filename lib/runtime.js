var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
/**
 * Host typert service backing the Agent Skills settings page. Every mutating
 * method persists the new state, invalidates the skill registry so the next
 * agent step republishes the model catalog, and returns the fresh page view.
 *
 * @module dsh-agent-skills/runtime
 */
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { readState, writeState } from "./store.js";
import { buildView, ensureDiscovered, canonicalizeDir } from "./views.js";
import { invalidateSkillCache } from "./registry.js";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
/** Strip undefined recursively so the strict wire codec always passes. */
function jsonSafe(value) {
    if (Array.isArray(value))
        return value.map((entry) => jsonSafe(entry));
    if (typeof value === "object" && value !== null) {
        const out = {};
        for (const [key, entry] of Object.entries(value)) {
            if (entry !== undefined)
                out[key] = jsonSafe(entry);
        }
        return out;
    }
    return value;
}
/** The host service behind the `agentSkills` typert namespace. */
let AgentSkillsRuntime = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    let _toggleSkill_decorators;
    let _toggleDir_decorators;
    let _addDir_decorators;
    let _removeDir_decorators;
    let _rescan_decorators;
    return class AgentSkillsRuntime extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _list_decorators = [Remote];
            _toggleSkill_decorators = [Remote];
            _toggleDir_decorators = [Remote];
            _addDir_decorators = [Remote];
            _removeDir_decorators = [Remote];
            _rescan_decorators = [Remote];
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _toggleSkill_decorators, { kind: "method", name: "toggleSkill", static: false, private: false, access: { has: obj => "toggleSkill" in obj, get: obj => obj.toggleSkill }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _toggleDir_decorators, { kind: "method", name: "toggleDir", static: false, private: false, access: { has: obj => "toggleDir" in obj, get: obj => obj.toggleDir }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _addDir_decorators, { kind: "method", name: "addDir", static: false, private: false, access: { has: obj => "addDir" in obj, get: obj => obj.addDir }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _removeDir_decorators, { kind: "method", name: "removeDir", static: false, private: false, access: { has: obj => "removeDir" in obj, get: obj => obj.removeDir }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _rescan_decorators, { kind: "method", name: "rescan", static: false, private: false, access: { has: obj => "rescan" in obj, get: obj => obj.rescan }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        constructor(ctx) {
            super(ctx, "agentSkills");
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** Full page view: sources + catalog + counts. */
        async list() {
            return this.refresh();
        }
        /** Enable or disable one skill by name. */
        async toggleSkill(input) {
            const state = await readState();
            const set = new Set(state.disabledSkills);
            if (input.enabled)
                set.delete(input.name);
            else
                set.add(input.name);
            state.disabledSkills = [...set].sort();
            await writeState(state);
            return this.refresh();
        }
        /** Enable or disable one scan directory (custom or builtin root). */
        async toggleDir(input) {
            const state = await readState();
            const path = canonicalizeDir(input.path);
            const custom = state.dirs.find((dir) => canonicalizeDir(dir.path) === path);
            if (custom !== undefined) {
                custom.enabled = input.enabled;
            }
            else {
                const set = new Set(state.disabledDirs.map((entry) => canonicalizeDir(entry)));
                if (input.enabled)
                    set.delete(path);
                else
                    set.add(path);
                state.disabledDirs = [...set].sort();
            }
            await writeState(state);
            return this.refresh();
        }
        /** Add a custom scan directory. */
        async addDir(input) {
            const state = await readState();
            const path = canonicalizeDir(input.path);
            const existing = state.dirs.find((dir) => canonicalizeDir(dir.path) === path);
            if (existing === undefined)
                state.dirs.push({ path, enabled: true });
            await writeState(state);
            return this.refresh();
        }
        /** Remove a custom scan directory (auto-discovered ones too). */
        async removeDir(input) {
            const state = await readState();
            const path = canonicalizeDir(input.path);
            state.dirs = state.dirs.filter((dir) => canonicalizeDir(dir.path) !== path);
            await writeState(state);
            return this.refresh();
        }
        /** Re-scan everything and return the fresh view. */
        async rescan() {
            return this.refresh();
        }
        /** Shared tail: auto-discover, invalidate the catalog, return the view. */
        async refresh() {
            const dshHome = resolveDshHome();
            const state = await readState(dshHome);
            if (await ensureDiscovered(state))
                await writeState(state, dshHome);
            invalidateSkillCache(this.ctx.get("skills"));
            const view = await buildView(this.ctx, state);
            return jsonSafe(view);
        }
    };
})();
export { AgentSkillsRuntime };
//# sourceMappingURL=runtime.js.map