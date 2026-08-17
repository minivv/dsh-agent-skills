/**
 * Injected page styles for the Agent Skills settings section. A single
 * <style data-plugin> element owns every class used by the page; the client
 * fiber removes it on dispose.
 *
 * @module dsh-agent-skills/client/styles
 */
const CSS = `
[data-plugin="dsh-agent-skills"] {
  --as-bg: transparent;
  --as-border: rgba(128, 128, 128, 0.25);
  --as-border-soft: rgba(128, 128, 128, 0.14);
  --as-text: inherit;
  --as-muted: rgba(128, 128, 128, 0.85);
  --as-muted-2: rgba(128, 128, 128, 0.6);
  --as-accent: #3fb950;
  --as-accent-soft: rgba(63, 185, 80, 0.15);
  --as-danger: #f85149;
  --as-radius: 10px;
  color-scheme: light dark;
}

.as-wrap { display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 860px; }
.as-title { font-size: 20px; font-weight: 650; margin: 0; line-height: 1.3; }
.as-subtitle { font-size: 13px; color: var(--as-muted); margin: 0; line-height: 1.5; }
.as-search { width: 100%; box-sizing: border-box; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--as-border); background: transparent; color: inherit; font-size: 13px; outline: none; }
.as-search:focus { border-color: var(--as-accent); }

.as-sources-row { display: flex; align-items: baseline; gap: 10px; }
.as-sources-label { font-size: 14px; font-weight: 550; }
.as-sources-counts { font-size: 12px; color: var(--as-muted); }
.as-sources-counts b { font-weight: 600; color: var(--as-text); }
.as-sources-chevron { margin-left: auto; background: none; border: none; color: var(--as-muted); cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 6px; }
.as-sources-chevron:hover { background: rgba(128, 128, 128, 0.12); }

.as-actions-row { display: flex; align-items: center; gap: 8px; }
.as-btn { padding: 5px 12px; border-radius: 7px; border: 1px solid var(--as-border); background: transparent; color: inherit; font-size: 13px; cursor: pointer; }
.as-btn:hover { background: rgba(128, 128, 128, 0.1); }
.as-btn:disabled { opacity: 0.55; cursor: default; }
.as-btn-primary { background: var(--as-accent-soft); border-color: var(--as-accent); color: var(--as-accent); font-weight: 550; }
.as-btn-primary:hover { background: var(--as-accent-soft); }
.as-btn-danger { color: var(--as-danger); border-color: rgba(248, 81, 73, 0.4); }
.as-actions-spacer { flex: 1; }
.as-actions-note { font-size: 12px; color: var(--as-muted-2); }

.as-add-row { display: flex; gap: 8px; align-items: center; }
.as-add-input { flex: 1; padding: 6px 10px; border-radius: 7px; border: 1px solid var(--as-border); background: transparent; color: inherit; font-size: 13px; outline: none; }

.as-dir-list { display: flex; flex-direction: column; gap: 10px; }
.as-dir-card { border: 1px solid var(--as-border-soft); border-radius: var(--as-radius); padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; background: rgba(128, 128, 128, 0.04); }
.as-dir-row { display: flex; align-items: center; gap: 8px; }
.as-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--as-accent); flex: none; }
.as-dot-missing { background: rgba(128, 128, 128, 0.45); }
.as-dir-path { font-size: 13px; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; word-break: break-all; }
.as-dir-meta { font-size: 11px; color: var(--as-muted); }
.as-dir-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.as-tag { font-size: 11px; padding: 1px 7px; border-radius: 999px; border: 1px solid var(--as-border); color: var(--as-muted); white-space: nowrap; }
.as-tag-custom { color: #58a6ff; border-color: rgba(88, 166, 255, 0.4); }
.as-tag-global { color: #d29922; border-color: rgba(210, 153, 34, 0.4); }
.as-tag-builtin { color: #bc8cff; border-color: rgba(188, 140, 255, 0.4); }
.as-tag-auto { color: var(--as-muted); border-style: dashed; }

.as-dir-sub { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--as-muted); }
.as-dir-view-btn { background: none; border: none; color: var(--as-accent); cursor: pointer; font-size: 12px; padding: 0; }
.as-dir-view-btn:hover { text-decoration: underline; }

.as-dir-skills { display: flex; flex-direction: column; border-top: 1px dashed var(--as-border-soft); padding-top: 8px; gap: 6px; max-height: 320px; overflow: auto; }
.as-dir-skill { display: flex; flex-direction: column; gap: 1px; }
.as-dir-skill-name { font-size: 13px; font-weight: 550; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.as-dir-skill-desc { font-size: 12px; color: var(--as-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.as-skills-header { display: flex; align-items: baseline; gap: 7px; font-size: 13px; font-weight: 550; margin: 4px 0 0; text-wrap: balance; }
.as-skills-header-title { color: var(--as-text); }
.as-skills-header-stats { font-size: 11px; font-weight: 450; color: var(--as-muted-2); font-variant-numeric: tabular-nums; }
.as-skill-grid { display: flex; flex-direction: column; gap: 8px; }
.as-skill-card { border: 1px solid var(--as-border-soft); border-radius: var(--as-radius); padding: 10px 12px; display: flex; flex-direction: column; gap: 5px; }
.as-skill-row { display: flex; align-items: center; gap: 8px; }
.as-skill-name { font-size: 13px; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.as-skill-row-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.as-skill-dir { font-size: 11px; color: var(--as-muted-2); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.as-skill-desc { font-size: 12px; color: var(--as-muted); margin: 0; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
.as-skill-desc-clamped { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.as-desc-toggle { background: none; border: none; color: var(--as-muted); cursor: pointer; font-size: 11px; padding: 0; align-self: flex-start; }
.as-desc-toggle:hover { color: var(--as-text); }

.as-switch { position: relative; display: inline-block; width: 34px; height: 19px; flex: none; }
.as-switch input { opacity: 0; width: 0; height: 0; }
.as-switch-track { position: absolute; inset: 0; border-radius: 999px; background: rgba(128, 128, 128, 0.35); transition: background 0.15s; cursor: pointer; }
.as-switch-track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: #fff; transition: transform 0.15s; }
.as-switch input:checked + .as-switch-track { background: var(--as-accent); }
.as-switch input:checked + .as-switch-track::after { transform: translateX(15px); }
.as-switch input:disabled + .as-switch-track { opacity: 0.5; cursor: default; }

.as-empty { font-size: 12px; color: var(--as-muted); padding: 12px 0; }
.as-error { font-size: 12px; color: var(--as-danger); }
.as-busy { font-size: 12px; color: var(--as-muted-2); }
`;

let installed: HTMLStyleElement | undefined;

/** Inject the stylesheet once per browser document; returns the element. */
export function injectStyles(): HTMLStyleElement {
  if (installed !== undefined && installed.isConnected) return installed;
  const style = document.createElement("style");
  style.setAttribute("data-plugin", "dsh-agent-skills");
  style.textContent = CSS;
  document.head.appendChild(style);
  installed = style;
  return style;
}

/** Remove the stylesheet (client fiber dispose). */
export function removeStyles(): void {
  if (installed !== undefined) {
    installed.remove();
    installed = undefined;
  }
}
