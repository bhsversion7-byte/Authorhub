import { useEffect } from "react";

// Shared Escape-key dismissal for a simple always-mounted-while-open modal
// (was duplicated near-verbatim across PasswordModal/UnregisterModal in
// UserCenter.jsx and AnnouncementModal in AnnouncementCenter.jsx). Not for
// modals whose Escape handling is entangled with other effect concerns
// (e.g. FocusTextarea's zen overlay also has a page-delete-candidate guard,
// MediaCarousel's lightbox also locks body scroll) - those stay inline.
export function useEscapeToClose(onClose) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);
}
