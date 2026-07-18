import React from "react";
import { Check, Link2, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { patchFocusPageMap } from "../../lib/focusPages.js";
import FocusTextarea from "../FocusTextarea.jsx";
import MediaCarousel from "../MediaCarousel.jsx";

export default function CharacterInspector({
  novel,
  draft,
  readOnly,
  character,
  tags,
  relationship,
}) {
  if (!draft) return <aside className="inspector-card"><p>暂无人物。</p></aside>;

  return (
    <aside className="inspector-card">
      <div className="inspector-head" data-tour="detail-panel-head">
        <Sparkles size={18} />
        <div>
          <span>人物详情</span>
          <h3>{draft.name}</h3>
        </div>
      </div>
      <div className="inspector-scroll">
        <div className="character-editor-top">
          <MediaCarousel
            label="人物图片"
            images={draft.images ?? []}
            onChange={(images) => character.patch({ images })}
            readOnly={readOnly}
          />
          <div className="character-quick-fields character-attribute-grid">
            <label>
              姓名
              <input value={draft.name} readOnly={readOnly} onChange={(event) => character.patch({ name: event.target.value })} />
            </label>
            <label>
              年龄
              <input value={draft.age ?? ""} readOnly={readOnly} onChange={(event) => character.patch({ age: event.target.value })} />
            </label>
            <label className="character-role-field">
              身份 / 属性
              <input value={draft.role} readOnly={readOnly} onChange={(event) => character.patch({ role: event.target.value })} />
            </label>
            <div className="tag-composer">
              <span>标签（可多选）</span>
              <div className="tag-chip-board" ref={tags.boardRef}>
                {tags.available.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    data-tag={tag}
                    className={tags.selected.includes(tag) ? "is-selected" : ""}
                    onClick={() => tags.toggle(tag)}
                    disabled={readOnly}
                  >
                    {tag}
                    {!readOnly && (
                      <i
                        className="tag-chip-remove"
                        role="button"
                        tabIndex={-1}
                        onClick={(event) => tags.remove(tag, event)}
                        onPointerDown={(event) => event.stopPropagation()}
                        aria-label={`删除标签 ${tag}`}
                      >
                        ×
                      </i>
                    )}
                  </button>
                ))}
              </div>
              {!readOnly && (
                <div className="tag-compose-row">
                  <input
                    value={tags.text}
                    onChange={(event) => tags.setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      tags.add();
                    }}
                    placeholder="输入标签，回车生成"
                  />
                  <button type="button" onClick={tags.add} disabled={!tags.text.trim() || tags.paletteSize >= 12}>
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="node-color-picker is-wide">
          <span>星球颜色</span>
          <div>
            {character.colors.map((color) => (
              <button
                type="button"
                key={color}
                className={draft.color === color ? "is-selected" : ""}
                style={{ "--swatch": color }}
                onClick={() => character.chooseColor(color)}
                disabled={readOnly}
                aria-label={`选择颜色 ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="character-long-fields">
          <FocusTextarea
            label="背景故事"
            value={draft.background}
            richText={draft.richText?.background}
            pages={draft.focusPages?.background}
            onPagesChange={(pages, meta) => character.updateFocusPages("background", pages, meta)}
            onChange={(background) => character.patch({ background })}
            onRichTextChange={(background) => character.patch({ richText: { ...(draft.richText ?? {}), background } })}
            onSave={({ value, richText, pages }) => character.save({
              background: value,
              richText: { ...(draft.richText ?? {}), background: richText },
              focusPages: patchFocusPageMap(draft.focusPages, "background", pages),
            })}
            readOnly={readOnly}
          />
          {!readOnly && (
            <FocusTextarea
              label="隐藏设定"
              value={draft.secret}
              richText={draft.richText?.secret}
              pages={draft.focusPages?.secret}
              onPagesChange={(pages, meta) => character.updateFocusPages("secret", pages, meta)}
              onChange={(secret) => character.patch({ secret })}
              onRichTextChange={(secret) => character.patch({ richText: { ...(draft.richText ?? {}), secret } })}
              onSave={({ value, richText, pages }) => character.save({
                secret: value,
                richText: { ...(draft.richText ?? {}), secret: richText },
                focusPages: patchFocusPageMap(draft.focusPages, "secret", pages),
              })}
              readOnly={readOnly}
            />
          )}
        </div>

        {!readOnly && (
          <div className="character-action-row">
            <button type="button" className="primary-button" onClick={() => character.save()}>
              <Save size={16} />
              保存人物
            </button>
            <button type="button" className="danger-lite-button" onClick={character.requestDelete}>
              <Trash2 size={15} />
              删除人物
            </button>
          </div>
        )}

        {!readOnly && (
          <div className="connect-box">
            <div className="panel-title">
              <Link2 size={17} />
              <h4>{relationship.id ? "编辑关系" : "建立关系"}</h4>
            </div>
            <select value={relationship.source} onChange={(event) => relationship.patch({ source: event.target.value })}>
              <option value="">起点人物</option>
              {novel.characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={relationship.target} onChange={(event) => relationship.patch({ target: event.target.value })}>
              <option value="">终点人物</option>
              {novel.characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input value={relationship.label} onChange={(event) => relationship.patch({ label: event.target.value })} placeholder="关系标签" />
            <div className="relation-action-row">
              <button type="button" className="primary-button relation-save-button" onClick={relationship.save}>
                <Check size={15} />
                {relationship.id ? "保存关系" : "添加连线"}
              </button>
              <button type="button" className="danger-lite-button relation-clear-button" onClick={relationship.requestClear}>
                <X size={14} />
                清空所选关系
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
