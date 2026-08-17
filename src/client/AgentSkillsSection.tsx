/**
 * The Agent Skills settings page. Rendered inside the settings.section slot
 * ("设置" → Agent Skills tab).
 *
 * Layout (top to bottom):
 *   title + subtitle → search box → 来源 row (counts + collapse chevron)
 *   → actions row (+ 添加目录 / 重新扫描 / 收起) → directory cards
 *   → enabled-skills header with category counts → skill cards.
 *
 * Every toggle and scan calls back into the host through the agentSkills
 * remote; the host persists, invalidates the model catalog, and returns the
 * fresh view, so changes take effect on the next agent step without any
 * restart.
 *
 * @module dsh-agent-skills/client/AgentSkillsSection
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentSkillsView, DirView } from "../schemas.js";
import type { AgentSkillsApi } from "./typert-remote.js";
import type { TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";

type T = TranslateNS<"agent-skills">;

const clamp = (value: string, max: number) => (value.length <= max ? value : value.slice(0, max - 1) + "…");

function Switch({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange(next: boolean): void; label: string }) {
  return (
    <label className="as-switch" title={label} aria-label={label}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="as-switch-track" />
    </label>
  );
}

/** One-line description with an expand control when the text overflows. */
function SkillDescription({ text, t }: { text: string; t: T }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const check = () => {
      setOverflow(element.scrollHeight > element.clientHeight + 1);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);
  if (text === "") return null;
  return (
    <div>
      <p ref={ref} className={expanded ? "as-skill-desc" : "as-skill-desc as-skill-desc-clamped"}>
        {text}
      </p>
      {overflow && (
        <button type="button" className="as-desc-toggle" onClick={() => setExpanded((prev) => !prev)}>
          {expanded ? t("collapse") : t("expand")}
        </button>
      )}
    </div>
  );
}

