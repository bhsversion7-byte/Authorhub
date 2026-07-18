import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./styles.css";
import "./internal-polish.css";
import "./novel-section-restore.css";
import "./relation-graph-polish.css";
import "./modal-empty-qa.css";
import "./sidebar-stability.css";
import "./music-player-tuning.css";
import "./author-center-polish.css";
import "./paper-texture-system.css";
import "./user-center-refine.css";
import "./reading-font-options.css";
import "./sidebar-nav-state-fix.css";
import "./novel-page-refine.css";
import "./responsive-stability.css";
import "./authorhub-refine-pass.css";
import "./authorhub-detail-polish.css";
import "./material-system.css";
import "./authorhub-state-corrections.css";
import "./sharing-collab.css";
import "./reading-scale-fixes.css";
import "./rich-text-editor.css";
import "./modal-empty-qa.js";

// Auto-recover from stale chunk references after a new deploy. If a browser is
// holding an older index.html and requests a lazy chunk hash that the current
// build has replaced, the dynamic import fails (the SPA rewrite hands back
// index.html instead of JS). Rather than leaving a blank page, fetch the fresh
// index.html + chunk graph. Guarded via sessionStorage so a genuinely broken
// build cannot reload-loop.
function recoverFromStaleChunk() {
  try {
    const last = Number(window.sessionStorage.getItem("ah-chunk-reload") || 0);
    if (Date.now() - last < 12000) return;
    window.sessionStorage.setItem("ah-chunk-reload", String(Date.now()));
  } catch {
    // sessionStorage unavailable; still attempt a single reload below.
  }
  window.location.reload();
}

window.addEventListener("vite:preloadError", recoverFromStaleChunk);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
