/**
 * Type-only module augmentations owned by this plugin: the `agent-skills`
 * locale namespace registered into the slots locale map. Imported from the
 * client entry so the section registration type-checks with its own keys.
 *
 * @module dsh-agent-skills/client/types
 */
declare module "@deepseek-ai/dsh-client-ui-slots" {
    interface LocaleNamespaceMap {
        "agent-skills": "nav" | "title" | "subtitle" | "takeoverTitle" | "takeoverDescription" | "takeoverEnabledTitle" | "takeoverEnabledDescription" | "takeoverRestartDescription" | "takeoverPartialDescription" | "takeoverUnavailableDescription" | "takeoverAction" | "searchPlaceholder" | "sources" | "validCount" | "missingCount" | "addDir" | "rescan" | "collapseAll" | "expandAll" | "dirTagUser" | "dirTagBuiltin" | "validSkills" | "viewSkills" | "hideSkills" | "noSkillsInDir" | "dirMissing" | "enabledLabel" | "enabledStats" | "refreshPending" | "refreshPage" | "noSkills" | "noMatch" | "tagCustom" | "tagGlobal" | "tagBuiltin" | "expand" | "collapse" | "loading" | "errorLoad" | "errorSave" | "addDirPlaceholder" | "addConfirm" | "addCancel" | "removeDir" | "autoBadge" | "enabled" | "disabled" | "emptyDirs";
    }
}
export {};