/** One directory card: dot + path + tag + switch; 有效技能 count + 查看技能. */
function DirCard({
  dir,
  skills,
  t,
  expanded,
  onToggleExpanded,
  onToggleEnabled,
  onRemove
}: {
  dir: DirView;
  skills: DirView["skills"];
  t: T;
  expanded: boolean;
  onToggleExpanded(): void;
  onToggleEnabled(next: boolean): void;
  onRemove(): void;
}) {
  return (
    <div className="as-dir-card">
      <div className="as-dir-row">
        <span className={dir.exists ? "as-dot" : "as-dot as-dot-missing"} />
        <span className="as-dir-path" title={dir.path}>
          {dir.path}
        </span>
        <div className="as-dir-actions">
          {dir.auto === true && <span className="as-tag as-tag-auto">{t("autoBadge")}</span>}
          <span className="as-tag">{dir.tag === "builtin" ? t("dirTagBuiltin") : t("dirTagUser")}</span>
          {dir.kind === "custom" && (
            <button type="button" className="as-btn as-btn-danger" onClick={onRemove} title={t("removeDir")}>
              {t("removeDir")}
            </button>
          )}
          <Switch checked={dir.enabled} onChange={onToggleEnabled} label={dir.enabled ? t("enabled") : t("disabled")} />
        </div>
      </div>
      <div className="as-dir-sub">
        <span>
          {dir.exists ? t("validSkills", { n: dir.skillCount }) : t("dirMissing")}
          {!dir.exists && " · " + t("validSkills", { n: 0 })}
        </span>
        {dir.skillCount > 0 && (
          <button type="button" className="as-dir-view-btn" onClick={onToggleExpanded}>
            {expanded ? t("hideSkills") : t("viewSkills")}
          </button>
        )}
      </div>
      {expanded && (
        <div className="as-dir-skills">
          {skills.length === 0 ? (
            <span className="as-empty">{t("noSkillsInDir")}</span>
          ) : (
            skills.map((skill) => (
              <div className="as-dir-skill" key={skill.name}>
                <span className="as-dir-skill-name">/{skill.name}</span>
                <span className="as-dir-skill-desc">{clamp(skill.description, 140)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** The settings page body. */
export function AgentSkillsSection({ api, t }: { api: AgentSkillsApi; t: T }) {
  const [view, setView] = useState<AgentSkillsView | undefined>(undefined);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [addDirOpen, setAddDirOpen] = useState(false);
  const [addDirText, setAddDirText] = useState("");
  const [dirExpanded, setDirExpanded] = useState<ReadonlySet<string>>(new Set());
  const [saving, setSaving] = useState(false);

  type RefreshResult = { ok: true; value: AgentSkillsView } | { ok: false; error: { message: string } };
  const load = useCallback(async (refresh: () => Promise<RefreshResult> = () => api.list()) => {
    setError("");
    const result = await refresh();
    if (result.ok) {
      setView(result.value);
    } else {
      setError(t("errorLoad", { message: result.error.message }));
    }
  }, [api, t]);

  useEffect(() => {
    setBusy(true);
    void load().finally(() => setBusy(false));
  }, [load]);

  // Light polling keeps the page honest about changes made outside this tab
  // (skill files edited on disk, other sessions toggling sources).
  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const mutate = useCallback(async (operation: () => Promise<RefreshResult>) => {
    setSaving(true);
    setError("");
    try {
      const result = await operation();
      if (result.ok) {
        setView(result.value);
      } else {
        setError(t("errorSave", { message: result.error.message }));
      }
    } finally {
      setSaving(false);
    }
  }, [t]);

  const toggleDirExpanded = (path: string) => {
    setDirExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const filteredSkills = useMemo(() => {
    if (view === undefined) return [];
    const needle = query.trim().toLowerCase();
    if (needle === "") return view.skills;
    return view.skills.filter(
      (skill) => skill.name.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle)
    );
  }, [view, query]);

  const filterDirSkills = (dir: DirView) => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return dir.skills;
    return dir.skills.filter(
      (skill) => skill.name.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle)
    );
  };

  const visibleDirs = useMemo(() => {
    if (view === undefined || sourcesCollapsed) return [];
    const needle = query.trim().toLowerCase();
    const dirs = view.dirs;
    if (needle === "") return dirs;
    return dirs.filter(
      (dir) =>
        dir.path.toLowerCase().includes(needle) ||
        dir.skills.some(
          (skill) => skill.name.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle)
        )
    );
  }, [view, query, sourcesCollapsed]);

  if (view === undefined) {
    return (
      <div className="as-wrap" data-plugin="dsh-agent-skills">
        <h2 className="as-title">{t("title")}</h2>
        <p className="as-subtitle">{t("subtitle")}</p>
        <p className="as-busy">{busy ? t("loading") : ""}</p>
      </div>
    );
  }
  return (
    <div className="as-wrap" data-plugin="dsh-agent-skills">
      <h2 className="as-title">{t("title")}</h2>
      <p className="as-subtitle">{t("subtitle")}</p>

      <input
        className="as-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("searchPlaceholder")}
      />

      {error !== "" && <div className="as-error">{error}</div>}

      {/* 来源 row */}
      <div className="as-sources-row">
        <span className="as-sources-label">{t("sources")}</span>
        <span className="as-sources-counts">
          <b>{view.validDirs}</b> {t("validCount", { n: view.validDirs })}
          {" · "}
          <b>{view.missingDirs}</b> {t("missingCount", { n: view.missingDirs })}
        </span>
        <button
          type="button"
          className="as-sources-chevron"
          onClick={() => {
            setSourcesCollapsed((prev) => !prev);
            setAddDirOpen(false);
          }}
          title={sourcesCollapsed ? t("expandAll") : t("collapseAll")}
        >
          {sourcesCollapsed ? "‹" : "⌄"}
        </button>
      </div>

      {/* Directory controls disappear together with the source list. */}
      {!sourcesCollapsed && <div className="as-actions-row">
        <button
          type="button"
          className="as-btn as-btn-primary"
          disabled={saving}
          onClick={() => {
            setAddDirOpen((prev) => !prev);
            setAddDirText("");
          }}
        >
          {t("addDir")}
        </button>
        <button
          type="button"
          className="as-btn"
          disabled={saving}
          onClick={() => {
            setBusy(true);
            void mutate(() => api.rescan()).finally(() => setBusy(false));
          }}
        >
          {t("rescan")}
        </button>
        <div className="as-actions-spacer" />
        <button type="button" className="as-btn" disabled={saving} onClick={() => {
          setSourcesCollapsed(true);
          setAddDirOpen(false);
        }}>
          {t("collapseAll")}
        </button>
      </div>}

      {!sourcesCollapsed && addDirOpen && (
        <div className="as-add-row">
          <input
            className="as-add-input"
            value={addDirText}
            onChange={(event) => setAddDirText(event.target.value)}
            placeholder={t("addDirPlaceholder")}
            onKeyDown={(event) => {
              if (event.key === "Enter" && addDirText.trim() !== "") {
                const path = addDirText.trim();
                setAddDirOpen(false);
                void mutate(() => api.addDir({ path }));
              }
              if (event.key === "Escape") setAddDirOpen(false);
            }}
          />
          <button
            type="button"
            className="as-btn as-btn-primary"
            disabled={addDirText.trim() === ""}
            onClick={() => {
              const path = addDirText.trim();
              setAddDirOpen(false);
              void mutate(() => api.addDir({ path }));
            }}
          >
            {t("addConfirm")}
          </button>
          <button type="button" className="as-btn" onClick={() => setAddDirOpen(false)}>
            {t("addCancel")}
          </button>
        </div>
      )}

      {/* directory cards */}
      {!sourcesCollapsed && (
        <div className="as-dir-list">
          {visibleDirs.length === 0 ? (
            <div className="as-empty">{query.trim() === "" ? t("emptyDirs") : t("noMatch")}</div>
          ) : (
            visibleDirs.map((dir) => (
              <DirCard
                key={dir.path}
                dir={dir}
                skills={filterDirSkills(dir)}
                t={t}
                expanded={dirExpanded.has(dir.path)}
                onToggleExpanded={() => toggleDirExpanded(dir.path)}
                onToggleEnabled={(next) => void mutate(() => api.toggleDir({ path: dir.path, enabled: next }))}
                onRemove={() => void mutate(() => api.removeDir({ path: dir.path }))}
              />
            ))
          )}
        </div>
      )}

      {/* enabled skills */}
      <h3 className="as-skills-header">
        {t("enabledHeader", {
          total: view.counts.total,
          custom: view.counts.custom,
          global: view.counts.global,
          builtin: view.counts.builtin
        })}
      </h3>
      <div className="as-skill-grid">
        {filteredSkills.length === 0 ? (
          <div className="as-empty">{query.trim() === "" ? t("noSkills") : t("noMatch")}</div>
        ) : (
          filteredSkills.map((skill) => {
            const tagClass =
              skill.kind === "custom" ? "as-tag-custom" : skill.kind === "builtin" ? "as-tag-builtin" : "as-tag-global";
            const tagLabel =
              skill.kind === "custom" ? t("tagCustom") : skill.kind === "builtin" ? t("tagBuiltin") : t("tagGlobal");
            return (
              <div className="as-skill-card" key={skill.name}>
                <div className="as-skill-row">
                  <span className="as-skill-name">/{skill.name}</span>
                  <div className="as-skill-row-actions">
                    <span className={"as-tag " + tagClass}>{tagLabel}</span>
                    <Switch
                      checked={skill.enabled}
                      disabled={saving || !skill.toggleable}
                      onChange={(next) => void mutate(() => api.toggleSkill({ name: skill.name, enabled: next }))}
                      label={skill.enabled ? t("enabled") : t("disabled")}
                    />
                  </div>
                </div>
                {skill.directory !== undefined && <div className="as-skill-dir">{skill.directory}</div>}
                <SkillDescription text={skill.description} t={t} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
