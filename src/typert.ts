/**
 * Host TYPERT manifest for the `agentSkills` namespace, discovered
 * automatically by @deepseek-ai/dsh-typert-loader through the `./typert`
 * export. Hand-written in the same shape the typert generator emits; the
 * client mirror lives in src/client/typert-remote.ts.
 *
 * @module dsh-agent-skills/typert
 */
import { PKG, buildDescriptors } from "./descriptors.js";

/** Strict host contribution: `agentSkills/*` endpoints dispatched to ctx.agentSkills. */
export const TYPERT = {
  package: PKG,
  face: "host",
  schemas: [],
  model: {
    services: [
      {
        tags: [],
        key: "agentSkills",
        exportName: "agentSkills",
        members: [
          { name: "list", kind: "method", signature: "(): Promise<AgentSkillsView>" },
          { name: "takeoverStatus", kind: "method", signature: "(): Promise<PresetTakeoverStatus>" },
          { name: "enableTakeover", kind: "method", signature: "(): Promise<PresetTakeoverStatus>" },
          { name: "disableTakeover", kind: "method", signature: "(): Promise<PresetTakeoverStatus>" },
          { name: "restartDsh", kind: "method", signature: "(): Promise<RestartResult>" },
          { name: "toggleSkill", kind: "method", signature: "(input: ToggleSkillInput): Promise<AgentSkillsView>" },
          { name: "toggleDir", kind: "method", signature: "(input: ToggleDirInput): Promise<AgentSkillsView>" },
          { name: "addDir", kind: "method", signature: "(input: AddDirInput): Promise<AgentSkillsView>" },
          { name: "removeDir", kind: "method", signature: "(input: RemoveDirInput): Promise<AgentSkillsView>" },
          { name: "rescan", kind: "method", signature: "(): Promise<AgentSkillsView>" }
        ],
        types: [
          {
            name: "DirView",
            declaration:
              "export interface DirView { path: string; kind: 'custom' | 'builtin'; exists: boolean; enabled: boolean; skillCount: number; tag: 'user' | 'builtin'; }"
          },
          {
            name: "SkillView",
            declaration:
              "export interface SkillView { name: string; description: string; whenToUse?: string; source: string; kind: 'custom' | 'global' | 'builtin'; directory?: string; enabled: boolean; toggleable: boolean; }"
          },
          {
            name: "SkillCounts",
            declaration: "export interface SkillCounts { total: number; custom: number; global: number; builtin: number; }"
          },
          {
            name: "AgentSkillsView",
            declaration:
              "export interface AgentSkillsView { dirs: DirView[]; skills: SkillView[]; counts: SkillCounts; validDirs: number; missingDirs: number; }"
          },
          {
            name: "PresetTakeoverStatus",
            declaration:
              "export interface PresetTakeoverStatus { available: boolean; enabled: boolean; configured: number; total: number; boot?: string; }"
          },
          {
            name: "RestartResult",
            declaration: "export interface RestartResult { scheduled: true; }"
          },
          {
            name: "ToggleSkillInput",
            declaration: "export interface ToggleSkillInput { name: string; enabled: boolean; }"
          },
          {
            name: "ToggleDirInput",
            declaration: "export interface ToggleDirInput { path: string; enabled: boolean; }"
          },
          {
            name: "AddDirInput",
            declaration: "export interface AddDirInput { path: string; }"
          },
          {
            name: "RemoveDirInput",
            declaration: "export interface RemoveDirInput { path: string; }"
          }
        ]
      }
    ],
    events: [],
    objects: []
  },
  invocations: buildDescriptors()
} as const;
