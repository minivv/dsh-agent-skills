/**
 * The `agentSkills` wire-descriptor table, shared by both package faces:
 * `TYPERT.invocations` on the host (src/typert.ts) and
 * `TYPERT_REMOTE.descriptors` on the client (src/client/typert-remote.ts).
 *
 * Keeping one table means the two halves cannot drift: every endpoint, wire
 * field, and strict codec is identical on both sides of the gateway.
 *
 * @module dsh-agent-skills/descriptors
 */
import { z } from "zod";
/** Owning npm package name; also the typert identity prefix of every endpoint. */
export declare const PKG = "dsh-agent-skills";
/** The only receiver mode this plugin uses: dispatch to the service method. */
declare const direct: {
    readonly kind: "direct";
};
/** One strict wire codec as the typert registry/loader expects it. */
export interface StrictCodec {
    mode: "strict";
    typeSymbol: string;
    /** Lazy schema factory every `dsh >= 0.1.6-alpha.2` boundary calls. */
    create: () => z.ZodType;
    /** The same Zod instance as a plain property, for older gateways. */
    schema: z.ZodType;
}
/**
 * Build one strict wire codec.
 *
 * `create` is what the typert loader and registry validate and the gateway
 * then calls as `codec.create().parse(value)`; the materialized schema is
 * cached so repeated boundary calls reuse one instance. `schema` is retained
 * for gateways that read the Zod instance directly.
 */
export declare function strictCodec(typeSymbol: string, schema: z.ZodType): StrictCodec;
/** One JSON parameter on the wire. */
export interface WireParameter {
    name: string;
    wire: string;
    source: "json";
    codec: StrictCodec;
}
/** One exported endpoint as both the host and the client declare it. */
export interface WireDescriptor {
    id: string;
    service: string;
    namespace: string;
    method: string;
    invocation: typeof direct;
    parameters: WireParameter[];
    result: StrictCodec;
}
/**
 * Build the full descriptor table. A fresh array/object graph per call keeps
 * the two faces independently ownable while their contents stay identical.
 */
export declare function buildDescriptors(): WireDescriptor[];
export {};
