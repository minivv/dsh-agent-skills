// Typert wire-contract regression test.
//
// dsh >= 0.1.6-alpha.2 validates every contributor twice: the host loader runs
// `validateTypertManifest` on the `./typert` artifact, and the gateway calls
// `codec.create().parse(value)` at each boundary. A codec that carries only the
// plain Zod `schema` property therefore fails the whole plugin tree at boot
// ("result codec has no create() factory").
//
// This test exercises BOTH faces the way dsh does: the host manifest is
// imported, and the browser bundle is loaded through its module-loader wrapper
// with a stand-in Client context so `apply()` hands over the real contribution.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { TYPERT } = await import("./lib/typert.js");

/** The subset of `requireStrictCodec` + `validateInvocation` this plugin must satisfy. */
function assertStrictCodec(codec, subject) {
  assert.equal(codec.mode, "strict", `${subject} must be a strict codec`);
  assert.ok(typeof codec.typeSymbol === "string" && codec.typeSymbol.length > 0, `${subject} needs a typeSymbol`);
  assert.equal(typeof codec.create, "function", `${subject} has no create() factory`);
  const schema = codec.create();
  assert.equal(typeof schema?.parse, "function", `${subject} create() must return a schema with parse()`);
  assert.equal(codec.create(), schema, `${subject} create() must reuse one materialized schema`);
}

/** Validate one face's endpoint list against the shared wire grammar. */
function assertDescriptors(descriptors, face) {
  const ids = new Set();
  const endpoints = new Set();
  for (const descriptor of descriptors) {
    const subject = `${face} ${descriptor.id}`;
    assert.ok(typeof descriptor.id === "string" && descriptor.id.length > 0, `${face} endpoint id must be nonempty`);
    assert.ok(!descriptor.id.includes("#") || descriptor.id.includes("#agentSkills/"), `${subject} id must name an agentSkills endpoint`);
    assert.equal(descriptor.id, `dsh-agent-skills#agentSkills/${descriptor.method}`, `${subject} id must match its method`);
    assert.equal(descriptor.service, "agentSkills", `${subject} service`);
    assert.equal(descriptor.namespace, "agentSkills", `${subject} namespace`);
    assert.deepEqual(descriptor.invocation, { kind: "direct" }, `${subject} receiver`);
    const endpoint = `${descriptor.namespace}/${descriptor.method}`;
    assert.ok(!ids.has(descriptor.id), `${subject} repeats an id`);
    assert.ok(!endpoints.has(endpoint), `${subject} repeats an endpoint`);
    ids.add(descriptor.id);
    endpoints.add(endpoint);
    assertStrictCodec(descriptor.result, `${subject} result`);
    const wires = new Set();
    for (const parameter of descriptor.parameters) {
      assert.equal(parameter.source, "json", `${subject} parameter ${parameter.name} source`);
      assert.ok(!wires.has(parameter.wire), `${subject} repeats wire field ${parameter.wire}`);
      wires.add(parameter.wire);
      assertStrictCodec(parameter.codec, `${subject} parameter ${parameter.name}`);
    }
  }
  return descriptors;
}

assert.equal(TYPERT.package, "dsh-agent-skills", "host manifest package");
assert.equal(TYPERT.face, "host", "host manifest face");
assert.deepEqual(TYPERT.schemas, [], "host manifest registers no standalone schemas");
assertDescriptors(TYPERT.invocations, "host");

// Load the browser bundle exactly as the DSH web client does.
let artifact;
const styleElement = {
  isConnected: true,
  setAttribute: () => {},
  remove: () => { styleElement.isConnected = false; },
  textContent: ""
};
new Function("window", "document", readFileSync(new URL("./lib/client.js", import.meta.url), "utf8"))(
  { __ModuleLoader__: { load: (entry) => { artifact = entry; } } },
  { createElement: () => styleElement, head: { appendChild: () => {} } }
);
assert.equal(artifact?.id, "dsh-agent-skills", "client bundle id");

// React stays untouched until render, so one permissive stub satisfies the bundle.
const permissive = new Proxy(function stub() {}, { get: () => permissive, apply: () => permissive });
const client = artifact.factory((id) => {
  assert.ok(id === "react" || id === "react/jsx-runtime", `unexpected client external ${id}`);
  return permissive;
});

let mounted;
const disposer = () => {};
const ctx = {
  effect: (body) => {
    const result = body();
    return typeof result === "function" ? result : disposer;
  },
  get: () => undefined,
  locale: { register: () => disposer, bind: () => (key) => key },
  remote: { $mount: async (contribution) => { mounted = contribution; return disposer; } },
  slots: { inject: () => disposer, register: () => disposer }
};
await client.apply(ctx);

assert.ok(mounted, "client apply() must mount the agentSkills contribution");
assert.equal(mounted.package, "dsh-agent-skills", "client contribution package");
const clientEndpoints = assertDescriptors(mounted.descriptors, "client");

// Both faces must describe the same wire surface, endpoint for endpoint.
const shape = (descriptors) => descriptors.map((entry) => ({
  id: entry.id,
  method: entry.method,
  parameters: entry.parameters.map((parameter) => `${parameter.wire}:${parameter.source}:${parameter.codec.typeSymbol}`),
  result: entry.result.typeSymbol
}));
assert.deepEqual(shape(clientEndpoints), shape(TYPERT.invocations), "host and client descriptor tables must match");

console.log("typert contract ok: host + client codecs expose create() with matching endpoints");
