import React, { useEffect, useMemo, useRef, useState } from "react";
import { Database, ExternalLink, FileText, Network, Tags, X } from "lucide-react";
import { FULL_PUBLIC_SECTIONS } from "../lib/shareSections.js";
import { usePopoverDismiss } from "../lib/usePopoverDismiss.js";
import NovelShareControl from "./NovelShareControl.jsx";
import RelationGraph from "./RelationGraph.jsx";
import TagEditor from "./TagEditor.jsx";
import TimelineFlow from "./TimelineFlow.jsx";

const PLATFORMS = [
  { label: "AO3", key: "ao3" },
  { label: "晋江", key: "jjwxc" },
  { label: "起点", key: "qidian" },
  { label: "七猫", key: "qimao" },
  { label: "番茄", key: "fanqie" },
  { label: "长佩", key: "changpei" },
  { label: "其他", key: "other" },
];

export default function NovelSection({
  novel,
  onNovelChange,
  onAddCharacter,
  onUpdateCharacter,
  onAddRelationship,
  onUpdateRelationship,
  onDeleteCharacter,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onReorderEvent,
  onCreateShareLink,
  shareInfo,
  readOnly = false,
  visibleSections,
}) {
  const sectionSet = useMemo(() => new Set(visibleSections ?? FULL_PUBLIC_SECTIONS), [visibleSections]);
  const showOutline = sectionSet.has("outline");
  const showSetting = sectionSet.has("setting");
  const showThemes = sectionSet.has("themes");
  const showGraph = sectionSet.has("graph");
  const showCharacters = sectionSet.has("characters");
  const showTimeline = sectionSet.has("timeline");
  const showStoryGrid = showOutline || showSetting || showThemes;
  const showRelations = showGraph || showCharacters;
  const publishLink = useMemo(() => {
    const links = novel.sourceLinks ?? [];
    const sourceLink = links.find((link) => PLATFORMS.some((platform) => platform.label === link.label)) ?? links.find((link) => link.url?.startsWith("http"));
    const platform = PLATFORMS.find((item) => item.label === sourceLink?.label) ?? PLATFORMS[0];
    return {
      label: platform.label,
      key: platform.key,
      url: novel.urls?.[platform.key] ?? sourceLink?.url ?? "",
    };
  }, [novel.sourceLinks, novel.urls]);

  function patchNovel(patch) {
    if (readOnly) return;
    onNovelChange(novel.id, patch);
  }

  function updatePublishLink(nextLink) {
    if (readOnly) return;
    const platform = PLATFORMS.find((item) => item.label === nextLink.label) ?? PLATFORMS[0];
    onNovelChange(novel.id, {
      urls: { ...(novel.urls ?? {}), [platform.key]: nextLink.url },
      sourceLinks: [{ label: platform.label, url: nextLink.url }],
    });
  }

  return (
    <section id={novel.id} className={`section novel-section ${readOnly ? "is-read-only" : ""}`} style={{ "--novel-color": novel.color, "--novel-accent": novel.accent }}>
      <div className="novel-hero">
        <div>
          <p className="eyebrow">Novel section</p>
          <input className="novel-title-input" value={novel.title} readOnly={readOnly} onChange={(event) => patchNovel({ title: event.target.value })} aria-label="小说书名" />
          <input
            className="novel-subtitle-input"
            value={novel.subtitle}
            readOnly={readOnly}
            onChange={(event) => patchNovel({ subtitle: event.target.value })}
            aria-label="小说副标题"
          />
        </div>
        <div className="novel-meta" aria-label="作品档案">
          <label className="novel-meta-field">
            <span>类型</span>
            <input value={novel.genre} readOnly={readOnly} onChange={(event) => patchNovel({ genre: event.target.value })} />
          </label>
          <label className="novel-meta-field">
            <span>当前字数</span>
            <input type="number" value={novel.currentWords} readOnly={readOnly} onChange={(event) => patchNovel({ currentWords: Number(event.target.value) })} />
          </label>
          <label className="novel-meta-field">
            <span>预计总字数</span>
            <input type="number" value={novel.targetWords} readOnly={readOnly} onChange={(event) => patchNovel({ targetWords: Number(event.target.value) })} />
          </label>
          <label className="novel-meta-field">
            <span>完结时间</span>
            <input type="date" value={novel.finishDate} readOnly={readOnly} onChange={(event) => patchNovel({ finishDate: event.target.value })} />
          </label>
          <div className="novel-hero-actions">
            <PublishLinkPill link={publishLink} onChange={updatePublishLink} readOnly={readOnly} />
            {!readOnly && <NovelShareControl novel={novel} shareInfo={shareInfo} onCreateShareLink={onCreateShareLink} />}
          </div>
        </div>
      </div>

      {showStoryGrid && (
        <div className="story-grid">
          {showOutline && (
            <article className="panel story-card">
              <div className="panel-title">
                <FileText size={17} />
                <h3>大纲</h3>
              </div>
              <textarea value={novel.outline} readOnly={readOnly} onChange={(event) => patchNovel({ outline: event.target.value })} />
            </article>
          )}

          {showSetting && (
            <article className="panel story-card">
              <div className="panel-title">
                <Database size={17} />
                <h3>设定集</h3>
              </div>
              <textarea value={novel.setting} readOnly={readOnly} onChange={(event) => patchNovel({ setting: event.target.value })} />
            </article>
          )}

          {showThemes && (
            <article className="panel theme-card">
              <div className="panel-title">
                <Tags size={17} />
                <h3>主题标签</h3>
              </div>
              {readOnly ? (
                <div className="tag-list readonly-tags">
                  {(novel.themes ?? []).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : (
                <TagEditor tags={novel.themes} onChange={(themes) => onNovelChange(novel.id, { themes })} />
              )}
            </article>
          )}
        </div>
      )}

      {showRelations && (
        <RelationGraph
          novel={novel}
          onAddCharacter={onAddCharacter}
          onUpdateCharacter={onUpdateCharacter}
          onAddRelationship={onAddRelationship}
          onUpdateRelationship={onUpdateRelationship}
          onDeleteCharacter={onDeleteCharacter}
          readOnly={readOnly}
          showGraph={showGraph}
          showDetails={showCharacters}
        />
      )}

      {showTimeline && (
        <div className="timeline-shell">
          <div className="timeline-title">
            <Network size={18} />
            <div>
              <p className="eyebrow">Story causality</p>
              <h3>事件、背景与设定双向关联</h3>
            </div>
          </div>
          <TimelineFlow novel={novel} onAddEvent={onAddEvent} onUpdateEvent={onUpdateEvent} onDeleteEvent={onDeleteEvent} onReorderEvent={onReorderEvent} readOnly={readOnly} />
        </div>
      )}
    </section>
  );
}

function PublishLinkPill({ link, onChange, readOnly = false }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ label: link.label || "AO3", url: link.url || "" });
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    setDraft({ label: link.label || "AO3", url: link.url || "" });
  }, [link.label, link.url]);

  usePopoverDismiss(open, { buttonRef, popoverRef, onClose: setOpen });

  function save() {
    if (readOnly) return;
    onChange({ label: draft.label || "AO3", url: draft.url.trim() });
    setOpen(false);
  }

  function openLink() {
    if (!draft.url.trim()) return;
    const href = draft.url.startsWith("http") ? draft.url : `https://${draft.url}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="publish-link">
      <button
        ref={buttonRef}
        type="button"
        className="publish-pill"
        onClick={() => !readOnly && setOpen(true)}
        title={link.url ? "已配置发布页，点击可修改或打开" : "配置小说发布页"}
      >
        {draft.label || "AO3"}
      </button>
      {open && (
        <div ref={popoverRef} className="publish-popover">
          <button type="button" className="publish-close" onClick={() => setOpen(false)} aria-label="关闭">
            <X size={14} />
          </button>
          <span>小说发布页</span>
          <select value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })}>
            {PLATFORMS.map((platform) => (
              <option key={platform.key} value={platform.label}>
                {platform.label}
              </option>
            ))}
          </select>
          <label>
            粘贴发布页 URL
            <input
              value={draft.url}
              onChange={(event) => {
                const url = event.target.value;
                const detected = detectPlatform(url);
                setDraft({ ...draft, url, label: detected?.label ?? draft.label });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  save();
                }
              }}
              placeholder="https://..."
            />
          </label>
          <div>
            <button type="button" onClick={save}>
              保存
            </button>
            <button type="button" onClick={openLink} disabled={!draft.url.trim()}>
              <ExternalLink size={14} />
              打开
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function detectPlatform(url = "") {
  const value = url.toLowerCase();
  if (value.includes("archiveofourown.org") || value.includes("ao3.org")) return PLATFORMS.find((platform) => platform.key === "ao3");
  if (value.includes("jjwxc.net")) return PLATFORMS.find((platform) => platform.key === "jjwxc");
  if (value.includes("qidian.com")) return PLATFORMS.find((platform) => platform.key === "qidian");
  if (value.includes("qimao.com")) return PLATFORMS.find((platform) => platform.key === "qimao");
  if (value.includes("fanqienovel.com") || value.includes("fanqie")) return PLATFORMS.find((platform) => platform.key === "fanqie");
  if (value.includes("gongzicp.com") || value.includes("changpei")) return PLATFORMS.find((platform) => platform.key === "changpei");
  return null;
}
