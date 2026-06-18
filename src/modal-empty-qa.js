const INSTALL_FLAG = "__authorHubModalQa";
const MODAL_SELECTOR = ".modal-backdrop .confirm-modal";

if (typeof document !== "undefined") {
  installModalQa();
}

function installModalQa() {
  if (window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  let activeModal = null;
  let previousFocus = null;
  let scheduled = false;

  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      const modal = document.querySelector(MODAL_SELECTOR);
      const anyBackdrop = document.querySelector(".modal-backdrop");

      if (anyBackdrop) document.body.dataset.authorhubModalOpen = "true";
      else delete document.body.dataset.authorhubModalOpen;

      if (!modal) {
        if (activeModal && previousFocus?.isConnected) previousFocus.focus?.();
        activeModal = null;
        previousFocus = null;
        return;
      }

      if (modal === activeModal) return;
      previousFocus = document.activeElement;
      activeModal = modal;
      modal.setAttribute("tabindex", "-1");

      const preferred = modal.querySelector(".ghost-button, button:not(.danger-button):not(.btn-unregister), input, select, textarea");
      window.setTimeout(() => (preferred ?? modal).focus?.(), 0);
    });
  };

  scheduleUpdate();
  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(document.body, { childList: true, subtree: true });
}
