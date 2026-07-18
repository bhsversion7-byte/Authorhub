import crypto from "node:crypto";

function key() {
  // Require an explicit, private signing secret. No fallback to public values
  // (e.g. the Supabase URL), which would let anyone forge captcha tokens.
  return crypto.createHash("sha256").update(process.env.CAPTCHA_SECRET).digest();
}

function b64url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

const DIGIT_SEGMENTS = Object.freeze({
  0: ["a", "b", "c", "d", "e", "f"],
  1: ["b", "c"],
  2: ["a", "b", "g", "e", "d"],
  3: ["a", "b", "g", "c", "d"],
  4: ["f", "g", "b", "c"],
  5: ["a", "f", "g", "c", "d"],
  6: ["a", "f", "g", "e", "c", "d"],
  7: ["a", "b", "c"],
  8: ["a", "b", "c", "d", "e", "f", "g"],
  9: ["a", "b", "c", "d", "f", "g"],
});

const SEGMENT_PATHS = Object.freeze({
  a: "M3 1H15L17 3L15 5H3L1 3Z",
  b: "M16 4L18 6V16L16 18L14 16V6Z",
  c: "M16 20L18 22V32L16 34L14 32V22Z",
  d: "M3 33H15L17 35L15 37H3L1 35Z",
  e: "M2 20L4 22V32L2 34L0 32V22Z",
  f: "M2 4L4 6V16L2 18L0 16V6Z",
  g: "M3 17H15L17 19L15 21H3L1 19Z",
});

function encryptPayload(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [b64url(iv), b64url(tag), b64url(encrypted)].join(".");
}

function captchaDigitPath(digit, index) {
  const x = 16 + index * 26;
  const y = index % 2 ? 1 : -1;
  const rotation = index % 2 ? -7 : 6;
  const segments = DIGIT_SEGMENTS[digit] ?? [];
  return `<g transform="translate(${x} ${y}) rotate(${rotation} 9 19)">${segments.map((segment) => `<path d="${SEGMENT_PATHS[segment]}"/>`).join("")}</g>`;
}

function captchaSvg(text) {
  const lines = Array.from({ length: 6 }, (_, index) => {
    const x1 = (index * 23 + 7) % 130;
    const x2 = (index * 41 + 19) % 130;
    const y1 = 8 + ((index * 11) % 28);
    const y2 = 6 + ((index * 17) % 30);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(92,74,52,0.28)" stroke-width="1"/>`;
  }).join("");

  const digits = text.split("").map(captchaDigitPath).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="42" viewBox="0 0 132 42">
    <rect width="132" height="42" rx="10" fill="#EAE5DC"/>
    ${lines}
    <g fill="#2C2418" aria-hidden="true">${digits}</g>
    <circle cx="18" cy="12" r="1.2" fill="rgba(61,53,46,0.35)"/>
    <circle cx="76" cy="34" r="1" fill="rgba(61,53,46,0.28)"/>
    <circle cx="113" cy="14" r="1.4" fill="rgba(61,53,46,0.24)"/>
  </svg>`;
}

export default function handler(req, res) {
  if (!process.env.CAPTCHA_SECRET) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ error: "captcha_not_configured" });
    return;
  }

  const answer = String(Math.floor(1000 + Math.random() * 9000));
  const token = encryptPayload({ answer, exp: Date.now() + 5 * 60 * 1000 });
  const svg = captchaSvg(answer);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    image: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    token,
  });
}
