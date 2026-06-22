import crypto from "node:crypto";

function key() {
  // Require an explicit, private signing secret. No fallback to public values
  // (e.g. the Supabase URL), which would let anyone forge captcha tokens.
  return crypto.createHash("sha256").update(process.env.CAPTCHA_SECRET).digest();
}

function b64url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function encryptPayload(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [b64url(iv), b64url(tag), b64url(encrypted)].join(".");
}

function captchaSvg(text) {
  const lines = Array.from({ length: 6 }, (_, index) => {
    const x1 = (index * 23 + 7) % 130;
    const x2 = (index * 41 + 19) % 130;
    const y1 = 8 + ((index * 11) % 28);
    const y2 = 6 + ((index * 17) % 30);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(92,74,52,0.28)" stroke-width="1"/>`;
  }).join("");

  const digits = text
    .split("")
    .map((digit, index) => {
      const x = 18 + index * 26;
      const y = 30 + (index % 2 ? -3 : 2);
      const rotate = index % 2 ? -9 : 7;
      return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})">${digit}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="42" viewBox="0 0 132 42">
    <rect width="132" height="42" rx="10" fill="#EAE5DC"/>
    ${lines}
    <g fill="#2C2418" font-family="Georgia, serif" font-size="24" font-weight="700" letter-spacing="4">${digits}</g>
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
