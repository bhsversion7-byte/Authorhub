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
    title: "阅读设置与组件开关",
    body: "作者主页可调整全站字号与字体。第二行的开关控制音乐播放器和草稿本：关闭只隐藏组件并暂停音乐，不会删除草稿内容。夜间模式和隐私模糊仍可独立使用。",
    selector: ".appearance-primary-grid",
    view: "author",
    placement: "right",
  },
  {
    eyebrow: "Step 03",
    title: "用户中心",
    body: "公告中心位于第一排，重要更新与使用方式会集中显示。下方可管理账号、导出备份、清空数据、修改密码、退出登录和打赏入口。",
    selector: ".announcement-center-panel",
    view: "user",
    placement: "right",
  },
  {
    eyebrow: "Step 04",
    title: "浮动工具区",
    body: "右侧是低干扰音乐盒和草稿本入口，两者都可上下拖动。草稿本会自动保存：文本视图支持完整样式；思维图可新增根主题、子主题、同级主题和大子集（重点分支），并自动横向或纵向重排。",
    selector: ".floating-music",
    view: "novel",
    placement: "left",
  },
  {
    eyebrow: "Step 05",
    title: "小说信息与分享",
    body: "这里记录书名、副标题、类型、字数、完结时间和平台入口；分享按钮可生成「共同编辑」或「只读查看」链接。协作提醒会区分作者和协作者，并显示对应 ID。",
    selector: ".novel-section .story-grid",
    view: "novel",
    placement: "top",
  },
  {
    eyebrow: "Step 06",
    title: "文本样式与专注编辑",
    body: "点击文本框右上角的放大按钮进入专注编辑器，再用顶部 Aa 打开完整样式面板；选中文字后右键也能快速处理。Ctrl+B / I / U 控制加粗、斜体、下划线，Alt+D / R / Y / G / B / P 切换颜色。保存后，排版会直接显示在原卡片中；退出时可明确选择丢弃或保存全部更改。",
    selector: ".focus-textarea-label button",
    view: "novel",
    placement: "top",
  },
  {
    eyebrow: "Step 07",
    title: "人物星图与详情",
    body: "单击一个星球只聚焦该人物；选择关系的两个端点时只显示这两个星球及连线，双击星球可放大定位。按住 Shift 拖框后右键可锁定位置，新增人物时不会打乱已排好的节点。",
    selector: ".relation-layout",
    view: "novel",
    placement: "top",
  },
  {
    eyebrow: "Step 08",
    title: "多维交互时间线",
    body: "时间线用来拆解事件顺序、发生背景、具体剧情和参考图片。图片区底部中央按钮可以展开或收起；没有图片时默认收起，减少不需要的占用。",
    selector: ".timeline-panel",
    view: "novel",
    placement: "top",
  },
];

const BUBBLE_WIDTH = 320;
const BUBBLE_HEIGHT = 230;
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
