import React from "react";
import FloatingTypewriterQuote from "./FloatingTypewriterQuote.jsx";

const QUOTES = [
  {
    id: "dickinson-possibility",
    en: "I dwell in Possibility—",
    zh: "我居住在可能性之中。",
    author: "Emily Dickinson",
    layer: "foreground",
    zone: "top",
    style: { "--quote-x": "4vw", "--quote-y": "7vh", "--quote-rotate": "-5deg", "--quote-delay": "-1.2s", "--quote-duration": "13s" },
  },
  {
    id: "eliot-late",
    en: "It is never too late to be what you might have been.",
    zh: "成为你本可以成为的人，永远不算太迟。",
    author: "George Eliot",
    layer: "foreground",
    zone: "top",
    style: { "--quote-x": "34vw", "--quote-y": "5vh", "--quote-rotate": "2deg", "--quote-delay": "-5.9s", "--quote-duration": "16s" },
  },
  {
    id: "shelley-fearless",
    en: "Beware; for I am fearless, and therefore powerful.",
    zh: "请小心：我无所畏惧，因而拥有力量。",
    author: "Mary Shelley",
    layer: "mid",
    zone: "top",
    style: { "--quote-x": "67vw", "--quote-y": "9vh", "--quote-rotate": "4deg", "--quote-delay": "-4.5s", "--quote-duration": "15s" },
  },
  {
    id: "woolf-room",
    en: "A woman must have money and a room of her own.",
    zh: "女性需要金钱，也需要一间自己的房间。",
    author: "Virginia Woolf",
    layer: "background",
    zone: "middle",
    style: { "--quote-x": "7vw", "--quote-y": "31vh", "--quote-rotate": "2deg", "--quote-delay": "-6.1s", "--quote-duration": "18s" },
  },
  {
    id: "morrison-fly",
    en: "If you want to fly, give up the things that weigh you down.",
    zh: "若想飞翔，就放下那些拖住你的东西。",
    author: "Toni Morrison",
    layer: "mid",
    zone: "middle",
    style: { "--quote-x": "51vw", "--quote-y": "30vh", "--quote-rotate": "-3deg", "--quote-delay": "-2.8s", "--quote-duration": "15.5s" },
  },
  {
    id: "barrett-light",
    en: "Light tomorrow with today.",
    zh: "用今日照亮明日。",
    author: "Elizabeth Barrett Browning",
    layer: "background",
    zone: "middle",
    style: { "--quote-x": "20vw", "--quote-y": "47vh", "--quote-rotate": "-2deg", "--quote-delay": "-6.5s", "--quote-duration": "14.5s" },
  },
  {
    id: "le-guin-language",
    en: "The creative adult is the child who survived.",
    zh: "有创造力的成年人，是幸存下来的孩子。",
    author: "Ursula K. Le Guin",
    layer: "mid",
    zone: "middle",
    style: { "--quote-x": "70vw", "--quote-y": "43vh", "--quote-rotate": "3deg", "--quote-delay": "-9.3s", "--quote-duration": "17.5s" },
  },
  {
    id: "austen-happiness",
    en: "Know your own happiness.",
    zh: "请认出属于你自己的幸福。",
    author: "Jane Austen",
    layer: "background",
    zone: "bottom",
    style: { "--quote-x": "4vw", "--quote-y": "69vh", "--quote-rotate": "3deg", "--quote-delay": "-7.4s", "--quote-duration": "17s" },
  },
  {
    id: "bronte-bird",
    en: "I am no bird; and no net ensnares me.",
    zh: "我不是飞鸟，也没有罗网能困住我。",
    author: "Charlotte Bronte",
    layer: "mid",
    zone: "bottom",
    style: { "--quote-x": "19vw", "--quote-y": "75vh", "--quote-rotate": "-3deg", "--quote-delay": "-3.1s", "--quote-duration": "14s" },
  },
  {
    id: "alcott-storms",
    en: "I am not afraid of storms.",
    zh: "我不害怕风暴。",
    author: "Louisa May Alcott",
    layer: "foreground",
    zone: "bottom",
    style: { "--quote-x": "45vw", "--quote-y": "70vh", "--quote-rotate": "5deg", "--quote-delay": "-2.2s", "--quote-duration": "18s" },
  },
  {
    id: "anne-bronte-rose",
    en: "Grasp the thorn; crave the rose.",
    zh: "若渴望玫瑰，也请握住刺。",
    author: "Anne Bronte",
    layer: "background",
    zone: "bottom",
    style: { "--quote-x": "62vw", "--quote-y": "78vh", "--quote-rotate": "-4deg", "--quote-delay": "-8.3s", "--quote-duration": "19s" },
  },
  {
    id: "adichie-story",
    en: "Stories can break the dignity of a people, but stories can also repair it.",
    zh: "故事能损伤尊严，也能修复尊严。",
    author: "Chimamanda Ngozi Adichie",
    layer: "mid",
    zone: "bottom",
    style: { "--quote-x": "78vw", "--quote-y": "66vh", "--quote-rotate": "2deg", "--quote-delay": "-10.2s", "--quote-duration": "16.5s" },
  },
];

export default function LandingQuoteOrbit() {
  return (
    <div className="landing-quote-orbit" aria-hidden="false">
      {QUOTES.map((quote) => (
        <div key={quote.id} className={`landing-quote-track quote-zone-${quote.zone}`} style={quote.style}>
          <FloatingTypewriterQuote quote={quote} />
        </div>
      ))}
    </div>
  );
}
