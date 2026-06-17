import React, { useEffect, useMemo, useRef, useState } from "react";
import "../landing.css";
import "../landing-tuning.css";

const cinematicBookModules = import.meta.glob("./CinematicBookOpener.jsx");
const cinematicBookImporter = Object.values(cinematicBookModules)[0];
const BOOK_PROGRESS_MIN = 0.02;
const BOOK_PROGRESS_MAX = 0.42;
const BOOK_PAGE_JUMP = (BOOK_PROGRESS_MAX - BOOK_PROGRESS_MIN) / 8;

export default function LandingGateway({ children }) {
  const [landingMode, setLandingMode] = useState("FULL");
  const [CinematicBook, setCinematicBook] = useState(null);
  const [bookProgress, setBookProgress] = useState(BOOK_PROGRESS_MIN);
  const transitionTimer = useRef(null);
  const bookProgressDirection = useRef(1);
  const manualBookHoldUntil = useRef(0);

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

  useEffect(() => {
    if (isAuthVisible) return undefined;

    let frame = 0;
    let lastTime = performance.now();

    function tick(now) {
      const delta = Math.min(64, now - lastTime);
      lastTime = now;

      if (now >= manualBookHoldUntil.current) {
        setBookProgress((current) => {
          let next = current + bookProgressDirection.current * delta * 0.000045;
          if (next >= BOOK_PROGRESS_MAX) {
            next = BOOK_PROGRESS_MAX;
            bookProgressDirection.current = -1;
          }
          if (next <= BOOK_PROGRESS_MIN) {
            next = BOOK_PROGRESS_MIN;
            bookProgressDirection.current = 1;
          }
          return next;
        });
      }

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isAuthVisible]);

  const bookProps = useMemo(
    () => ({
      triggerGateway: isFolding,
      scrollProgress: bookProgress,
      autoOpen: false,
      height: "min(64vh, 620px)",
      title: "",
      subtitle: "",
      className: "landing-cinematic-book",
    }),
    [bookProgress, isFolding],
  );

  function enterManuscript(event) {
    event.preventDefault();
    if (landingMode !== "FULL") return;
    setLandingMode("FOLDING");
    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => setLandingMode("AUTH"), 1180);
  }

  function advanceBookPage(event) {
    event.preventDefault();
    event.stopPropagation();
    if (landingMode !== "FULL") return;

    manualBookHoldUntil.current = performance.now() + 880;
    setBookProgress((current) => {
      let next = current + bookProgressDirection.current * BOOK_PAGE_JUMP;
      if (next >= BOOK_PROGRESS_MAX) {
        next = BOOK_PROGRESS_MAX;
        bookProgressDirection.current = -1;
      }
      if (next <= BOOK_PROGRESS_MIN) {
        next = BOOK_PROGRESS_MIN;
        bookProgressDirection.current = 1;
      }
      return next;
    });
  }

  function handleBookKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    advanceBookPage(event);
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

        <div
          className="landing-book-stage"
          data-ai-target="cinematic-book-stage"
          aria-label="Cinematic manuscript book stage, click to turn pages"
          role="button"
          tabIndex={isAuthVisible ? -1 : 0}
          onClick={advanceBookPage}
          onKeyDown={handleBookKeyDown}
        >
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
