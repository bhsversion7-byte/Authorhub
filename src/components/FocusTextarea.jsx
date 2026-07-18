import React, { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Sortable from "sortablejs";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus, Save, Search, X } from "lucide-react";
import { appendFocusPage } from "../lib/focusPages.js";
import { createRichTextDocument, richTextToPlainText, sanitizeRichTextHtml } from "../lib/richTextModel.js";
import { formatCollaborationActor } from "../lib/sharedCollaboration.js";
import RichTextSurface from "./rich-text/RichTextSurface.jsx";
import TextStylePopover from "./rich-text/TextStylePopover.jsx";

const FocusTextarea = forwardRef(function FocusTextarea(
  {
    label,
    value,
    richText,
    onChange,
    onRichTextChange,
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
    storageKey,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [zenStylesOpen, setZenStylesOpen] = useState(false);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cursorIndex, setCursorIndex] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [activePageId, setActivePageId] = useState("");
  const [zenPages, setZenPages] = useState([]);
  const [zenBaseSignature, setZenBaseSignature] = useState("");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [addingPage, setAddingPage] = useState(false);
  const [editingPageId, setEditingPageId] = useState("");
  const [editingPageTitle, setEditingPageTitle] = useState("");
  const [deletePageCandidate, setDeletePageCandidate] = useState(null);
  const [zenReadingStyle, setZenReadingStyle] = useState({});
  const [zenScrollCompact, setZenScrollCompact] = useState(false);
  const [zenEditor, setZenEditor] = useState(null);
  const [compactHeight, setCompactHeight] = useState(() => getCompactHeight(storageKey || label, rows));
  const zenSurfaceRef = useRef(null);
  const zenStyleButtonRef = useRef(null);
  const pageRailRef = useRef(null);
  const reorderPagesRef = useRef(null);
  const searchJumpTimerRef = useRef(null);
  const titleId = useId();
  const exitTitleId = useId();
  const textValue = String(value ?? "");
  const compactHeightKey = getCompactHeightKey(storageKey || label);
  const hasPageNavigation = typeof onPagesChange === "function";
  const externalPages = useMemo(
    () => normalizeFocusPages(pages, textValue, richText, label),
    [pages, textValue, richText?.version, richText?.html, label],
  );
  const workingPages = focused ? zenPages : externalPages;
  const persistedPages = serializeFocusPages(workingPages);
  const hasCustomPages = hasPageNavigation && persistedPages.length > 0;
  const showPageOutline = hasPageNavigation && (addingPage || hasCustomPages);
  const activePage = workingPages.find((page) => page.id === activePageId) ?? workingPages[0];
  const editorValue = activePage?.value ?? textValue;
  const editorDocument = activePage?.richText ?? createRichTextDocument(richText, editorValue);
  const stats = getTextStats(editorValue, cursorIndex);
  const matches = getSearchMatches(editorValue, searchQuery);
  const zenDirty = focused && createPagesSignature(zenPages) !== zenBaseSignature;

  useImperativeHandle(ref, () => ({ open: openZenEditor }), [externalPages]);

  useEffect(() => {
    if (!workingPages.length) return;
    if (!activePageId || !workingPages.some((page) => page.id === activePageId)) setActivePageId(workingPages[0].id);
  }, [activePageId, workingPages]);

  useEffect(() => {
    setCompactHeight(getCompactHeight(storageKey || label, rows));
  }, [storageKey, label, rows]);

  useEffect(() => {
    if (!focused) return undefined;
    const previousOverflow = document.body.style.overflow;
    copyReadingStyle();
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (deletePageCandidate) return setDeletePageCandidate(null);
      if (unsavedExitOpen) return setUnsavedExitOpen(false);
      requestCloseZen();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown, true);
    const timer = window.setTimeout(() => zenSurfaceRef.current?.focus(), 80);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [focused, deletePageCandidate, unsavedExitOpen, zenDirty]);

  useEffect(() => setActiveMatchIndex(0), [searchQuery]);

  useEffect(() => {
    const needle = searchQuery.trim();
    if (!focused || needle.length < 2 || !matches.length) return undefined;
    searchJumpTimerRef.current = window.setTimeout(() => jumpToIndex(matches[0].index, needle.length), 500);
    return () => window.clearTimeout(searchJumpTimerRef.current);
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
  }, [focused, hasPageNavigation, readOnly, workingPages.length]);

  reorderPagesRef.current = (order) => {
    const byId = new Map(zenPages.map((page) => [page.id, page]));
    const ordered = order.map((id) => byId.get(id)).filter(Boolean);
    const missing = zenPages.filter((page) => !order.includes(page.id));
    updateZenPages([...ordered, ...missing], activePageId);
  };

  function openZenEditor() {
    const snapshot = externalPages.map(cloneFocusPage);
    setZenPages(snapshot);
    setZenBaseSignature(createPagesSignature(snapshot));
    setActivePageId(snapshot[0]?.id ?? "page-main");
    setSearchQuery("");
    setCursorIndex(0);
    setFocused(true);
  }

  function requestCloseZen() {
    if (!readOnly && zenDirty) setUnsavedExitOpen(true);
    else closeZen();
  }

  function closeZen() {
    setFocused(false);
    setUnsavedExitOpen(false);
    setDeletePageCandidate(null);
    setAddingPage(false);
    setZenStylesOpen(false);
    setZenScrollCompact(false);
    setZenPages([]);
    onDraftClear?.();
  }

  function saveZen() {
    if (readOnly) return closeZen();
    const cleaned = normalizeFocusPages(zenPages, "", undefined, label);
    const nextPages = serializeFocusPages(cleaned);
    const nextValue = combineFocusPages(cleaned);
    const nextRichText = combineFocusPageDocuments(cleaned);
    if (hasPageNavigation) onPagesChange?.(nextPages, { isStructural: true });
    onChange?.(nextValue);
    onRichTextChange?.(nextRichText);
    onSave?.({ value: nextValue, richText: nextRichText, pages: nextPages });
    closeZen();
  }

  function updateCompactValue(nextDocument, nextValue, nextCursorIndex) {
    if (readOnly) return;
    onChange?.(nextValue);
    onRichTextChange?.(nextDocument);
    if (serializeFocusPages(externalPages).length) onPagesChange?.([], { isStructural: true });
    setCursorIndex(nextCursorIndex);
    onDraftChange?.(nextValue, { cursorIndex: nextCursorIndex });
  }

  function persistCompactHeight(nextHeight) {
    const height = clampCompactHeight(nextHeight, rows);
    if (height === compactHeight) return;
    setCompactHeight(height);
    try {
      window.localStorage.setItem(compactHeightKey, String(height));
    } catch {
      // The editor stays usable when local storage is unavailable.
    }
  }

  function updateZenValue(nextDocument, nextValue, nextCursorIndex) {
    if (readOnly || !activePage) return;
    const nextPages = zenPages.map((page) => page.id === activePage.id
      ? { ...page, value: nextValue, richText: nextDocument }
      : page);
    setZenPages(nextPages);
    setCursorIndex(nextCursorIndex);
    onDraftChange?.(nextValue, { cursorIndex: nextCursorIndex });
  }

  function updateZenPages(nextPages, preferredActiveId) {
    const cleaned = normalizeFocusPages(nextPages, "", undefined, label);
    setZenPages(cleaned);
    setActivePageId(preferredActiveId || cleaned[0]?.id || "");
  }

  function createPage() {
    if (readOnly || !hasPageNavigation) return;
    const customPageCount = zenPages.filter((page) => page.id !== "page-main").length;
    const title = newPageTitle.trim() || `小标题 ${customPageCount + 1}`;
    const id = createPageId();
    const nextPages = appendFocusPage(zenPages, {
      id,
      title: title.slice(0, 36),
      value: "",
      richText: createRichTextDocument(undefined, ""),
    });
    updateZenPages(nextPages, id);
    setNewPageTitle("");
    setAddingPage(false);
    window.setTimeout(() => zenSurfaceRef.current?.focus(), 50);
  }

  function confirmDeletePage() {
    if (!deletePageCandidate || readOnly) return;
    const deleteIndex = zenPages.findIndex((page) => page.id === deletePageCandidate.id);
    const nextPages = zenPages.filter((page) => page.id !== deletePageCandidate.id);
    const nextActive = deletePageCandidate.id === activePage?.id
      ? nextPages[Math.min(Math.max(deleteIndex, 0), nextPages.length - 1)]
      : activePage;
    updateZenPages(nextPages, nextActive?.id);
    setDeletePageCandidate(null);
  }

  function finishRenamePage(pageId) {
    if (readOnly) return;
    const title = editingPageTitle.trim();
    if (title) updateZenPages(zenPages.map((page) => page.id === pageId ? { ...page, title: title.slice(0, 36) } : page), pageId);
    setEditingPageId("");
    setEditingPageTitle("");
  }

  function jumpPage(direction) {
    const index = Math.max(0, zenPages.findIndex((page) => page.id === activePage?.id));
    const nextIndex = Math.min(zenPages.length - 1, Math.max(0, index + direction));
    setActivePageId(zenPages[nextIndex]?.id ?? "");
    setCursorIndex(0);
    setZenScrollCompact(false);
    window.setTimeout(() => zenSurfaceRef.current?.focus(), 50);
  }

  function jumpToIndex(index, length = 0) {
    zenSurfaceRef.current?.jumpToText(index, length);
    setCursorIndex(index);
  }

  function jumpToMatch(direction) {
    if (!matches.length) return;
    const nextIndex = (activeMatchIndex + direction + matches.length) % matches.length;
    setActiveMatchIndex(nextIndex);
    jumpToIndex(matches[nextIndex].index, searchQuery.trim().length);
  }

  function copyReadingStyle() {
    const shell = document.querySelector(".content-shell");
    if (!shell) return;
    const styles = getComputedStyle(shell);
    const fontSize = styles.getPropertyValue("--editor-font-size").trim();
    const fontFamily = styles.getPropertyValue("--reading-font-family").trim();
    const defaultNovelFont = shell.classList.contains("font-sans")
      ? '"Nimbus Roman", "Nimbus Roman No9 L", "Times New Roman", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", serif'
      : fontFamily;
    setZenReadingStyle({
      ...(fontSize ? { "--editor-font-size": fontSize, "--field-font-size": fontSize } : {}),
      ...(defaultNovelFont ? { "--reading-font-family": defaultNovelFont } : {}),
    });
  }

  return (
    <div className="focus-textarea-wrap">
      {!hideLabel && (
        <div className="focus-textarea-label">
          <span>{label}</span>
          <button type="button" onClick={openZenEditor} aria-label={readOnly ? `查看${label}` : `专注编辑${label}`}>
            <Maximize2 size={14} />
          </button>
        </div>
      )}
      <div className="compact-rich-editor">
        <RichTextSurface
          documentValue={richText}
          fallbackText={textValue}
          onChange={updateCompactValue}
          onBlur={onDraftClear}
          placeholder={placeholder}
          readOnly={readOnly}
          className="compact-rich-text-surface"
          ariaLabel={label}
          style={{ height: `${compactHeight}px`, minHeight: `${rows * 1.5}em` }}
          onPointerUp={(event) => persistCompactHeight(event.currentTarget.offsetHeight)}
        />
      </div>
      <DraftPreviewList drafts={remoteDrafts} />

      {focused && createPortal(
        <div className="zen-overlay" role="presentation" onMouseDown={requestCloseZen}>
          <div
            className={`zen-editor${showPageOutline ? "" : " has-no-outline"}${zenScrollCompact ? " is-scroll-compact" : ""}`}
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
                {!readOnly && (
                  <button ref={zenStyleButtonRef} type="button" className="zen-style-button" onClick={() => setZenStylesOpen((open) => !open)} aria-expanded={zenStylesOpen}>
                    <span aria-hidden="true">Aa</span>
                    文本样式
                  </button>
                )}
                <button type="button" className="zen-exit-button" onClick={requestCloseZen} aria-label="退出专注编辑">
                  <Minimize2 size={17} />退出
                </button>
                {!readOnly && (
                  <button type="button" className="zen-save-button" onClick={saveZen} aria-label={`保存${label}`}>
                    <Save size={17} />保存
                  </button>
                )}
              </div>
            </div>

            <TextStylePopover
              open={zenStylesOpen && !readOnly}
              anchorRef={zenStyleButtonRef}
              editor={zenEditor}
              onClose={() => setZenStylesOpen(false)}
              ariaLabel="完整文本样式"
            />

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
                  <Plus size={14} />新建小标题
                </button>
              )}
              <div className="zen-editor-stats" aria-label="文本统计">
                <span>{stats.characters} 字</span><span>{stats.lines} 行</span><span>第 {stats.currentLine} 行</span>
              </div>
            </div>

            {showPageOutline && (
              <div className="zen-outline" aria-label={`${label} 小标题导航`}>
                {addingPage && !readOnly && (
                  <form className="zen-new-page-form" onSubmit={(event) => { event.preventDefault(); createPage(); }}>
                    <input value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)} placeholder="输入小标题标题" autoFocus />
                    <button type="submit">添加</button>
                  </form>
                )}
                {hasCustomPages && (
                  <div className="zen-page-strip">
                    <button type="button" className="zen-page-edge-button" onClick={() => jumpPage(-1)} disabled={zenPages[0]?.id === activePage?.id} aria-label="上一页">
                      <ChevronLeft size={14} />
                    </button>
                    <div className="zen-page-rail" ref={pageRailRef} aria-label="小标题页">
                      {zenPages.map((page) => (
                        <div
                          key={page.id}
                          role="button"
                          tabIndex={0}
                          data-page-id={page.id}
                          className={`zen-page-tab${page.id === activePage?.id ? " is-active" : ""}`}
                          onClick={(event) => event.detail >= 2 ? (setEditingPageId(page.id), setEditingPageTitle(page.title)) : setActivePageId(page.id)}
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
                              onBlur={() => finishRenamePage(page.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") { event.preventDefault(); finishRenamePage(page.id); }
                                if (event.key === "Escape") { event.preventDefault(); setEditingPageId(""); setEditingPageTitle(""); }
                              }}
                              autoFocus
                            />
                          ) : <span><i aria-hidden="true">·</i>{page.title}</span>}
                          {!readOnly && editingPageId !== page.id && (
                            <button type="button" className="zen-page-remove" onClick={(event) => { event.stopPropagation(); setDeletePageCandidate(page); }} aria-label={`删除小标题 ${page.title}`}>
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="zen-page-edge-button" onClick={() => jumpPage(1)} disabled={zenPages.at(-1)?.id === activePage?.id} aria-label="下一页">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="zen-textarea-stack">
              <RichTextSurface
                key={activePage?.id}
                ref={zenSurfaceRef}
                documentValue={editorDocument}
                fallbackText={editorValue}
                onChange={updateZenValue}
                onBlur={onDraftClear}
                onScroll={(event) => {
                  const top = event.currentTarget.scrollTop;
                  if (top > 24) setZenScrollCompact(true);
                  else if (top <= 4) setZenScrollCompact(false);
                }}
                readOnly={readOnly}
                className="zen-rich-text-surface"
                ariaLabel={`${label}正文`}
                onEditorReady={setZenEditor}
              />
              <DraftPreviewList drafts={remoteDrafts} compact />
            </div>
          </div>
        </div>,
        document.body,
      )}

      {focused && deletePageCandidate && createPortal(
        <div className="modal-backdrop zen-delete-page-backdrop" role="presentation" onMouseDown={() => setDeletePageCandidate(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-focus-page-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">删除小标题</p>
            <h2 id="delete-focus-page-title">是否确定删除这个小标题？</h2>
            <p>删除后，“{deletePageCandidate.title}”以及该小标题内的正文会被移除；保存本次编辑后同步到云端。</p>
            <div className="confirm-actions">
              <button type="button" className="ghost-button" onClick={() => setDeletePageCandidate(null)}>取消</button>
              <button type="button" className="danger-button" onClick={confirmDeletePage}>确定删除</button>
            </div>
          </section>
        </div>,
        document.body,
      )}

      {focused && unsavedExitOpen && createPortal(
        <div className="modal-backdrop zen-unsaved-backdrop" role="presentation" onMouseDown={() => setUnsavedExitOpen(false)}>
          <section className="confirm-modal zen-unsaved-modal" role="dialog" aria-modal="true" aria-labelledby={exitTitleId} onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">尚未保存</p>
            <h2 id={exitTitleId}>要保存这次修改吗？</h2>
            <p>“取消并退出”会丢弃本次专注编辑中的全部更改；“保存并退出”会保存全部更改。</p>
            <div className="confirm-actions">
              <button type="button" className="ghost-button" onClick={closeZen}>取消并退出</button>
              <button type="button" className="primary-button" onClick={saveZen}>保存并退出</button>
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
        <p
          key={`${draft.userId}-${draft.fieldPath}`}
          className="collab-draft-ghost"
          title={`${formatCollaborationActor({ label: draft.label, userId: draft.userId, actorRole: draft.actorRole })}正在编辑`}
        >
          <em>{draft.tail}</em><i aria-hidden="true" />
        </p>
      ))}
    </div>
  );
}

function normalizeFocusPages(pages, fallbackValue, fallbackRichText, label) {
  const validPages = Array.isArray(pages)
    ? pages.map((page, index) => {
        const value = String(page?.value ?? "");
        return {
          id: String(page?.id || `page-${index + 1}`),
          title: String(page?.title || (index === 0 ? "全文" : `${label || "内容"} ${index + 1}`)).slice(0, 36),
          value,
          richText: createRichTextDocument(page?.richText, value),
        };
      }).filter((page) => page.id)
    : [];
  if (validPages.length) return validPages;
  const value = String(fallbackValue ?? "");
  return [{ id: "page-main", title: "全文", value, richText: createRichTextDocument(fallbackRichText, value) }];
}

function serializeFocusPages(pages) {
  if (pages.length === 1 && pages[0].id === "page-main") return [];
  return pages.map(cloneFocusPage);
}

function cloneFocusPage(page) {
  return {
    id: page.id,
    title: page.title,
    value: String(page.value ?? ""),
    richText: createRichTextDocument(page.richText, page.value),
  };
}

function combineFocusPages(pages) {
  return pages.map((page) => page.value).join("\n\n");
}

function combineFocusPageDocuments(pages) {
  if (pages.length === 1) return createRichTextDocument(pages[0].richText, pages[0].value);
  const html = pages.map((page) => createRichTextDocument(page.richText, page.value).html).join("<p><br></p>");
  return { version: 1, html: sanitizeRichTextHtml(html) };
}

function createPagesSignature(pages) {
  return JSON.stringify(pages.map((page) => [page.id, page.title, page.value, createRichTextDocument(page.richText, page.value).html]));
}

function getTextStats(value, cursorIndex) {
  const text = String(value ?? "");
  const beforeCursor = text.slice(0, cursorIndex);
  return {
    characters: text.replace(/\s/g, "").length,
    lines: text ? text.split("\n").length : 1,
    currentLine: beforeCursor ? beforeCursor.split("\n").length : 1,
  };
}

function getSearchMatches(value, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const haystack = String(value ?? "").toLowerCase();
  const matches = [];
  let fromIndex = 0;
  while (fromIndex <= haystack.length) {
    const index = haystack.indexOf(needle, fromIndex);
    if (index < 0) break;
    matches.push({ index });
    fromIndex = index + Math.max(1, needle.length);
    if (matches.length >= 200) break;
  }
  return matches;
}

function createPageId() {
  return `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getCompactHeightKey(key) {
  return `author-hub-compact-editor-height:${String(key || "default").slice(0, 120)}`;
}

function clampCompactHeight(value, rows) {
  const minimum = Math.max(150, Number(rows || 5) * 26);
  const maximum = Math.min(560, Math.max(minimum, window.innerHeight * 0.62));
  return Math.round(Math.max(minimum, Math.min(maximum, Number(value) || minimum)));
}

function getCompactHeight(key, rows) {
  const minimum = Math.max(150, Number(rows || 5) * 26);
  try {
    return clampCompactHeight(window.localStorage.getItem(getCompactHeightKey(key)), rows);
  } catch {
    return minimum;
  }
}
