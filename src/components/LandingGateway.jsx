import React, { useEffect, useMemo, useRef, useState } from "react";
import "../landing.css";

const cinematicBookModules = import.meta.glob("./CinematicBookOpener.jsx");
const cinematicBookImporter = Object.values(cinematicBookModules)[0];

export default function LandingGateway({ children }) {
  const [landingMode, setLandingMode] = useState("FULL");
  const [CinematicBook, setCinematicBook] = useState(null);
  const transitionTimer = useRef(null);

  const isFolding = landingMode === "FOLDING";
  const isAuthVisible = landingMode === "AUTH";

  useEffect(() => {
    let mounted = true;
    if (!cinematicBookImporter) return undefined;

    cinematicBookImporter()
      .then((module) => {
        if (mounted) setCinematicBook(() => module.default ?? null);
      })
      .catch(() => {
        if (mounted) setCinematicBook(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(transitionTimer.current);
  }, []);

  const bookProps = useMemo(() => ({ triggerGateway: isFolding }), [isFolding]);

  function enterManuscript(event) {
    event.preventDefault();
    if (landingMode !== "FULL") return;
    setLandingMode("FOLDING");
    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => setLandingMode("AUTH"), 1180);
  }

  return (
    <main className={`landing-gateway mode-${landingMode.toLowerCase()}`} data-landing-mode={landingMode}>
      <div className="landing-noise" aria-hidden="true" />
      <div className="landing-scratch-layer" aria-hidden="true" />
      <div className="landing-aura" aria-hidden="true" />

      <section className="landing-stage" aria-label="AuthorHub manuscript landing gateway">
        <div className="landing-copy" aria-hidden={isAuthVisible}>
          <p className="landing-eyebrow">A private atlas for unfinished worlds</p>
          <h1>AuthorHub.</h1>
          <p className="landing-subtitle">去创造吧，把你的名字编织进无序的星图。</p>
          <p className="landing-signature">试炼的终点是花开万里。—— BTS 闵玧其</p>
        </div>

        <div className="landing-book-stage" data-ai-target="cinematic-book-stage" aria-label="Cinematic manuscript book stage">
          {CinematicBook ? <CinematicBook {...bookProps} /> : <ManuscriptFallback isFolding={isFolding} />}
        </div>

        {!isAuthVisible && (
          <button
            type="button"
            className="landing-enter-button"
            data-ai-target="landing-gate-arrow"
            aria-label="Enter AuthorHub desk platform"
            onClick={enterManuscript}
          >
            <span>开始落墨</span>
            <small>Open the manuscript</small>
          </button>
        )}
      </section>

      <section className="landing-auth-panel" aria-hidden={!isAuthVisible}>
        {isAuthVisible ? children : null}
      </section>
    </main>
  );
}

function ManuscriptFallback({ isFolding }) {
  return (
    <div className={`manuscript-fallback ${isFolding ? "is-folding" : ""}`} aria-hidden="true">
      <div className="manuscript-cover" />
      <div className="manuscript-page page-left" />
      <div className="manuscript-page page-right" />
      <div className="manuscript-spine" />
    </div>
  );
}
