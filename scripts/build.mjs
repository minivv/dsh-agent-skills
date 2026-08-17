// Build script: tsc for the host half, esbuild + module-loader wrapper for the client half.
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// 1) Host: tsc emits ESM to lib/ (keeps declarations + sourcemaps).
execSync("npx tsc -p tsconfig.json", { cwd: root, stdio: "inherit" });

// Publish client-side declarations alongside the browser bundle. The client
// tsconfig is noEmit during normal type checks; the build opts into declaration
// output explicitly so every package.json types export exists in the tarball.
rmSync(join(root, "lib/types"), { recursive: true, force: true });
execSync(
  "npx tsc -p tsconfig.client.json --declaration --emitDeclarationOnly --noEmit false --outDir lib/types --rootDir src",
  { cwd: root, stdio: "inherit" }
);

// 2) Client: bundle the browser half; only react / react/jsx-runtime stay
//    external (the web platform module table provides them). Everything else
//    (zod, etc.) is inlined into the bundle.
const tmp = join(root, ".tmp");
mkdirSync(tmp, { recursive: true });
await esbuild.build({
  entryPoints: [join(root, "src/client/index.ts")],
  outfile: join(tmp, "client.js"),
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: ["es2020"],
  external: ["react", "react/jsx-runtime"],
  jsx: "automatic",
  sourcemap: true,
  logLevel: "info"
});

// 3) Wrap into the DSH browser module-loader contract.
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const bundle = readFileSync(join(tmp, "client.js"), "utf8");
const map = readFileSync(join(tmp, "client.js.map"), "utf8");
const wrapped = [
  "window.__ModuleLoader__.load({",
  "  id: " + JSON.stringify(pkg.name) + ",",
  "  factory: (require) => {",
  "    var module = { exports: {} };",
  "    var exports = module.exports;",
  "    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });",
  bundle.trim(),
  "    return module.exports;",
  "  }",
  "});",
  "",
  "//# sourceMappingURL=client.js.map"
].join("\n");

mkdirSync(join(root, "lib"), { recursive: true });
writeFileSync(join(root, "lib/client.js"), wrapped);
writeFileSync(join(root, "lib/client.js.map"), map);
rmSync(tmp, { recursive: true, force: true });
console.log("build ok: lib/ (host) + lib/client.js (browser bundle)");
