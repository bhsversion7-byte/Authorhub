import React, { useEffect, useMemo, useRef, useState } from "react";
import LandingQuoteOrbit from "./LandingQuoteOrbit.jsx";
import "../landing-font-local.css";
import "../landing.css";
import "../landing-tuning.css";
import "../landing-quote-refine.css";
import "../landing-debug.css";

const cinematicBookModules = import.meta.glob("./CinematicBookOpener.jsx");
const cinematicBookImporter = Object.values(cinematicBookModules)[0];
const LANDING_HIDDEN_UNTIL_KEY = "author-hub-landing-hidden-until";
const LANDING_SKIP_MS = 30 * 24 * 60 * 60 * 1000;
const BOOK_PROGRESS_MIN = 0.035;
const BOOK_PROGRESS_MAX = 0.46;
const BOOK_AUTOPLAY_SPEED = 0.000095;
const BOOK_PAGE_JUMP = (BOOK_PROGRESS_MAX - BOOK_PROGRESS_MIN) / 4.8;
const ASSET_DEBUG_VERSION = "book-assets-20260618-0305";
const ASSET_DEBUG_CANDIDATES = [
  { key: "cover-png", label: "cover png", src: "/bookcover.png" },
  { key: "cover-webp", label: "cover webp", src: "/bookcover.webp" },
  { key: "cover-jpg", label: "cover jpg", src: "/bookcover.jpg" },
  { key: "cover-jpeg", label: "cover jpeg", src: "/bookcover.jpeg" },
  { key: "cover-public", label: "public/cover", src: "/public/bookcover.png" },
  { key: "inside-png", label: "inside png", src: "/bookinside.png" },
  { key: "inside-webp", label: "inside webp", src: "/bookinside.webp" },
  { key: "inside-jpg", label: "inside jpg", src: "/bookinside.jpg" },
  { key: "inside-public", label: "public/inside", src: "/public/bookinside.png" },
];

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
  const [CinematicBook, setCinematicBook] = useState(null);
  const [bookProgress, setBookProgress] = useState(BOOK_PROGRESS_MIN + 0.035);
  const [rememberLanding, setRememberLanding] = useState(false);
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
          let next = current + bookProgressDirection.current * delta * BOOK_AUTOPLAY_SPEED;
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
    setLandingMode("FOLDING");
    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => setLandingMode("AUTH"), 1180);
  }

  function advanceBookPage(event) {
    event.preventDefault();
    event.stopPropagation();
    if (landingMode !== "FULL") return;

    manualBookHoldUntil.current = performance.now() + 360;
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
          aria-label="Cinematic manuscript book stage, click to turn pages"
          role="button"
          tabIndex={isAuthVisible ? -1 : 0}
          onClick={advanceBookPage}
          onKeyDown={handleBookKeyDown}
        >
          {CinematicBook ? <CinematicBook {...bookProps} /> : <ManuscriptFallback isFolding={isFolding} />}
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

      <LandingAssetDebug />

      <section className="landing-auth-panel" aria-hidden={!isAuthVisible}>
        {isAuthVisible ? children : null}
      </section>
    </main>
  );
}

function LandingAssetDebug() {
  const [records, setRecords] = useState(() =>
    Object.fromEntries(
      ASSET_DEBUG_CANDIDATES.map(({ key }) => [key, { status: "loading", fetchStatus: "checking", dimensions: "", contentType: "" }]),
    ),
  );

  useEffect(() => {
    let cancelled = false;
    ASSET_DEBUG_CANDIDATES.forEach(({ key, src }) => {
      fetch(`${src}?v=${ASSET_DEBUG_VERSION}`, { cache: "no-store" })
        .then((response) => {
          if (cancelled) return;
          setRecords((current) => ({
            ...current,
            [key]: {
              ...current[key],
              fetchStatus: `${response.status}`,
              contentType: response.headers.get("content-type") ?? "no content-type",
            },
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setRecords((current) => ({
            ...current,
            [key]: {
              ...current[key],
              fetchStatus: "fetch error",
            },
          }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLoad(key, event) {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setRecords((current) => ({ ...current, [key]: { ...current[key], status: "loaded", dimensions: `${naturalWidth}×${naturalHeight}` } }));
  }

  function handleError(key) {
    setRecords((current) => ({ ...current, [key]: { ...current[key], status: "error", dimensions: "failed" } }));
  }

  return (
    <aside className="landing-asset-debug" data-ai-target="landing-asset-debug" aria-label="Landing image asset debug panel">
      <strong>asset debug v0305</strong>
      {ASSET_DEBUG_CANDIDATES.map(({ key, label, src }) => {
        const record = records[key];
        return (
          <figure key={key} className={`asset-debug-item is-${record.status}`}>
            <img
              src={`${src}?v=${ASSET_DEBUG_VERSION}`}
              alt={`${label} debug preview`}
              onLoad={(event) => handleLoad(key, event)}
              onError={() => handleError(key)}
            />
            <figcaption>
              {label} · img:{record.status} · fetch:{record.fetchStatus} · {record.dimensions || "—"} · {record.contentType || "—"}
            </figcaption>
          </figure>
        );
      })}
    </aside>
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
