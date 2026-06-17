import React, { useEffect, useMemo, useState } from "react";

const PUNCTUATION_PAUSE = new Set([".", ",", ";", ":", "!", "?", "。", "，", "；", "：", "！", "？", "—", "、"]);

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    function handleChange(event) {
      setReducedMotion(event.matches);
    }

    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  return reducedMotion;
}

function glyphDelay(char, index) {
  const base = 22 + ((index * 17) % 29);
  if (PUNCTUATION_PAUSE.has(char)) return base + 120;
  if (char === " ") return 16;
  return base;
}

function buildGlyphs(parts) {
  return parts.join(" ").split("");
}

export default function FloatingTypewriterQuote({ quote, index = 0 }) {
  const reducedMotion = useReducedMotion();
  const glyphs = useMemo(() => buildGlyphs([quote.en, quote.zh, quote.author]), [quote]);
  const [visibleCount, setVisibleCount] = useState(reducedMotion ? glyphs.length : 0);

  useEffect(() => {
    if (reducedMotion) {
      setVisibleCount(glyphs.length);
      return undefined;
    }

    let cancelled = false;
    let timeoutId;

    function reveal(nextIndex) {
      if (cancelled) return;
      setVisibleCount(nextIndex);

      if (nextIndex >= glyphs.length) {
        timeoutId = window.setTimeout(() => reveal(0), 5200 + index * 320);
        return;
      }

      timeoutId = window.setTimeout(() => reveal(nextIndex + 1), glyphDelay(glyphs[nextIndex] ?? "", nextIndex));
    }

    setVisibleCount(0);
    timeoutId = window.setTimeout(() => reveal(1), 420 + index * 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [glyphs, index, reducedMotion]);

  function renderPart(text, offset, className) {
    return (
      <span className={className} aria-hidden="true">
        {text.split("").map((char, charIndex) => {
          const absoluteIndex = offset + charIndex;
          const isVisible = reducedMotion || absoluteIndex < visibleCount;
          return (
            <span
              key={`${quote.id}-${className}-${charIndex}`}
              className={`quote-glyph ${isVisible ? "is-visible" : ""}`}
              style={{ "--glyph-index": charIndex }}
            >
              {char === " " ? "\u00a0" : char}
            </span>
          );
        })}
      </span>
    );
  }

  const enOffset = 0;
  const zhOffset = quote.en.length + 1;
  const authorOffset = zhOffset + quote.zh.length + 1;

  return (
    <article className={`floating-typewriter-quote quote-layer-${quote.layer}`} aria-label={`${quote.en} ${quote.zh} ${quote.author}`}>
      {renderPart(quote.en, enOffset, "quote-text-en")}
      {renderPart(quote.zh, zhOffset, "quote-text-zh")}
      {renderPart(quote.author, authorOffset, "quote-author")}
    </article>
  );
}
