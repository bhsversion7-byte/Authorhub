import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@xyflow/react/dist/style.css";
import { BrainCircuit, FileText, Save, X } from "lucide-react";
import RichTextSurface from "./rich-text/RichTextSurface.jsx";
import TextStylePopover from "./rich-text/TextStylePopover.jsx";
import ScratchpadMindMap from "./scratchpad/ScratchpadMindMap.jsx";
import { getScratchpadReadingStyle } from "../lib/scratchpadAppearance.js";
import { cacheScratchpad, createEmptyScratchpad, loadScratchpad, saveScratchpad } from "../lib/scratchpadStore.js";

const SAVE_DELAY = 1200;

export default function Scratchpad({ user, appearance = {}, open, onClose }) {
  const [scratchpad, setScratchpad] = useState(createEmptyScratchpad);
  const [loading, setLoading] = useState(true);
  const [conflict, setConflict] = useState(false);
  const [noteEditor, setNoteEditor] = useState(null);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const saveTimerRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const savePromiseRef = useRef(null);
  const cloudRevisionRef = useRef(0);
  const mountedRef = useRef(true);
  const scratchpadRef = useRef(scratchpad);
  const userRef = useRef(user);
  const textTabRef = useRef(null);

  useEffect(() => {
    scratchpadRef.current = scratchpad;
  }, [scratchpad]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(saveTimerRef.current);
      const pending = pendingSaveRef.current;
      if (pending && !savePromiseRef.current) void saveScratchpad(pending, userRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true);
    loadScratchpad(user).then((loaded) => {
      if (!active) return;
      scratchpadRef.current = loaded;
      cloudRevisionRef.current = loaded.revision;
      setScratchpad(loaded);
      setLoading(false);
      if (loaded.pendingSync) {
        pendingSaveRef.current = loaded;
        scheduleSave();
      }
    });
    return () => {
      active = false;
    };
  }, [open, user?.id]);

  useEffect(() => {
    function flushOnLeave() {
      if (document.visibilityState === "hidden") flushSave();
    }
    window.addEventListener("pagehide", flushOnLeave);
    document.addEventListener("visibilitychange", flushOnLeave);
    return () => {
      window.removeEventListener("pagehide", flushOnLeave);
      document.removeEventListener("visibilitychange", flushOnLeave);
    };
  }, []);

  if (!open) return null;

  function update(next, { immediate = false } = {}) {
    const cached = cacheScratchpad(next, user);
    scratchpadRef.current = cached;
    pendingSaveRef.current = cached;
    setScratchpad(cached);
    setConflict(false);
    setSaveStatus("pending");
    if (immediate) {
      void flushSave();
      return;
    }
    scheduleSave();
  }

  function scheduleSave() {
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => void flushSave(), SAVE_DELAY);
  }

  function flushSave() {
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    if (!pendingSaveRef.current) return savePromiseRef.current ?? Promise.resolve();
    if (savePromiseRef.current) return savePromiseRef.current;

    savePromiseRef.current = (async () => {
      while (pendingSaveRef.current) {
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        const next = { ...pending, revision: cloudRevisionRef.current };
        if (mountedRef.current) setSaveStatus("saving");
        const result = await saveScratchpad(next, userRef.current);

        if (result.conflict || result.error) {
          const preserved = pendingSaveRef.current ?? result.scratchpad;
          pendingSaveRef.current = preserved;
          scratchpadRef.current = preserved;
          if (mountedRef.current) {
            setScratchpad(preserved);
            setConflict(Boolean(result.conflict));
            setSaveStatus(result.conflict ? "conflict" : "local");
          }
          break;
        }

        cloudRevisionRef.current = result.scratchpad.revision;
        if (pendingSaveRef.current) continue;
        scratchpadRef.current = result.scratchpad;
        if (mountedRef.current) {
          setScratchpad(result.scratchpad);
          setConflict(false);
          setSaveStatus("saved");
        }
      }
    })().finally(() => {
      savePromiseRef.current = null;
    });
    return savePromiseRef.current;
  }

  function close() {
    void flushSave();
    setStylesOpen(false);
    onClose?.();
  }

  function setMode(activeMode) {
    if (loading) return;
    if (activeMode !== "note") setStylesOpen(false);
    update({ ...scratchpadRef.current, activeMode }, { immediate: true });
  }

  function openTextStyles() {
    if (loading) return;
    const enteringTextMode = scratchpadRef.current.activeMode !== "note";
    if (enteringTextMode) setMode("note");
    setStylesOpen((current) => enteringTextMode || !current);
  }

  function updateNote(note) {
    update({ ...scratchpadRef.current, note });
  }

  return createPortal(
    <div className="scratchpad-backdrop" role="presentation" onMouseDown={close}>
      <section
        className={`scratchpad-workspace font-${appearance.fontFamily ?? "sans"}${appearance.darkMode ? " is-dark" : ""}`}
        style={getScratchpadReadingStyle(appearance)}
        role="dialog"
        aria-modal="true"
        aria-label="草稿本"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="scratchpad-head">
          <div>
            <p className="eyebrow">Private scratchpad</p>
            <h2>草稿本</h2>
          </div>
          <div className="scratchpad-actions">
            <div className="scratchpad-mode-switch" role="tablist" aria-label="草稿本视图">
              <button
                ref={textTabRef}
                type="button"
                role="tab"
                aria-selected={scratchpad.activeMode === "note"}
                aria-expanded={stylesOpen}
                aria-label="文本与样式"
                disabled={loading}
                onClick={openTextStyles}
              >
                <FileText size={16} />文本
              </button>
              <button type="button" role="tab" aria-selected={scratchpad.activeMode === "map"} disabled={loading} onClick={() => setMode("map")}>
                <BrainCircuit size={16} />思维图
              </button>
            </div>
            <button type="button" className="icon-button" onClick={close} aria-label="关闭草稿本"><X size={20} /></button>
          </div>
        </header>

        <TextStylePopover
          open={stylesOpen && scratchpad.activeMode === "note"}
          anchorRef={textTabRef}
          editor={noteEditor}
          onClose={() => setStylesOpen(false)}
          ariaLabel="草稿本完整文本样式"
        />

        {conflict && <p className="scratchpad-conflict" role="status">另一标签页已保存更新。当前本地稿已保留且没有覆盖云端，请先保留需要的内容，再决定使用哪个版本。</p>}
        {loading ? <p className="scratchpad-loading">正在打开草稿本...</p> : scratchpad.activeMode === "note" ? (
          <div className="scratchpad-note-pane">
            <RichTextSurface
              documentValue={scratchpad.note}
              fallbackText=""
              onChange={(note) => updateNote(note)}
              className="scratchpad-rich-surface"
              ariaLabel="草稿本正文"
              placeholder="随手记下灵感、句子与待补线索..."
              onEditorReady={setNoteEditor}
              contextMenuExpanded
            />
          </div>
        ) : (
          <div className="scratchpad-map-pane">
            <ScratchpadMindMap
              mindMap={scratchpad.mindMap}
              darkMode={Boolean(appearance.darkMode)}
              onChange={(mindMap, options) => update({ ...scratchpadRef.current, mindMap }, options)}
            />
          </div>
        )}
        <footer className="scratchpad-foot"><Save size={14} />{getSaveStatusLabel(saveStatus)}</footer>
      </section>
    </div>,
    document.body,
  );
}

function getSaveStatusLabel(status) {
  if (status === "pending") return "已写入本地，等待云端同步";
  if (status === "saving") return "正在同步云端";
  if (status === "conflict") return "另一标签页已有更新，本地稿已保留";
  if (status === "local") return "云端暂不可用，本地稿已保留";
  return "已自动保存";
}
