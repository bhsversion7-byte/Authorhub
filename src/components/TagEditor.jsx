import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import Sortable from "sortablejs";

export default function TagEditor({ tags = [], onChange }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  // Keep the latest tags/onChange in refs so the Sortable instance (created
  // once per list-length change) always reorders against current data.
  const tagsRef = useRef(tags);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Drag-to-reorder, matching the left sidebar novel-list feel (same animation
  // timing + easing, subtle lift/ghost via .tag-sort-* in reading-scale-fixes).
  useEffect(() => {
    if (!listRef.current) return undefined;
    const sortable = Sortable.create(listRef.current, {
      animation: 180,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      draggable: ".theme-tag-chip",
      filter: ".theme-tag-remove",
      preventOnFilter: false,
      delayOnTouchOnly: true,
      delay: 120,
      touchStartThreshold: 8,
      chosenClass: "tag-sort-chosen",
      dragClass: "tag-sort-drag",
      ghostClass: "tag-sort-ghost",
      onEnd(event) {
        if (event.oldIndex === event.newIndex || event.newIndex == null) return;
        const next = [...tagsRef.current];
        const [moved] = next.splice(event.oldIndex, 1);
        next.splice(event.newIndex, 0, moved);
        onChangeRef.current?.(next);
      },
    });
    return () => sortable.destroy();
  }, [tags.length]);

  function addTag() {
    const next = draft.trim();
    if (!next || tags.includes(next)) return;
    onChange([...tags, next]);
    setDraft("");
  }

  function removeTag(tag) {
    onChange(tags.filter((item) => item !== tag));
  }

  return (
    <div className="tag-editor">
      <div className="tag-list editable-tags" ref={listRef}>
        {tags.map((tag) => (
          <span className="theme-tag-chip" data-tag={tag} key={tag}>
            {tag}
            <button type="button" className="theme-tag-remove" onClick={() => removeTag(tag)} title="删除标签" aria-label={`删除主题标签 ${tag}`}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="tag-input-row">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder="新增主题标签"
        />
        <button type="button" onClick={addTag} aria-label="新增标签">
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}
