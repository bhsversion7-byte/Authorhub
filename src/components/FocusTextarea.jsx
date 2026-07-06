import React, { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Sortable from "sortablejs";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus, Save, Search, X } from "lucide-react";

const FocusTextarea = forwardRef(function FocusTextarea(
  {
    label,
    value,
    onChange,
    onSave,
    rows = 5,
    placeholder,
    readOnly = false,
    hideLabel = false,
    remoteDrafts = [],
    onDraftChange,
    onDraftClear,
    pages,
    onPagesChange,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cursorIndex, setCursorIndex] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [activePageId, setActivePageId] = useState("");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [addingPage, setAddingPage] = useState(false);
  const [editingPageId, setEditingPageId] = useState("");
  const [editingPageTitle, setEditingPageTitle] = useState("");
  const [deletePageCandidate, setDeletePageCandidate] = useState(null);
  // The zen overlay is portaled to <body>, outside .content-shell where the
  // 阅读设置 CSS vars live, so it can't inherit them. Copy the current reading
  // font size + family onto the .zen-editor element when it opens so the
  // 放大 view matches the reading settings exactly (see reading-scale-fixes.css).
  const [zenReadingStyle, setZenReadingStyle] = useState({});
  const textareaRef = useRef(null);
  const pageRailRef = useRef(null);
  const reorderPagesRef = useRef(null);
  const composingRef = useRef(false);
  const searchJumpTimerRef = useRef(null);
  const titleId = useId();
  const textValue = String(value ?? "");
  const hasPageNavigation = typeof onPagesChange === "function";
  const normalizedPages = useMemo(() => normalizeFocusPages(pages, textValue, label), [pages, textValue, label]);
  const persistedPages = useMemo(() => serializeFocusPages(normalizedPages), [normalizedPages]);
  const hasCustomPages = hasPageNavigation && persistedPages.length > 0;
  const showPageOutline = hasPageNavigation && (addingPage || hasCustomPages);
  const activePage = normalizedPages.find((page) => page.id === activePageId) ?? normalizedPages[0];
  const editorValue = focused && hasPageNavigation ? activePage?.value ?? "" : textValue;
  const stats = getTextStats(editorValue, cursorIndex);
  const matches = getSearchMatches(editorValue, searchQuery);

  useImperativeHandle(ref, () => ({ open: () => setFocused(true) }), []);

  useEffect(() => {
    if (!normalizedPages.length) return;
    if (!activePageId || !normalizedPages.some((page) => page.id === activePageId)) {
      setActivePageId(normalizedPages[0].id);
    }
  }, [activePageId, normalizedPages]);

  useEffect(() => {
    if (!focused) return;
    const previous = document.body.style.overflow;

    const shell = document.querySelector(".content-shell");
    if (shell) {
      const cs = getComputedStyle(shell);
      const fontSize = cs.getPropertyValue("--editor-font-size").trim();
      const fontFamily = cs.getPropertyValue("--reading-font-family").trim();
      const defaultNovelFont = shell.classList.contains("font-sans")
        ? '"Nimbus Roman", "Nimbus Roman No9 L", "Times New Roman", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", serif'
        : fontFamily;
      setZenReadingStyle({
        ...(fontSize ? { "--editor-font-size": fontSize, "--field-font-size": fontSize } : {}),
        ...(defaultNovelFont ? { "--reading-font-family": defaultNovelFont } : {}),
      });
    }

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (deletePageCandidate) {
        setDeletePageCandidate(null);
        return;
      }
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
  }, [focused, deletePageCandidate]);

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
  }, [focused, searchQuery, editorValue]);

  useEffect(() => {
    if (!focused || !hasPageNavigation || readOnly || !pageRailRef.current) return undefined;
    const sortable = Sortable.create(pageRailRef.current, {
      animation: 180,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      draggable: ".zen-page-tab",
      chosenClass: "zen-page-sort-chosen",
      dragClass: "zen-page-sort-drag",
      ghostClass: "zen-page-sort-ghost",
      onEnd: () => {
        const order = Array.from(pageRailRef.current?.querySelectorAll(".zen-page-tab") ?? [])
          .map((element) => element.getAttribute("data-page-id"))
          .filter(Boolean);
        reorderPagesRef.current?.(order);
      },
    });
    return () => sortable.destroy();
  }, [focused, hasPageNavigation, readOnly, normalizedPages.length]);

  reorderPagesRef.current = (order) => {
    const byId = new Map(normalizedPages.map((page) => [page.id, page]));
    const ordered = order.map((id) => byId.get(id)).filter(Boolean);
    const missing = normalizedPages.filter((page) => !order.includes(page.id));
    commitPages([...ordered, ...missing], activePageId);
  };

  function updateCursorFrom(event) {
    setCursorIndex(event.target.selectionStart ?? 0);
  }

  function updateCompactValue(event) {
    if (readOnly) return;
    const nextValue = event.target.value;
    onChange?.(nextValue);
    if (hasCustomPages) {
      onPagesChange?.([]);
    }
    updateCursorFrom(event);
    if (!composingRef.current) {
      onDraftChange?.(nextValue, { cursorIndex: event.target.selectionStart ?? nextValue.length });
    }
  }

  function updateZenValue(event) {
    if (readOnly) return;
    const nextValue = event.target.value;
    if (hasPageNavigation) {
      const nextPages = normalizedPages.map((page) => (page.id === activePage?.id ? { ...page, value: nextValue } : page));
      commitPages(nextPages, activePage?.id);
    } else {
      onChange?.(nextValue);
    }
    updateCursorFrom(event);
    if (!composingRef.current) {
      onDraftChange?.(nextValue, { cursorIndex: event.target.selectionStart ?? nextValue.length });
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
    const line = editorValue.slice(0, index).split("\n").length;
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 24;
    textarea.scrollTop = Math.max(0, (line - 5) * lineHeight);
  }

  function jumpToMatch(direction) {
    if (!matches.length) return;
    const nextIndex = (activeMatchIndex + direction + matches.length) % matches.length;
    setActiveMatchIndex(nextIndex);
    const match = matches[nextIndex];
    jumpToIndex(match.index, searchQuery.trim().length);
  }

  function commitPages(nextPages, preferredActiveId) {
    const cleaned = normalizeFocusPages(nextPages, "", label);
    const nextPersistedPages = serializeFocusPages(cleaned);
    onPagesChange?.(nextPersistedPages);
    onChange?.(combineFocusPages(cleaned));
    setActivePageId(preferredActiveId || nextPersistedPages[0]?.id || cleaned[0]?.id || "");
  }

  function createPage() {
    if (readOnly || !hasPageNavigation) return;
    const customPageCount = normalizedPages.filter((page) => page.id !== "page-main").length;
    const title = newPageTitle.trim() || `小标题 ${customPageCount + 1}`;
    const id = createPageId();
    const activeIndex = Math.max(0, normalizedPages.findIndex((page) => page.id === activePage?.id));
    const nextPages = [...normalizedPages];
    nextPages.splice(activeIndex + 1, 0, { id, title: title.slice(0, 36), value: "" });
    commitPages(nextPages, id);
    setNewPageTitle("");
    setAddingPage(false);
    window.setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function requestDeletePage(event, page) {
    event.stopPropagation();
    if (readOnly || !hasPageNavigation) return;
    setDeletePageCandidate(page);
  }

  function confirmDeletePage() {
    if (!deletePageCandidate || readOnly || !hasPageNavigation) return;
    const deleteIndex = normalizedPages.findIndex((page) => page.id === deletePageCandidate.id);
    const nextPages = normalizedPages.filter((page) => page.id !== deletePageCandidate.id);
    const nextActivePage = deletePageCandidate.id === activePage?.id ? nextPages[Math.min(Math.max(deleteIndex, 0), nextPages.length - 1)] : activePage;
    commitPages(nextPages, nextActivePage?.id);
    setDeletePageCandidate(null);
  }

  function beginRenamePage(page) {
    if (readOnly || !hasPageNavigation) return;
    setEditingPageId(page.id);
    setEditingPageTitle(page.title);
  }

  function finishRenamePage(pageId) {
    if (readOnly || !hasPageNavigation) return;
    const title = editingPageTitle.trim();
    if (title) {
      commitPages(normalizedPages.map((page) => (page.id === pageId ? { ...page, title: title.slice(0, 36) } : page)), pageId);
    }
    setEditingPageId("");
    setEditingPageTitle("");
  }

  function jumpPage(direction) {
    if (!normalizedPages.length) return;
    const index = Math.max(0, normalizedPages.findIndex((page) => page.id === activePage?.id));
    const nextIndex = Math.min(normalizedPages.length - 1, Math.max(0, index + direction));
    setActivePageId(normalizedPages[nextIndex].id);
    setCursorIndex(0);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(0, 0);
      if (textareaRef.current) textareaRef.current.scrollTop = 0;
    }, 50);
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
        onChange={updateCompactValue}
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
              className={`zen-editor${showPageOutline ? "" : " has-no-outline"}`}
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
                {!readOnly && hasPageNavigation && (
                  <button type="button" className="zen-new-page-button" onClick={() => setAddingPage((current) => !current)}>
                    <Plus size={14} />
                    新建小标题
                  </button>
                )}
                <div className="zen-editor-stats" aria-label="文本统计">
                  <span>{stats.characters} 字</span>
                  <span>{stats.lines} 行</span>
                  <span>第 {stats.currentLine} 行</span>
                </div>
              </div>
              {showPageOutline && (
                <div className="zen-outline" aria-label={`${label} 小标题导航`}>
                  {addingPage && !readOnly && (
                    <form
                      className="zen-new-page-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        createPage();
                      }}
                    >
                      <input value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)} placeholder="输入小标题标题" autoFocus />
                      <button type="submit">添加</button>
                    </form>
                  )}
                  {hasCustomPages && (
                    <div className="zen-page-strip">
                      <button
                        type="button"
                        className="zen-page-edge-button"
                        onClick={() => jumpPage(-1)}
                        disabled={normalizedPages.length < 2 || normalizedPages[0]?.id === activePage?.id}
                        aria-label="上一页"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <div className="zen-page-rail" ref={pageRailRef} aria-label="小标题页">
                        {normalizedPages.map((page) => (
                          <div
                            key={page.id}
                            role="button"
                            tabIndex={0}
                            data-page-id={page.id}
                            className={`zen-page-tab${page.id === activePage?.id ? " is-active" : ""}`}
                            onClick={(event) => {
                              if (event.detail >= 2) {
                                beginRenamePage(page);
                                return;
                              }
                              setActivePageId(page.id);
                            }}
                            onDoubleClick={() => beginRenamePage(page)}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter" && event.key !== " ") return;
                              event.preventDefault();
                              setActivePageId(page.id);
                            }}
                          >
                            {editingPageId === page.id ? (
                              <input
                                value={editingPageTitle}
                                onChange={(event) => setEditingPageTitle(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => event.stopPropagation()}
                                onBlur={() => finishRenamePage(page.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    finishRenamePage(page.id);
                                  }
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    setEditingPageId("");
                                    setEditingPageTitle("");
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <span>
                                <i aria-hidden="true">·</i>
                                {page.title}
                              </span>
                            )}
                            {!readOnly && editingPageId !== page.id && (
                              <button
                                type="button"
                                className="zen-page-remove"
                                onClick={(event) => requestDeletePage(event, page)}
                                aria-label={`删除小标题 ${page.title}`}
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="zen-page-edge-button"
                        onClick={() => jumpPage(1)}
                        disabled={normalizedPages.length < 2 || normalizedPages[normalizedPages.length - 1]?.id === activePage?.id}
                        aria-label="下一页"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="zen-textarea-stack">
                <textarea
                  ref={textareaRef}
                  value={editorValue}
                  readOnly={readOnly}
                  onChange={updateZenValue}
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
      {focused &&
        deletePageCandidate &&
        createPortal(
          <div className="modal-backdrop zen-delete-page-backdrop" role="presentation" onMouseDown={() => setDeletePageCandidate(null)}>
            <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-focus-page-title" onMouseDown={(event) => event.stopPropagation()}>
              <p className="eyebrow">删除小标题</p>
              <h2 id="delete-focus-page-title">是否确定删除这个小标题？</h2>
              <p>删除后，“{deletePageCandidate.title}”以及该小标题内的正文会从当前内容中移除，并同步到云端保存。</p>
              <div className="confirm-actions">
                <button type="button" className="ghost-button" onClick={() => setDeletePageCandidate(null)}>
                  取消
                </button>
                <button type="button" className="danger-button" onClick={confirmDeletePage}>
                  确定删除
                </button>
              </div>
            </section>
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

function normalizeFocusPages(pages, fallbackValue, label) {
  const validPages = Array.isArray(pages)
    ? pages
        .map((page, index) => ({
          id: String(page?.id || `page-${index + 1}`),
          title: String(page?.title || (index === 0 ? "全文" : `${label || "内容"} ${index + 1}`)).slice(0, 36),
          value: String(page?.value ?? ""),
        }))
        .filter((page) => page.id)
    : [];
  return validPages.length ? validPages : [{ id: "page-main", title: "全文", value: String(fallbackValue ?? "") }];
}

// Both call sites always pass an already-`normalizeFocusPages`-processed
// array, so re-running the full normalize pass here (map + filter over
// every page, on every keystroke) was pure redundant work with no effect on
// the result - just check the "still just the default placeholder" case
// directly, found in the 2026-07-07 performance audit.
function serializeFocusPages(pages) {
  if (pages.length === 1 && pages[0].id === "page-main") return [];
  return pages;
}

function combineFocusPages(pages) {
  return normalizeFocusPages(pages, "", "").map((page) => page.value).join("\n\n").trimEnd();
}

function createPageId() {
  return `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
