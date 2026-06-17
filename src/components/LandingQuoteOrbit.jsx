import React from "react";
import FloatingTypewriterQuote from "./FloatingTypewriterQuote.jsx";

const QUOTES = [
  {
    id: "dickinson-possibility",
    en: "I dwell in Possibility—",
    zh: "我居住在可能性之中。",
    author: "Emily Dickinson",
    layer: "foreground",
    style: { "--quote-x": "8vw", "--quote-y": "16vh", "--quote-rotate": "-5deg", "--quote-delay": "-1.2s", "--quote-duration": "13s" },
  },
  {
    id: "shelley-fearless",
    en: "Beware; for I am fearless, and therefore powerful.",
    zh: "请小心：我无所畏惧，因而拥有力量。",
    author: "Mary Shelley",
    layer: "mid",
    style: { "--quote-x": "63vw", "--quote-y": "13vh", "--quote-rotate": "4deg", "--quote-delay": "-4.5s", "--quote-duration": "15s" },
  },
  {
    id: "austen-happiness",
    en: "Know your own happiness.",
    zh: "请认出属于你自己的幸福。",
    author: "Jane Austen",
    layer: "background",
    style: { "--quote-x": "15vw", "--quote-y": "68vh", "--quote-rotate": "3deg", "--quote-delay": "-7.4s", "--quote-duration": "17s" },
  },
  {
    id: "bronte-bird",
    en: "I am no bird; and no net ensnares me.",
    zh: "我不是飞鸟，也没有罗网能困住我。",
    author: "Charlotte Bronte",
    layer: "mid",
    style: { "--quote-x": "66vw", "--quote-y": "64vh", "--quote-rotate": "-3deg", "--quote-delay": "-3.1s", "--quote-duration": "14s" },
  },
  {
    id: "eliot-late",
    en: "It is never too late to be what you might have been.",
    zh: "成为你本可以成为的人，永远不算太迟。",
    author: "George Eliot",
    layer: "foreground",
    style: { "--quote-x": "37vw", "--quote-y": "10vh", "--quote-rotate": "2deg", "--quote-delay": "-5.9s", "--quote-duration": "16s" },
  },
  {
    id: "alcott-storms",
    en: "I am not afraid of storms.",
    zh: "我不害怕风暴。",
    author: "Louisa May Alcott",
    layer: "background",
    style: { "--quote-x": "47vw", "--quote-y": "76vh", "--quote-rotate": "5deg", "--quote-delay": "-2.2s", "--quote-duration": "18s" },
  },
  {
    id: "barrett-light",
    en: "Light tomorrow with today.",
    zh: "用今日照亮明日。",
    author: "Elizabeth Barrett Browning",
    layer: "mid",
    style: { "--quote-x": "4vw", "--quote-y": "41vh", "--quote-rotate": "-2deg", "--quote-delay": "-6.5s", "--quote-duration": "14.5s" },
  },
  {
    id: "anne-bronte-rose",
    en: "Grasp the thorn; crave the rose.",
    zh: "若渴望玫瑰，也请握住刺。",
    author: "Anne Bronte",
    layer: "background",
    style: { "--quote-x": "75vw", "--quote-y": "38vh", "--quote-rotate": "-4deg", "--quote-delay": "-8.3s", "--quote-duration": "19s" },
  },
];

export default function LandingQuoteOrbit() {
  return (
    <div className="landing-quote-orbit" aria-hidden="false">
      {QUOTES.map((quote, index) => (
        <div key={quote.id} className="landing-quote-track" style={quote.style}>
          <FloatingTypewriterQuote quote={quote} index={index} />
        </div>
      ))}
    </div>
  );
}
