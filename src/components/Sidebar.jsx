import React, { useMemo } from "react";
import { BookOpen, Home, Plus, UserRound, X } from "lucide-react";

const BOOK_ICON_COLORS = ["#4A6357", "#7A3E3E", "#2E4C6D", "#8C6239", "#6C5E7A", "#6F7D5E"];

export default function Sidebar({ novels, width, activeView, onSelect, onAddNovel, onDeleteNovel }) {
  const novelCountLabel = useMemo(() => `${toChineseCount(novels.length)}本小说`, [novels.length]);

  return (
    <aside className="sidebar" style={{ width }}>
      <div className="brand">
        <img className="brand-logo" src="/authorhub-logo.png" alt="AuthorHub" />
        <div>
          <p>Author Hub</p>
          <span>小说创作中台</span>
        </div>
      </div>

      <nav className="nav-stack" aria-label="全局导航">
        <button type="button" data-tour="author-home" onClick={() => onSelect("author")} className={`nav-item is-home ${activeView === "author" ? "is-active" : ""}`}>
          <Home size={16} />
          <span>作者个人主页</span>
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
        {novels.map((novel, index) => {
          const itemColor = BOOK_ICON_COLORS[index % BOOK_ICON_COLORS.length];
          return (
            <div
              key={novel.id}
              data-tour={index === 0 ? "demo-novel" : undefined}
              className={`nav-item novel-nav-item ${activeView === novel.id ? "is-active" : ""}`}
              style={{ "--item-color": itemColor }}
            >
              <button type="button" className="novel-select-button" onClick={() => onSelect(novel.id)}>
                <BookOpen size={16} />
                <span className="novel-nav-title">{novel.title}</span>
              </button>
              <button
                type="button"
                className="novel-delete-button"
                aria-label={`删除 ${novel.title}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDeleteNovel(novel.id);
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
        <button type="button" data-tour="add-novel" className="nav-item add-novel-button" onClick={onAddNovel}>
          <Plus size={16} />
          <span>新增小说</span>
        </button>
      </nav>
    </aside>
  );
}

function toChineseCount(value) {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (value <= 10) return value === 10 ? "十" : digits[value] ?? String(value);
  if (value < 20) return `十${digits[value % 10]}`;
  if (value < 100) {
    const ten = Math.floor(value / 10);
    const unit = value % 10;
    return `${digits[ten]}十${unit ? digits[unit] : ""}`;
  }
  return String(value);
}
