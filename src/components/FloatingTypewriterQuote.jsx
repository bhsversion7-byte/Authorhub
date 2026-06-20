import React from "react";

export default function FloatingTypewriterQuote({ quote }) {
  return (
    <article className={`floating-typewriter-quote quote-layer-${quote.layer}`} aria-label={`${quote.en} ${quote.zh} ${quote.author}`}>
      <span className="quote-text-en" aria-hidden="true">{quote.en}</span>
      <span className="quote-text-zh" aria-hidden="true">{quote.zh}</span>
      <span className="quote-author" aria-hidden="true">{quote.author}</span>
    </article>
  );
}
