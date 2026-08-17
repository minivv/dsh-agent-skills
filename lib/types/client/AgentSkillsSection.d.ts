import type { AgentSkillsApi } from "./typert-remote.js";
import type { TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
type T = TranslateNS<"agent-skills">;
/** The settings page body. */
export declare function AgentSkillsSection({ api, t }: {
    api: AgentSkillsApi;
    t: T;
}): import("react").JSX.Element;
export {};
