import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, ListTree, Maximize2, Minimize2, Save, Search } from "lucide-react";

const FocusTextarea = forwardRef(function FocusTextarea(
  { label, value, onChange, onSave, rows = 5, placeholder, readOnly = false, hideLabel = false, remoteDrafts = [], onDraftChange, onDraftClear },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cursorIndex, setCursorIndex] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  // The zen overlay is portaled to <body>, outside .content-shell where the
  // 阅读设置 CSS vars live, so it can't inherit them. Copy the current reading
  // font size + family onto the .zen-editor element when it opens so the
  // 放大 view matches the reading settings exactly (see reading-scale-fixes.css).
  const [zenReadingStyle, setZenReadingStyle] = useState({});
  const textareaRef = useRef(null);
  const composingRef = useRef(false);
  const searchJumpTimerRef = useRef(null);
  const titleId = useId();
  const textValue = String(value ?? "");
  const stats = getTextStats(textValue, cursorIndex);
  const headings = getTextHeadings(textValue);
  const matches = getSearchMatches(textValue, searchQuery);

  useImperativeHandle(ref, () => ({ open: () => setFocused(true) }), []);

  useEffect(() => {
    if (!focused) return;
    const previous = document.body.style.overflow;

    const shell = document.querySelector(".content-shell");
    if (shell) {
      const cs = getComputedStyle(shell);
      const fontSize = cs.getPropertyValue("--editor-font-size").trim();
      const fontFamily = cs.getPropertyValue("--reading-font-family").trim();
      setZenReadingStyle({
        ...(fontSize ? { "--editor-font-size": fontSize, "--field-font-size": fontSize } : {}),
        ...(fontFamily ? { "--reading-font-family": fontFamily } : {}),
      });
    }

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setFocused(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown, true);
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [focused]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!focused || trimmedQuery.length < 2 || !matches.length) return undefined;
    searchJumpTimerRef.current = window.setTimeout(() => {
      const match = matches[0];
      setActiveMatchIndex(0);
      jumpToIndex(match.index, trimmedQuery.length);
    }, 650);
    return () => {
      window.clearTimeout(searchJumpTimerRef.current);
      searchJumpTimerRef.current = null;
    };
  }, [focused, searchQuery, textValue]);

  function updateCursorFrom(event) {
    setCursorIndex(event.target.selectionStart ?? 0);
  }

  function updateValue(event) {
    if (readOnly) return;
    onChange?.(event.target.value);
    updateCursorFrom(event);
    if (!composingRef.current) {
      onDraftChange?.(event.target.value, { cursorIndex: event.target.selectionStart ?? event.target.value.length });
    }
  }

  function handleCompositionStart() {
    composingRef.current = true;
  }

  function handleCompositionEnd(event) {
    composingRef.current = false;
    if (!readOnly) onDraftChange?.(event.target.value, { cursorIndex: event.target.selectionStart ?? event.target.value.length });
  }

  function jumpToIndex(index, length = 0) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(index, index + length);
    setCursorIndex(index);
    const line = textValue.slice(0, index).split("\n").length;
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 24;
    textarea.scrollTop = Math.max(0, (line - 5) * lineHeight);
  }

  function jumpToBoundary(position) {
    jumpToIndex(position === "start" ? 0 : textValue.length);
  }

  function jumpToHeading(heading) {
    jumpToIndex(heading.index);
  }

  function jumpToMatch(direction) {
    if (!matches.length) return;
    const nextIndex = (activeMatchIndex + direction + matches.length) % matches.length;
    setActiveMatchIndex(nextIndex);
    const match = matches[nextIndex];
    jumpToIndex(match.index, searchQuery.trim().length);
  }

  return (
    <div className="focus-textarea-wrap">
      {!hideLabel && (
        <div className="focus-textarea-label">
          <span>{label}</span>
          <button type="button" onClick={() => setFocused(true)} aria-label={readOnly ? `查看${label}` : `专注编辑${label}`}>
            <Maximize2 size={14} />
          </button>
        </div>
      )}
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={updateValue}
        onSelect={updateCursorFrom}
        onKeyUp={updateCursorFrom}
        onClick={updateCursorFrom}
        onBlur={() => onDraftClear?.()}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
      <DraftPreviewList drafts={remoteDrafts} />
      {focused &&
        createPortal(
          <div className="zen-overlay" role="presentation" onMouseDown={() => setFocused(false)}>
            <div
              className={`zen-editor${headings.length ? "" : " has-no-outline"}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              style={zenReadingStyle}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="zen-editor-head">
                <div>
                  <p className="eyebrow">Focus editor</p>
                  <h3 id={titleId}>{label}</h3>
                </div>
                <div className="zen-editor-actions">
                  <button type="button" className="zen-exit-button" onClick={() => setFocused(false)} aria-label="退出专注编辑">
                    <Minimize2 size={17} />
                    退出
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      className="zen-save-button"
                      onClick={() => {
                        onSave?.();
                        setFocused(false);
                      }}
                      aria-label={`保存${label}`}
                    >
                      <Save size={17} />
                      保存
                    </button>
                  )}
                </div>
              </div>
              <div className="zen-editor-tools" aria-label={`${label} 编辑辅助工具`}>
                <label className="zen-search">
                  <Search size={14} />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      jumpToMatch(1);
                    }}
                    placeholder="搜索当前内容"
                  />
                  <span>{matches.length ? `${Math.min(activeMatchIndex + 1, matches.length)}/${matches.length}` : "0/0"}</span>
                </label>
                <div className="zen-tool-buttons">
                  <button type="button" onClick={() => jumpToMatch(-1)} disabled={!matches.length} aria-label="上一个搜索结果">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" onClick={() => jumpToMatch(1)} disabled={!matches.length} aria-label="下一个搜索结果">
                    <ArrowDown size={14} />
                  </button>
                  <button type="button" onClick={() => jumpToBoundary("start")} aria-label="回到开头">
                    顶部
                  </button>
                  <button type="button" onClick={() => jumpToBoundary("end")} aria-label="跳到底部">
                    底部
                  </button>
                </div>
                <div className="zen-editor-stats" aria-label="文本统计">
                  <span>{stats.characters} 字</span>
                  <span>{stats.lines} 行</span>
                  <span>第 {stats.currentLine} 行</span>
                </div>
              </div>
              {headings.length > 0 && (
                <div className="zen-outline" aria-label={`${label} 小标题导航`}>
                  <span>
                    <ListTree size={14} />
                    小标题导航
                  </span>
                  <div>
                    {headings.map((heading) => (
                      <button type="button" key={`${heading.index}-${heading.title}`} onClick={() => jumpToHeading(heading)}>
                        {heading.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="zen-textarea-stack">
                <textarea
                  ref={textareaRef}
                  value={value}
                  readOnly={readOnly}
                  onChange={updateValue}
                  onSelect={updateCursorFrom}
                  onKeyUp={updateCursorFrom}
                  onClick={updateCursorFrom}
                  onBlur={() => onDraftClear?.()}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                />
                <DraftPreviewList drafts={remoteDrafts} compact />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});

export default FocusTextarea;

function DraftPreviewList({ drafts = [], compact = false }) {
  const activeDrafts = drafts.filter((draft) => draft?.tail);
  if (!activeDrafts.length) return null;
  return (
    <div className={`collab-draft-preview${compact ? " is-compact" : ""}`} aria-live="polite" aria-label="协作者正在编辑的片段">
      {activeDrafts.slice(0, 3).map((draft) => (
        <p key={`${draft.userId}-${draft.fieldPath}`} className="collab-draft-ghost" title={`${draft.label || "协作者"}正在编辑`}>
          <em>{draft.tail}</em>
          <i aria-hidden="true" />
        </p>
      ))}
    </div>
  );
}

function getTextStats(value, cursorIndex) {
  const beforeCursor = value.slice(0, cursorIndex);
  return {
    characters: value.replace(/\s/g, "").length,
    lines: value ? value.split("\n").length : 1,
    currentLine: beforeCursor ? beforeCursor.split("\n").length : 1,
  };
}

function getSearchMatches(value, query) {
  const needle = query.trim();
  if (!needle) return [];
  const matches = [];
  let fromIndex = 0;
  const haystack = value.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  while (fromIndex <= haystack.length) {
    const index = haystack.indexOf(lowerNeedle, fromIndex);
    if (index < 0) break;
    matches.push({ index });
    fromIndex = index + Math.max(1, lowerNeedle.length);
    if (matches.length >= 200) break;
  }
  return matches;
}

function getTextHeadings(value) {
  const headings = [];
  let offset = 0;
  value.split("\n").forEach((line, lineIndex) => {
    const trimmed = line.trim();
    const markdownHeading = trimmed.match(/^#{1,4}\s+(.+)/);
    const numberedHeading = trimmed.match(/^(\d+[\.\、]|[一二三四五六七八九十]+[、.])\s*(.+)/);
    const compactHeading = trimmed.length >= 2 && trimmed.length <= 24 && !/[。！？；，,]/.test(trimmed);
    const title = markdownHeading?.[1] ?? numberedHeading?.[2] ?? (compactHeading && lineIndex > 0 ? trimmed : "");
    if (title) headings.push({ title: title.slice(0, 32), index: offset });
    offset += line.length + 1;
  });
  return headings.slice(0, 24);
}
