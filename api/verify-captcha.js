import crypto from "node:crypto";

const SECRET = process.env.CAPTCHA_SECRET || process.env.VITE_SUPABASE_URL || "authorhub-local-captcha-secret";

function key() {
  return crypto.createHash("sha256").update(SECRET).digest();
}

function decryptToken(token) {
  const [ivRaw, tagRaw, encryptedRaw] = String(token || "").split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid token");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const payload = decryptToken(body.token);
    const answer = String(body.answer || "").trim();
    const ok = payload.exp > Date.now() && answer === String(payload.answer);
    res.setHeader("Cache-Control", "no-store");
    res.status(ok ? 200 : 400).json({ ok });
  } catch {
    res.status(400).json({ ok: false });
  }
}
