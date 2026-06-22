import React, { useEffect, useRef } from "react";
import { BookOpen, X } from "lucide-react";
import Sortable from "sortablejs";

const BOOK_ICON_COLORS = ["#4A6357", "#7A3E3E", "#2E4C6D", "#8C6239", "#6C5E7A", "#6F7D5E"];

export default function DraggableNovelList({ novels, activeView, onSelect, onDeleteNovel, onReorderNovel }) {
  const listRef = useRef(null);
  const reorderRef = useRef(onReorderNovel);

  useEffect(() => {
    reorderRef.current = onReorderNovel;
  }, [onReorderNovel]);

  useEffect(() => {
    if (!listRef.current) return undefined;

    const sortable = Sortable.create(listRef.current, {
      animation: 180,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      draggable: ".novel-nav-item",
      fallbackTolerance: 4,
      filter: ".novel-delete-button",
      preventOnFilter: false,
      chosenClass: "novel-sort-chosen",
      dragClass: "novel-sort-drag",
      ghostClass: "novel-sort-ghost",
      onEnd(event) {
        if (event.oldIndex === event.newIndex || event.newIndex == null) return;
        const movedId = event.item?.dataset.novelId;
        if (movedId) reorderRef.current(movedId, event.newIndex);
      },
    });

    return () => sortable.destroy();
  }, [novels.length]);

  return (
    <div ref={listRef} className="draggable-novel-list">
      {novels.map((novel, index) => {
        const itemColor = BOOK_ICON_COLORS[index % BOOK_ICON_COLORS.length];
        const isActive = activeView === novel.id;

        return (
          <div
            key={novel.id}
            data-novel-id={novel.id}
            data-tour={index === 0 ? "demo-novel" : undefined}
            className={`nav-item novel-nav-item ${isActive ? "is-active" : ""}`}
            style={{ "--item-color": itemColor }}
            aria-label={`拖拽调整《${novel.title}》排序`}
            title="拖拽调整小说排序"
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
    </div>
  );
}
