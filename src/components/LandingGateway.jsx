import React, { useEffect, useMemo, useRef, useState } from "react";
import LandingQuoteOrbit from "./LandingQuoteOrbit.jsx";
import CinematicBookOpener from "./CinematicBookOpener.jsx";
import "../landing-font-local.css";
import "../landing.css";
import "../landing-tuning.css";
import "../landing-quote-refine.css";
import "../landing-frame-fix.css";

const LANDING_HIDDEN_UNTIL_KEY = "author-hub-landing-hidden-until";
const LANDING_SKIP_MS = 30 * 24 * 60 * 60 * 1000;
const BOOK_PROGRESS_MIN = 0;
const BOOK_PROGRESS_MAX = 1;
const BOOK_PAGE_STEPS = 24;
const BOOK_PAGE_JUMP = (BOOK_PROGRESS_MAX - BOOK_PROGRESS_MIN) / BOOK_PAGE_STEPS;
const BOOK_AUTO_OPEN_MS = 7450;
const BOOK_AUTO_HOLD_MS = 620;
const BOOK_AUTO_CLOSE_MS = 2360;
const BOOK_INITIAL_PROGRESS = 0.08;

function shouldSkipLanding() {
  try {
    const rawValue = window.localStorage.getItem(LANDING_HIDDEN_UNTIL_KEY);
    const hiddenUntil = Number(rawValue);
    if (Number.isFinite(hiddenUntil) && hiddenUntil > Date.now()) return true;
    if (rawValue) window.localStorage.removeItem(LANDING_HIDDEN_UNTIL_KEY);
  } catch {
    return false;
  }
  return false;
}

