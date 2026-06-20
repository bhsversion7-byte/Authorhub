import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Copy, ExternalLink, Plus, Save, Trash2, X } from "lucide-react";
import { copyPromptAndOpen } from "../lib/aiHandoff.js";
import FocusTextarea from "./FocusTextarea.jsx";
import MediaCarousel from "./MediaCarousel.jsx";

const VISIBLE_TIMELINE_NODES = 5;

function createEvent(novelId) {
  return {
    id: `${novelId}-event-${Date.now()}`,
    date: "新时间点",
    title: "新的关键事件",
    background: "补充事件发生前的社会、历史、技术或民俗背景。",
    plot: "补充事件如何改变人物选择和主线走向。",
    images: [],
  };
}

export default function TimelineFlow({ novel, onAddEvent, onUpdateEvent, onDeleteEvent }) {
  const [selectedId, setSelectedId] = useState(novel.timeline[0]?.id);
  const [slideIndex, setSlideIndex] = useState(0);
  const [handoffState, setHandoffState] = useState("");
  const [deleteEventCandidate, setDeleteEventCandidate] = useState(null);
  const selectedIndex = useMemo(() => novel.timeline.findIndex((event) => event.id === selectedId), [novel.timeline, selectedId]);
  const selected = useMemo(() => novel.timeline.find((event) => event.id === selectedId) ?? novel.timeline[0], [novel.timeline, selectedId]);
  const [draft, setDraft] = useState(selected ?? null);
  const maxSlide = Math.max(0, novel.timeline.length - VISIBLE_TIMELINE_NODES);
  const keywords = buildReferenceKeywords(draft, novel);

  useEffect(() => {
    setSlideIndex((current) => Math.min(current, maxSlide));
  }, [maxSlide]);

  useEffect(() => {
    if (!selected) return;
    setDraft({ ...selected });
  }, [selected]);

  useEffect(() => {
    if (selectedIndex < 0) return;
    setSlideIndex((current) => {
      if (selectedIndex < current) return selectedIndex;
      if (selectedIndex >= current + VISIBLE_TIMELINE_NODES) {
        return Math.min(maxSlide, selectedIndex - VISIBLE_TIMELINE_NODES + 1);
      }
      return current;
    });
  }, [selectedIndex, maxSlide]);

  function openEvent(event) {
    setSelectedId(event.id);
    setDraft({ ...event });
  }

  function addEvent() {
    const event = createEvent(novel.id);
    onAddEvent(novel.id, event);
    setSelectedId(event.id);
    setDraft(event);
    setSlideIndex(Math.max(0, novel.timeline.length - VISIBLE_TIMELINE_NODES + 1));
  }

  function saveEvent() {
    if (!draft) return;
    onUpdateEvent(novel.id, draft.id, draft);
  }

  function requestDeleteEvent(event = draft) {
    if (!event) return;
    setDeleteEventCandidate(event);
  }

  function confirmDeleteEvent() {
    if (!deleteEventCandidate) return;
    const remainingEvents = novel.timeline.filter((event) => event.id !== deleteEventCandidate.id);
    const nextEvent = selectedId === deleteEventCandidate.id ? remainingEvents[0] ?? null : draft;
    onDeleteEvent?.(novel.id, deleteEventCandidate.id);
    setDeleteEventCandidate(null);
    if (selectedId === deleteEventCandidate.id) {
      setSelectedId(nextEvent?.id);
      setDraft(nextEvent ? { ...nextEvent } : null);
    }
  }

  function moveTimeline(delta) {
    setSlideIndex((current) => Math.min(maxSlide, Math.max(0, current + delta)));
  }

  function moveSelectedEvent(delta) {
    const nextIndex = Math.min(novel.timeline.length - 1, Math.max(0, selectedIndex + delta));
    const nextEvent = novel.timeline[nextIndex];
    if (nextEvent) openEvent(nextEvent);
  }

  function handleTimelineKeyDown(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    moveSelectedEvent(event.key === "ArrowLeft" ? -1 : 1);
  }

  async function copyKeywords() {
    await navigator.clipboard?.writeText(keywords);
    setHandoffState("copied");
    window.setTimeout(() => setHandoffState(""), 1600);
  }

  async function openAiTarget(target) {
    const prompt = `我正在写《${novel.title}》的一个时间点：${draft?.date ?? ""} - ${draft?.title ?? ""}。\n\n我想补充这个时间点需要的时代、民俗、空间、行业或物件背景。请围绕这些关键词给我可考据、可转译成剧情细节的资料方向：\n${keywords}`;
    await copyPromptAndOpen(prompt, target);
    setHandoffState(target);
  }

  function openClaude() {
    window.open("https://claude.ai/new", "_blank", "noopener,noreferrer");
    setHandoffState("claude");
  }

  return (
    <div className="timeline-panel">
      <div className="timeline-header">
        <div>
          <p className="eyebrow">Timeline flow</p>
          <h3>多维交互时间线</h3>
        </div>
        <button type="button" onClick={addEvent}>
          <Plus size={16} />
          新增时间点
        </button>
      </div>

      <div className="timeline-slider" onKeyDown={handleTimelineKeyDown}>
        <button type="button" className="timeline-arrow left" onClick={() => moveTimeline(-1)} disabled={slideIndex === 0} aria-label="向左查看时间线">
          <ChevronLeft size={24} />
        </button>
        <div className="timeline-track-viewport">
          <div className="timeline-track" style={{ "--timeline-index": slideIndex }}>
            {novel.timeline.map((event, index) => (
              <div
                key={event.id}
                role="button"
                tabIndex={0}
                className={`timeline-node ${event.id === selectedId ? "is-active" : ""}`}
                onClick={() => openEvent(event)}
                onKeyDown={(keyboardEvent) => {
                  if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") return;
                  keyboardEvent.preventDefault();
                  openEvent(event);
                }}
                style={{ "--node-color": novel.color, "--node-index": index, animationDelay: `${index * 42}ms` }}
                aria-current={event.id === selectedId ? "step" : undefined}
              >
                <button
                  type="button"
                  className="timeline-node-delete"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    requestDeleteEvent(event);
                  }}
                  aria-label={`删除时间点 ${event.title}`}
                >
                  <X size={13} />
                </button>
                <span>{event.date}</span>
                <strong>{event.title}</strong>
              </div>
            ))}
          </div>
        </div>
        <button type="button" className="timeline-arrow right" onClick={() => moveTimeline(1)} disabled={slideIndex === maxSlide} aria-label="向右查看时间线">
          <ChevronRight size={24} />
        </button>
      </div>

      {draft && (
        <div className="event-editor is-simple">
          <div className="event-editor-main">
            <div className="event-core-grid">
              <label>
                时间点
                <input value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
              </label>
              <label>
                事件名称
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
            </div>
            <FocusTextarea label="发生背景" value={draft.background} onChange={(background) => setDraft({ ...draft, background })} onSave={saveEvent} />
            <FocusTextarea label="具体剧情" value={draft.plot} onChange={(plot) => setDraft({ ...draft, plot })} onSave={saveEvent} />
            <p className="field-disclaimer">请勿上传违法违规或侵犯他人版权的内容。</p>
            <MediaCarousel label="时间线参考图片" images={draft.images ?? []} onChange={(images) => setDraft({ ...draft, images })} />
            <div className="ai-nudge">
              <p>
                想要完善这个时间点的背景设定？可以复制关键词，跳转到你熟悉的大模型助手中检索素材：
                <em>{keywords}</em>
              </p>
              <div>
                <button type="button" onClick={copyKeywords}>
                  <Copy size={14} />
                  {handoffState === "copied" ? "已复制" : "复制关键词"}
                </button>
                <button type="button" onClick={() => openAiTarget("chatgpt")}>
                  <ExternalLink size={14} />
                  ChatGPT
                </button>
                <button type="button" onClick={() => openAiTarget("deepseek")}>
                  <ExternalLink size={14} />
                  DeepSeek
                </button>
                <button type="button" onClick={openClaude}>
                  <ExternalLink size={14} />
                  Claude
                </button>
              </div>
            </div>
            <div className="timeline-action-row">
              <button type="button" className="primary-button" onClick={saveEvent}>
                <Save size={16} />
                保存时间点
              </button>
              <button type="button" className="danger-lite-button" onClick={() => requestDeleteEvent()}>
                <Trash2 size={15} />
                删除时间点
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteEventCandidate &&
        createPortal(
        <div className="modal-backdrop timeline-confirm-backdrop" role="presentation" onMouseDown={() => setDeleteEventCandidate(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-event-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">Delete timeline point</p>
            <h2 id="delete-event-title">是否确定删除该时间点？</h2>
            <p>该操作将永久删除“{deleteEventCandidate.title}”及其背景、剧情、图片参考和关联资料。</p>
            <div className="confirm-actions">
              <button type="button" className="ghost-button" onClick={() => setDeleteEventCandidate(null)}>
                取消
              </button>
              <button type="button" className="danger-button" onClick={confirmDeleteEvent}>
                确定删除
              </button>
            </div>
          </section>
        </div>,
          document.body,
        )}
    </div>
  );
}

function buildReferenceKeywords(event, novel) {
  if (!event) return novel.title;
  return [event.date, event.title, novel.genre, ...(novel.themes ?? []).slice(0, 3)].filter(Boolean).join(" ");
}
