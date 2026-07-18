import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TextStyleControls from "./TextStyleControls.jsx";

const VIEWPORT_GAP = 12;

export default function TextStylePopover({ open, anchorRef, editor, onClose, expanded = true, ariaLabel }) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ left: VIEWPORT_GAP, top: VIEWPORT_GAP, visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current || !panelRef.current) return undefined;

    function place() {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!anchor || !panel) return;
      const below = anchor.bottom + 8;
      const above = anchor.top - panel.height - 8;
      const top = below + panel.height <= window.innerHeight - VIEWPORT_GAP ? below : Math.max(VIEWPORT_GAP, above);
      const left = Math.min(
        Math.max(VIEWPORT_GAP, anchor.right - panel.width),
        Math.max(VIEWPORT_GAP, window.innerWidth - panel.width - VIEWPORT_GAP),
      );
      setPosition({ left, top, visibility: "visible" });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, editor, expanded]);

  useEffect(() => {
    if (!open) return undefined;
    function dismiss(event) {
      if (panelRef.current?.contains(event.target) || anchorRef?.current?.contains(event.target)) return;
      onClose?.();
    }
    function dismissOnEscape(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open, anchorRef, onClose]);

  if (!open || !editor) return null;
  return createPortal(
    <div ref={panelRef} className="text-style-popover" style={position} onPointerDown={(event) => event.stopPropagation()}>
      <TextStyleControls editor={editor} expanded={expanded} onClose={onClose} ariaLabel={ariaLabel} />
    </div>,
    document.body,
  );
}
