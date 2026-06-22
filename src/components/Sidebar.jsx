import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Home, Plus, UserRound, X } from "lucide-react";
import DraggableNovelList from "./DraggableNovelList.jsx";

export default function Sidebar({ novels, width, activeView, appearance, collapsed = false, onSelect, onAddNovel, onDeleteNovel, onReorderNovel, onToggleCollapse }) {
  const [logoOpen, setLogoOpen] = useState(false);
  const novelCountLabel = useMemo(() => `手稿索引：已创作${novels.length}本小说`, [novels.length]);
  const fontClass = `font-${appearance?.fontFamily ?? "sans"}`;

  return (
    <aside className={`sidebar ${fontClass} ${collapsed ? "is-collapsed" : ""}`} style={{ width, "--editor-font-size": `${appearance?.fontSize ?? 14}px` }}>
      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "展开左侧导航" : "收起左侧导航"}
        title={collapsed ? "展开导航" : "收起导航"}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
      <div className="brand">
        <button type="button" className="logo-wrapper" onClick={() => setLogoOpen(true)} aria-label="放大查看 AuthorHub Logo">
          <img className="brand-logo logo-image" src="/authorhub-logo.png" alt="AuthorHub" />
        </button>
        <div className="brand-text">
          <p>AuthorHub</p>
          <span>私人手稿星图</span>
        </div>
      </div>

      {logoOpen &&
        createPortal(
          <div className="logo-lightbox-overlay" role="dialog" aria-modal="true" aria-label="AuthorHub Logo 预览" onMouseDown={() => setLogoOpen(false)}>
            <div className="lightbox-content" onMouseDown={(event) => event.stopPropagation()}>
              <button type="button" className="logo-preview-close" onClick={() => setLogoOpen(false)} aria-label="关闭 Logo 预览">
                <X size={16} />
              </button>
              <img className="logo-image-zoomed" src="/authorhub-logo.png" alt="AuthorHub Logo enlarged" />
            </div>
          </div>,
          document.body,
        )}

      <nav className="nav-stack" aria-label="手稿导航">
        <button type="button" data-tour="author-home" onClick={() => onSelect("author")} className={`nav-item is-home ${activeView === "author" ? "is-active" : ""}`}>
          <Home size={16} />
          <span>作者主页</span>
        </button>

        <button
          type="button"
          data-tour="user-center-nav"
          onClick={() => onSelect("user")}
          className={`nav-item is-user-center ${activeView === "user" ? "is-active" : ""}`}
        >
          <UserRound size={16} />
          <span>用户中心</span>
        </button>

        <div className="nav-label">{novelCountLabel}</div>
        <DraggableNovelList novels={novels} activeView={activeView} onSelect={onSelect} onDeleteNovel={onDeleteNovel} onReorderNovel={onReorderNovel} />
        <button type="button" data-tour="add-novel" className="nav-item add-novel-button" onClick={onAddNovel}>
          <Plus size={16} />
          <span>添加新小说</span>
        </button>
      </nav>
    </aside>
  );
}
