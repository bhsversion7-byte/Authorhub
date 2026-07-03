const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cloudflare Turnstile is a free, invisible bot-detection widget - unlike the
// custom numeric captcha in captcha.js/verify-captcha.js, it works without
// any DNS/CDN change (Turnstile is a standalone service, not tied to being
// on Cloudflare's DNS or proxy). It is an additive layer on top of the
// numeric captcha, not a replacement - registration still requires both to
// pass once TURNSTILE_SECRET_KEY is configured.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false });
    return;
  }

  // Same fail-closed philosophy as verify-captcha.js: this endpoint is only
  // ever called by the client when VITE_TURNSTILE_SITE_KEY is configured
  // (i.e. the operator has deliberately turned this feature on), so a
  // missing server secret here means a real misconfiguration, not "feature
  // disabled" - reject rather than silently pass every request through.
  if (!process.env.TURNSTILE_SECRET_KEY) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ ok: false, error: "turnstile_not_configured" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const token = String(body.token || "");
    if (!token) {
      res.status(400).json({ ok: false });
      return;
    }

    const forwardedFor = req.headers["x-forwarded-for"];
    const remoteip = typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : undefined;

    const verifyBody = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token });
    if (remoteip) verifyBody.set("remoteip", remoteip);

    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyBody,
    });
    const result = await response.json();

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: Boolean(result?.success) });
  } catch (error) {
    console.warn("AuthorHub Turnstile verification request failed.", error);
    res.status(502).json({ ok: false });
  }
}
