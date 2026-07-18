import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { NotebookPen } from "lucide-react";
import FloatingMusicPlayer from "./FloatingMusicPlayer.jsx";

const Scratchpad = lazy(() => import("./Scratchpad.jsx"));

const SCRATCHPAD_POSITION_KEY = "author-hub-scratchpad-launch-position";

export default function FloatingToolDock({ user, appearance = {}, showScratchpad = true }) {
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [musicTop, setMusicTop] = useState(24);
  const [scratchpadTop, setScratchpadTop] = useState(getInitialScratchpadTop);
  const [draggingScratchpad, setDraggingScratchpad] = useState(false);
  const scratchpadDragRef = useRef(null);
  const scratchpadMovedRef = useRef(false);
  const scratchpadTopRef = useRef(scratchpadTop);
  const hasCustomScratchpadPositionRef = useRef(hasStoredScratchpadPosition());
  const musicEnabled = appearance.musicPlayerEnabled !== false;
  const scratchpadEnabled = appearance.scratchpadEnabled !== false && showScratchpad;

  useEffect(() => {
    if (hasCustomScratchpadPositionRef.current) return;
    setScratchpadPosition(musicEnabled ? musicTop + 58 : 24);
  }, [musicEnabled, musicTop]);

  useEffect(() => {
    if (!scratchpadEnabled) setScratchpadOpen(false);
  }, [scratchpadEnabled]);

  useEffect(() => {
    function clampPosition() {
      setScratchpadPosition(scratchpadTopRef.current);
    }
    window.addEventListener("resize", clampPosition);
    window.addEventListener("orientationchange", clampPosition);
    return () => {
      window.removeEventListener("resize", clampPosition);
      window.removeEventListener("orientationchange", clampPosition);
    };
  }, []);

  function startScratchpadDrag(event) {
    scratchpadMovedRef.current = false;
    scratchpadDragRef.current = { startY: event.clientY, originY: scratchpadTop };
    setDraggingScratchpad(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveScratchpad(event) {
    if (!scratchpadDragRef.current) return;
    const delta = event.clientY - scratchpadDragRef.current.startY;
    if (Math.abs(delta) > 4) scratchpadMovedRef.current = true;
    setScratchpadPosition(scratchpadDragRef.current.originY + delta);
  }

  function finishScratchpadDrag() {
    if (!scratchpadDragRef.current) return;
    scratchpadDragRef.current = null;
    setDraggingScratchpad(false);
    if (scratchpadMovedRef.current) {
      hasCustomScratchpadPositionRef.current = true;
      localStorage.setItem(SCRATCHPAD_POSITION_KEY, JSON.stringify({ y: scratchpadTopRef.current }));
    }
  }

  function setScratchpadPosition(value) {
    const next = clampTop(value);
    scratchpadTopRef.current = next;
    setScratchpadTop(next);
  }

  return (
    <>
      <FloatingMusicPlayer enabled={musicEnabled} onPositionChange={setMusicTop} />
      {scratchpadEnabled && (
        <button
          type="button"
          className={`floating-scratchpad-launch${draggingScratchpad ? " is-dragging" : ""}`}
          style={{ top: `${scratchpadTop}px` }}
          onPointerDown={startScratchpadDrag}
          onPointerMove={moveScratchpad}
          onPointerUp={finishScratchpadDrag}
          onPointerCancel={finishScratchpadDrag}
          onClick={() => {
            if (scratchpadMovedRef.current) return;
            setScratchpadOpen(true);
          }}
          aria-label="打开草稿本"
        >
          <NotebookPen size={19} />
          <span>草稿本</span>
        </button>
      )}
      {scratchpadOpen && (
        <Suspense fallback={null}>
          <Scratchpad user={user} appearance={appearance} open onClose={() => setScratchpadOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

function getInitialScratchpadTop() {
  try {
    const stored = JSON.parse(localStorage.getItem(SCRATCHPAD_POSITION_KEY));
    return clampTop(stored?.y ?? 82);
  } catch {
    return 82;
  }
}

function hasStoredScratchpadPosition() {
  try {
    return localStorage.getItem(SCRATCHPAD_POSITION_KEY) !== null;
  } catch {
    return false;
  }
}

function clampTop(value) {
  return Math.max(8, Math.min(window.innerHeight - 48, Number(value) || 8));
}
