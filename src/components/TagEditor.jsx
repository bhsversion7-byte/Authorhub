import React, { useState } from "react";
import { Plus, X } from "lucide-react";

export default function TagEditor({ tags = [], onChange }) {
  const [draft, setDraft] = useState("");

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
      <div className="tag-list editable-tags">
        {tags.map((tag) => (
          <span className="theme-tag-chip" key={tag}>
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
