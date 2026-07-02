import { useEffect } from "react";

// Shared Escape-key + outside-pointerdown dismissal for a trigger-button +
// popover pair (was duplicated near-verbatim between PublishLinkPill and
// NovelShareControl). Refocuses the trigger button after closing so keyboard
// users don't lose their place. `onClose` should be a stable reference
// (e.g. the raw `setOpen` state setter) to avoid re-attaching listeners
// every render.
export function usePopoverDismiss(open, { buttonRef, popoverRef, onClose }) {
  useEffect(() => {
    if (!open) return;
    let focusTimer = 0;

    function closePopover() {
      onClose(false);
      focusTimer = window.setTimeout(() => buttonRef.current?.focus?.(), 0);
    }

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closePopover();
    }

    function onPointerDown(event) {
      if (popoverRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      closePopover();
    }

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, buttonRef, popoverRef, onClose]);
}
