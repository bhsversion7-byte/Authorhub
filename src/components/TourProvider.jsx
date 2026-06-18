import React from "react";
import { X } from "lucide-react";

const TOUR_STEPS = [
  {
    eyebrow: "AuthorHub Tour",
    title: "先建立作者主页",
    body: "这里保存你的笔名、更新节奏、首发平台和阅读偏好。它是所有小说宇宙的起点。",
  },
  {
    eyebrow: "Manuscript Index",
    title: "再进入手稿索引",
    body: "左侧会列出你创作过的小说。你可以新增、切换和删除手稿，所有内容都会跟随当前账号保存。",
    action: "selectDemo",
  },
  {
    eyebrow: "Novel Universe",
    title: "最后完善小说宇宙",
    body: "在小说页面里整理大纲、设定集、人物关系、时间线和发布链接。灵感出现时，先记下来，再慢慢长成完整的书。",
  },
];

export default function TourProvider({ step = 0, setStep, onDone, onSelectDemo }) {
  const safeStep = Math.min(Math.max(step, 0), TOUR_STEPS.length - 1);
  const current = TOUR_STEPS[safeStep];
  const isLast = safeStep >= TOUR_STEPS.length - 1;

  function goNext() {
    if (current.action === "selectDemo") onSelectDemo?.();
    if (isLast) onDone?.();
    else setStep?.(safeStep + 1);
  }

  return (
    <div className="tour-backdrop" role="presentation" onMouseDown={onDone}>
      <section className="tour-card" role="dialog" aria-modal="true" aria-labelledby="authorhub-tour-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="tour-close" onClick={onDone} aria-label="关闭新手引导">
          <X size={16} />
        </button>
        <p className="eyebrow">{current.eyebrow}</p>
        <h2 id="authorhub-tour-title">{current.title}</h2>
        <p>{current.body}</p>
        <div className="tour-actions">
          <button type="button" className="ghost-button" onClick={onDone}>
            跳过
          </button>
          <button type="button" className="primary-button" onClick={goNext}>
            {isLast ? "开始创作" : "下一步"}
          </button>
        </div>
      </section>
    </div>
  );
}
