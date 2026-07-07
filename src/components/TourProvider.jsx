import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ChevronRight, X } from "lucide-react";

const TOUR_STEPS = [
  {
    eyebrow: "Step 01",
    title: "先看左侧预览框",
    body: "这里是你的手稿索引和主导航。可快速切换作者主页、用户中心和每一本小说。",
    selector: ".sidebar",
    view: "author",
    placement: "right",
  },
  {
    eyebrow: "Step 02",
    title: "作者个人主页",
    body: "这里管理笔名、年龄、更新频率、首发平台，也能调整全站字号、字体、夜间模式和隐私模糊。",
    selector: ".author-section .section-heading",
    view: "author",
    placement: "right",
  },
  {
    eyebrow: "Step 03",
    title: "用户中心",
    body: "这里处理账号信息、导出备份、清空数据、修改密码、退出登录和打赏入口。",
    selector: ".user-center-heading",
    view: "user",
    placement: "right",
  },
  {
    eyebrow: "Step 04",
    title: "音乐播放器",
    body: "小说页面右上角是低干扰音乐盒。可以播放、切歌、拖动位置，也能收起。",
    selector: ".floating-music",
    view: "novel",
    placement: "left",
  },
  {
    eyebrow: "Step 05",
    title: "小说顶部卡片",
    body: "这里记录书名、副标题、类型、字数、完结时间和平台入口；旁边的分享按钮可以生成「共同编辑」或「只读查看」链接，邀请他人协作或预览；下方三张卡片写大纲、设定集和主题标签，点右上角的放大图标可进入专注编辑器，写长文更专心。",
    selector: ".novel-section .story-grid",
    view: "novel",
    placement: "top",
  },
  {
    eyebrow: "Step 06",
    title: "人物星图与详情",
    body: "在星图里新增人物、拖动节点、聚焦视图；中间分隔线可调星图和人物详情占比，右侧填写图片、身份、标签、关系和隐藏设定。按住 Shift（Mac 上是 Cmd）拖出一个方框选中几颗星球，右键可以「锁定位置」——新增人物时布局不会再打乱它们。",
    selector: ".relation-layout",
    view: "novel",
    placement: "top",
  },
  {
    eyebrow: "Step 07",
    title: "多维交互时间线",
    body: "时间线用来拆解事件顺序、发生背景、具体剧情和参考图片。新增时间点后可逐张卡片补全。",
    selector: ".timeline-panel",
    view: "novel",
    placement: "top",
  },
];

const BUBBLE_WIDTH = 320;
const BUBBLE_HEIGHT = 170;
const BUBBLE_GAP = 18;

export default function TourProvider({ step = 0, setStep, onDone, onSelectView, demoNovelId }) {
  const safeStep = Math.min(Math.max(step, 0), TOUR_STEPS.length - 1);
  const current = TOUR_STEPS[safeStep];
  const isLast = safeStep >= TOUR_STEPS.length - 1;
  const [layout, setLayout] = useState(null);

  const targetView = useMemo(() => {
    if (current.view === "novel") return demoNovelId;
    return current.view;
  }, [current.view, demoNovelId]);

  useEffect(() => {
    if (targetView) onSelectView?.(targetView);
  }, [targetView, onSelectView]);

  useEffect(() => {
    document.body.dataset.tourActive = "true";
    return () => {
      delete document.body.dataset.tourActive;
    };
  }, []);

  useLayoutEffect(() => {
    let frame = 0;
    let timer = 0;

    function measure() {
      const target = document.querySelector(current.selector);
      if (!target) {
        setLayout({
          top: Math.max(24, window.innerHeight * 0.32),
          left: Math.max(24, window.innerWidth * 0.5 - BUBBLE_WIDTH / 2),
          placement: "center",
          rect: null,
        });
        return;
      }

      const firstRect = target.getBoundingClientRect();
      if (firstRect.top < 72 || firstRect.bottom > window.innerHeight - 72) {
        window.scrollTo({
          top: Math.max(0, window.scrollY + firstRect.top - 96),
          behavior: "smooth",
        });
      }

      frame = window.requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        setLayout(getBubbleLayout(rect, current.placement));
      });
    }

    timer = window.setTimeout(measure, 130);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [current.selector, current.placement, targetView]);

  function goNext() {
    if (isLast) onDone?.();
    else setStep?.(safeStep + 1);
  }

  return (
    <div className="tour-backdrop guided-tour-layer" role="presentation">
      {layout?.rect && (
        <span
          className="tour-target-outline"
          aria-hidden="true"
          style={{
            "--tour-target-top": `${layout.rect.top}px`,
            "--tour-target-left": `${layout.rect.left}px`,
            "--tour-target-width": `${layout.rect.width}px`,
            "--tour-target-height": `${layout.rect.height}px`,
          }}
        />
      )}
      <section
        className={`tour-card guided-tour-card arrow-${layout?.placement ?? current.placement}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="authorhub-tour-title"
        style={{
          "--tour-top": `${layout?.top ?? 120}px`,
          "--tour-left": `${layout?.left ?? 280}px`,
        }}
      >
        <span className="guided-tour-arrow" aria-hidden="true">
          <ChevronRight size={18} />
        </span>
        <button type="button" className="tour-close" onClick={onDone} aria-label="关闭新手引导">
          <X size={16} />
        </button>
        <p className="eyebrow">{current.eyebrow}</p>
        <h2 id="authorhub-tour-title">{current.title}</h2>
        <p>{current.body}</p>
        <div className="tour-actions">
          <button type="button" className="ghost-button" onClick={goNext}>
            {isLast ? "结束" : "跳过本步"}
          </button>
          <button type="button" className="primary-button" onClick={goNext}>
            {isLast ? "开始创作" : "下一步"}
          </button>
        </div>
      </section>
    </div>
  );
}

function getBubbleLayout(rect, placement) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let top = rect.top + rect.height / 2 - BUBBLE_HEIGHT / 2;
  let left = rect.right + BUBBLE_GAP;

  if (placement === "left") {
    left = rect.left - BUBBLE_WIDTH - BUBBLE_GAP;
  } else if (placement === "top") {
    top = rect.top - BUBBLE_HEIGHT - BUBBLE_GAP;
    left = rect.left + rect.width / 2 - BUBBLE_WIDTH / 2;
  } else if (placement === "bottom") {
    top = rect.bottom + BUBBLE_GAP;
    left = rect.left + rect.width / 2 - BUBBLE_WIDTH / 2;
  }

  const clampedLeft = clamp(left, 18, viewportWidth - BUBBLE_WIDTH - 18);
  const clampedTop = clamp(top, 18, viewportHeight - BUBBLE_HEIGHT - 18);

  return {
    top: clampedTop,
    left: clampedLeft,
    placement,
    rect: {
      top: Math.max(8, rect.top - 6),
      left: Math.max(8, rect.left - 6),
      width: Math.min(viewportWidth - 16, rect.width + 12),
      height: Math.min(viewportHeight - 16, rect.height + 12),
    },
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
