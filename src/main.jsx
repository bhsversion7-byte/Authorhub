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
import "./modal-empty-qa.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
