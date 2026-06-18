import React, { useEffect, useMemo, useRef, useState } from "react";
import { Database, ExternalLink, FileText, Network, Tags, X } from "lucide-react";
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
];

export default function NovelSection({
  novel,
  onNovelChange,
  onAddCharacter,
  onUpdateCharacter,
  onAddRelationship,
  onUpdateRelationship,
  onAddEvent,
  onUpdateEvent,
}) {
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

  function updatePublishLink(nextLink) {
    const platform = PLATFORMS.find((item) => item.label === nextLink.label) ?? PLATFORMS[0];
    onNovelChange(novel.id, {
      urls: { ...(novel.urls ?? {}), [platform.key]: nextLink.url },
      sourceLinks: [{ label: platform.label, url: nextLink.url }],
    });
  }

  return (
    <section id={novel.id} className="section novel-section" style={{ "--novel-color": novel.color, "--novel-accent": novel.accent }}>
      <div className="novel-hero">
        <div>
          <p className="eyebrow">Novel section</p>
          <input className="novel-title-input" value={novel.title} onChange={(event) => onNovelChange(novel.id, { title: event.target.value })} aria-label="小说书名" />
          <input
            className="novel-subtitle-input"
            value={novel.subtitle}
            onChange={(event) => onNovelChange(novel.id, { subtitle: event.target.value })}
            aria-label="小说副标题"
          />
        </div>
        <div className="novel-meta" aria-label="作品档案">
          <label>
            类型
            <input value={novel.genre} onChange={(event) => onNovelChange(novel.id, { genre: event.target.value })} />
          </label>
          <label>
            当前字数
            <input type="number" value={novel.currentWords} onChange={(event) => onNovelChange(novel.id, { currentWords: Number(event.target.value) })} />
          </label>
          <label>
            预计总字数
            <input type="number" value={novel.targetWords} onChange={(event) => onNovelChange(novel.id, { targetWords: Number(event.target.value) })} />
          </label>
          <label>
            完结时间
            <input type="date" value={novel.finishDate} onChange={(event) => onNovelChange(novel.id, { finishDate: event.target.value })} />
          </label>
          <PublishLinkPill link={publishLink} onChange={updatePublishLink} />
        </div>
      </div>

      <div className="story-grid">
        <article className="panel story-card">
          <div className="panel-title">
            <FileText size={17} />
            <h3>大纲</h3>
          </div>
          <textarea value={novel.outline} onChange={(event) => onNovelChange(novel.id, { outline: event.target.value })} />
          <p className="field-disclaimer">请勿上传违法违规或侵犯他人版权的内容。</p>
        </article>

        <article className="panel story-card">
          <div className="panel-title">
            <Database size={17} />
            <h3>设定集</h3>
          </div>
          <textarea value={novel.setting} onChange={(event) => onNovelChange(novel.id, { setting: event.target.value })} />
          <p className="field-disclaimer">请勿上传违法违规或侵犯他人版权的内容。</p>
        </article>

        <article className="panel theme-card">
          <div className="panel-title">
            <Tags size={17} />
            <h3>主题标签</h3>
          </div>
          <TagEditor tags={novel.themes} onChange={(themes) => onNovelChange(novel.id, { themes })} />
        </article>
      </div>

      <RelationGraph
        novel={novel}
        onAddCharacter={onAddCharacter}
        onUpdateCharacter={onUpdateCharacter}
        onAddRelationship={onAddRelationship}
        onUpdateRelationship={onUpdateRelationship}
      />

      <div className="timeline-shell">
        <div className="timeline-title">
          <Network size={18} />
          <div>
            <p className="eyebrow">Story causality</p>
            <h3>事件、背景与设定双向关联</h3>
          </div>
        </div>
        <TimelineFlow novel={novel} onAddEvent={onAddEvent} onUpdateEvent={onUpdateEvent} />
      </div>
    </section>
  );
}

function PublishLinkPill({ link, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ label: link.label || "AO3", url: link.url || "" });
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    setDraft({ label: link.label || "AO3", url: link.url || "" });
  }, [link.label, link.url]);

  useEffect(() => {
    if (!open) return;

    function closePopover() {
      setOpen(false);
      window.setTimeout(() => buttonRef.current?.focus?.(), 0);
    }

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closePopover();
    }

    function onPointerDown(event) {
      if (popoverRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      closePopover();
    }

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  function save() {
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
        className={`publish-pill ${link.url ? "is-configured" : ""}`}
        onClick={() => setOpen(true)}
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