export default function LandingGateway({ children }) {
  const [landingMode, setLandingMode] = useState(() => (shouldSkipLanding() ? "AUTH" : "FULL"));
  const [bookProgress, setBookProgress] = useState(BOOK_INITIAL_PROGRESS);
  const [isBookDragging, setIsBookDragging] = useState(false);
  const [rememberLanding, setRememberLanding] = useState(false);
  const transitionTimer = useRef(null);
  const autoBookFrame = useRef(null);
  const autoBookStart = useRef(0);
  const isBookPointerActive = useRef(false);
  const hasManualBookInteraction = useRef(false);
  const lastPointerX = useRef(0);
  const bookProgressDirection = useRef(1);

  const isFolding = landingMode === "FOLDING";
  const isAuthVisible = landingMode === "AUTH";

  useEffect(() => {
    return () => {
      window.clearTimeout(transitionTimer.current);
      window.cancelAnimationFrame(autoBookFrame.current);
    };
  }, []);

  useEffect(() => {
    window.cancelAnimationFrame(autoBookFrame.current);
    if (landingMode !== "FULL") return undefined;

    autoBookStart.current = performance.now();
    const totalDuration = BOOK_AUTO_OPEN_MS + BOOK_AUTO_HOLD_MS + BOOK_AUTO_CLOSE_MS;

    function tick(now) {
      if (hasManualBookInteraction.current) return;

      if (isBookPointerActive.current) {
        autoBookFrame.current = window.requestAnimationFrame(tick);
        return;
      }

      const elapsed = (now - autoBookStart.current) % totalDuration;
      let nextProgress = BOOK_PROGRESS_MIN;

      if (elapsed <= BOOK_AUTO_OPEN_MS) {
        const ratio = elapsed / BOOK_AUTO_OPEN_MS;
        nextProgress = BOOK_PROGRESS_MIN + ratio * (BOOK_PROGRESS_MAX - BOOK_PROGRESS_MIN);
      } else if (elapsed <= BOOK_AUTO_OPEN_MS + BOOK_AUTO_HOLD_MS) {
        nextProgress = BOOK_PROGRESS_MAX;
      } else {
        const ratio = (elapsed - BOOK_AUTO_OPEN_MS - BOOK_AUTO_HOLD_MS) / BOOK_AUTO_CLOSE_MS;
        nextProgress = BOOK_PROGRESS_MAX - ratio * (BOOK_PROGRESS_MAX - BOOK_PROGRESS_MIN);
      }

      setBookProgress(nextProgress);
      autoBookFrame.current = window.requestAnimationFrame(tick);
    }

    autoBookFrame.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(autoBookFrame.current);
  }, [landingMode]);

  const bookProps = useMemo(
    () => ({
      triggerGateway: isFolding,
      scrollProgress: bookProgress,
      directProgress: true,
      isDragging: isBookDragging,
      autoOpen: false,
      height: "min(64vh, 620px)",
      title: "",
      subtitle: "",
      className: "landing-cinematic-book",
    }),
    [bookProgress, isBookDragging, isFolding],
  );

  function rememberLandingPreference() {
    if (!rememberLanding) return;
    try {
      window.localStorage.setItem(LANDING_HIDDEN_UNTIL_KEY, String(Date.now() + LANDING_SKIP_MS));
    } catch {
      // Landing memory is progressive enhancement only.
    }
  }

  function enterManuscript(event) {
    event.preventDefault();
    if (landingMode !== "FULL") return;
    rememberLandingPreference();
    setBookProgress(BOOK_PROGRESS_MIN);
    setLandingMode("FOLDING");
    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => setLandingMode("AUTH"), 1180);
  }

  function advanceBookPage(event) {
    event.preventDefault();
    event.stopPropagation();
    if (landingMode !== "FULL") return;

    hasManualBookInteraction.current = true;
    window.cancelAnimationFrame(autoBookFrame.current);
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

  function updateBookFromPointer(event) {
    if (landingMode !== "FULL") return;
    const box = event.currentTarget.getBoundingClientRect();
    const rawProgress = (event.clientX - box.left) / Math.max(1, box.width);
    const nextProgress = clampBookProgress(rawProgress);
    setBookProgress(nextProgress);
    bookProgressDirection.current = event.clientX >= lastPointerX.current ? 1 : -1;
    lastPointerX.current = event.clientX;
  }

  function settleBookProgress() {
    setBookProgress((current) => snapBookProgress(current));
  }

  function handleBookPointerDown(event) {
    event.preventDefault();
    event.stopPropagation();
    hasManualBookInteraction.current = true;
    window.cancelAnimationFrame(autoBookFrame.current);
    isBookPointerActive.current = true;
    setIsBookDragging(true);
    lastPointerX.current = event.clientX;
    updateBookFromPointer(event);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleBookPointerMove(event) {
    if (!isBookPointerActive.current) return;
    event.preventDefault();
    event.stopPropagation();
    updateBookFromPointer(event);
  }

  function handleBookPointerUp(event) {
    event.preventDefault();
    event.stopPropagation();
    isBookPointerActive.current = false;
    setIsBookDragging(false);
    settleBookProgress();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleBookPointerLeave(event) {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    isBookPointerActive.current = false;
    setIsBookDragging(false);
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
        {!isAuthVisible && <LandingQuoteOrbit />}

        <div className="landing-copy" aria-hidden={isAuthVisible}>
          <p className="landing-eyebrow">A private atlas for unfinished worlds</p>
          <h1>AuthorHub</h1>
          <p className="landing-subtitle">去创造吧，把你的名字编织进无序的星图。</p>
          <p className="landing-signature">试炼的终点是花开万里 —— BTS 闵玧其</p>
        </div>

        <div
          className="landing-book-stage"
          data-ai-target="cinematic-book-stage"
          data-book-progress={bookProgress.toFixed(4)}
          aria-label="Cinematic manuscript book stage, drag to turn pages"
          role="button"
          tabIndex={isAuthVisible ? -1 : 0}
          onClick={(event) => event.preventDefault()}
          onKeyDown={handleBookKeyDown}
        >
          <CinematicBookOpener {...bookProps} />
          <div
            className="landing-book-drag-layer"
            aria-hidden="true"
            onPointerMove={handleBookPointerMove}
            onPointerDown={handleBookPointerDown}
            onPointerUp={handleBookPointerUp}
            onPointerCancel={handleBookPointerUp}
            onPointerLeave={handleBookPointerLeave}
            onLostPointerCapture={handleBookPointerUp}
          />
        </div>

        {!isAuthVisible && (
          <div className="landing-control-zone">
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
            <label className="landing-remember-check">
              <input
                type="checkbox"
                data-ai-target="remember-landing-checkbox"
                aria-label="Remember landing preference for 30 days"
                checked={rememberLanding}
                onChange={(event) => setRememberLanding(event.target.checked)}
              />
              <span>30 天内不再显示开场</span>
            </label>
          </div>
        )}
      </section>

      <section className="landing-auth-panel" aria-hidden={!isAuthVisible}>
        {isAuthVisible ? children : null}
      </section>
    </main>
  );
}

function clampBookProgress(value) {
  return Math.min(BOOK_PROGRESS_MAX, Math.max(BOOK_PROGRESS_MIN, value));
}

function snapBookProgress(value) {
  return clampBookProgress(Math.round(value * BOOK_PAGE_STEPS) / BOOK_PAGE_STEPS);
}
