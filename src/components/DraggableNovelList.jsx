import React, { useEffect, useRef, useState } from "react";
import { BookOpen, GripVertical, X } from "lucide-react";
import Sortable from "sortablejs";

const BOOK_ICON_COLORS = ["#4A6357", "#7A3E3E", "#2E4C6D", "#8C6239", "#6C5E7A", "#6F7D5E"];
const TOUCH_NAV_QUERY = "(pointer: coarse)";

export default function DraggableNovelList({ novels, activeView, onSelect, onDeleteNovel, onReorderNovel }) {
  const listRef = useRef(null);
  const reorderRef = useRef(onReorderNovel);
  const [requiresDragHandle, setRequiresDragHandle] = useState(() => getRequiresDragHandle());

  useEffect(() => {
    reorderRef.current = onReorderNovel;
  }, [onReorderNovel]);

  useEffect(() => {
    const media = window.matchMedia?.(TOUCH_NAV_QUERY);
    if (!media) return undefined;

    function syncDragMode() {
      setRequiresDragHandle(media.matches);
    }

    syncDragMode();
    if (media.addEventListener) {
      media.addEventListener("change", syncDragMode);
      return () => media.removeEventListener("change", syncDragMode);
    }
    media.addListener?.(syncDragMode);
    return () => media.removeListener?.(syncDragMode);
  }, []);

  useEffect(() => {
    if (!listRef.current) return undefined;

    const sortableOptions = {
      animation: 180,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      draggable: ".novel-nav-item",
      fallbackTolerance: 4,
      filter: ".novel-delete-button",
      delayOnTouchOnly: true,
      delay: 120,
      touchStartThreshold: 8,
      preventOnFilter: false,
      chosenClass: "novel-sort-chosen",
      dragClass: "novel-sort-drag",
      ghostClass: "novel-sort-ghost",
      onEnd(event) {
        if (event.oldIndex === event.newIndex || event.newIndex == null) return;
        const movedId = event.item?.dataset.novelId;
        if (movedId) reorderRef.current(movedId, event.newIndex);
      },
    };
    if (requiresDragHandle) sortableOptions.handle = ".novel-drag-handle";

    const sortable = Sortable.create(listRef.current, sortableOptions);

    return () => sortable.destroy();
  }, [novels.length, requiresDragHandle]);

  return (
    <div ref={listRef} className="draggable-novel-list">
      {novels.map((novel, index) => {
        // Must come from the novel's own persisted `.color` (same source
        // the AO3 pill and timeline halo/orb/selected-outline already use
        // via --novel-color/--node-color), not the list position - an
        // index-based color reassigns every novel's bookmark tint whenever
        // any novel is reordered, added, or deleted, so it never matched
        // that novel's own AO3/timeline color and looked like it was
        // changing at random.
        const itemColor = novel.color ?? BOOK_ICON_COLORS[index % BOOK_ICON_COLORS.length];
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
            {requiresDragHandle && (
              <span className="novel-drag-handle" aria-hidden="true" title="拖拽调整排序">
                <GripVertical size={14} />
              </span>
            )}
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

function getRequiresDragHandle() {
  if (typeof window === "undefined") return false;
  return Boolean(window.matchMedia?.(TOUCH_NAV_QUERY).matches);
}
