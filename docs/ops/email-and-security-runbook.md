# AuthorHub email and security runbook

## User update email

Use the reusable local batch script. Do not add bulk email controls to the AuthorHub UI.

1. Verify the sending domain in Resend: SPF, DKIM, and DMARC should pass before sending.
2. Store secrets only in local `.env.local`: `RESEND_API_KEY`, `AUTHORHUB_EMAIL_FROM`, `AUTHORHUB_FEEDBACK_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Dry-run the recipient source:
   `node scripts/send-user-update-email.mjs --dry-run`
4. Send to internal test addresses:
   `node scripts/send-user-update-email.mjs --send --test-to you@example.com`
5. Send a small batch:
   PowerShell:
   `$env:AUTHORHUB_EMAIL_CONFIRM="SEND_AUTHORHUB_UPDATE"; node scripts/send-user-update-email.mjs --send --all --limit 20`
   macOS/Linux:
   `AUTHORHUB_EMAIL_CONFIRM=SEND_AUTHORHUB_UPDATE node scripts/send-user-update-email.mjs --send --all --limit 20`
6. If bounce/spam results are acceptable, use the zero-cost daily batch flow.
   PowerShell:
   `$env:AUTHORHUB_EMAIL_CONFIRM="SEND_AUTHORHUB_UPDATE"; npm run email:update:daily`
   macOS/Linux:
   `AUTHORHUB_EMAIL_CONFIRM=SEND_AUTHORHUB_UPDATE npm run email:update:daily`
7. Repeat the daily command on later days. The script keeps `logs/authorhub-email-state.json`, skips addresses already marked sent, and continues with the next unsent users.

Each user receives an individual email, not BCC. The script writes JSONL send logs under `logs/`. Use `--daily-limit 300` only after switching to a provider with a 300/day free quota, such as Brevo; the default npm daily script stays at Resend Free's 100/day limit.

Optional template files are supported with `--html-template path/to/email.html` and `--text-template path/to/email.txt`. Templates can include `{{email}}` and `{{feedbackEmail}}`.

## First-stage attack response

Keep Aliyun DNS unchanged unless the attack cannot be handled at the Vercel edge.

1. In Vercel, enable Attack Mode when active abuse starts.
2. Add stricter custom firewall rules or rate limits for `/api/captcha`, `/api/verify-captcha`, `/share/*`, and `/join/*`.
3. Prefer path, IP, ASN, bot signal, and request-pattern rules over broad country blocking, because domestic users may be affected.
4. In Supabase Auth, enable leaked-password protection from the dashboard.
5. Keep Aliyun WAF or Anti-DDoS as a second-stage option only if Vercel edge mitigation is not enough or if traffic must be routed through Aliyun cleaning.

Before saving any dashboard setting, capture the rule text and expected user impact so it can be reviewed.

Suggested first rules:

- Rate-limit `/api/captcha` and `/api/verify-captcha` by IP, starting around 30 requests/minute with challenge or deny after the limit.
- Rate-limit `/share/*` and `/join/*` by IP, starting around 120 requests/minute; raise only if real readers are affected.
- Challenge obvious script clients such as empty user agents or `curl/*` on public pages.
- Keep Bot Protection in log/challenge mode first, then tighten after checking Firewall events.

The current custom captcha is useful against simple registration spam only. It does not protect login attempts, high-volume scraping, or DDoS traffic. Cloudflare Turnstile can replace the custom captcha later without moving DNS to Cloudflare; it only needs a site key on the page and server-side token verification.

## Supabase free-plan IO hygiene

Current production dry-run shows `author_hub_documents` is dominated by TOASTed JSONB. Most users have small documents, but a small set of historical documents still contains inline `data:image/` payloads.

Use the local read-only scanner before any media cleanup:

`npm run media:migration:dry-run`

The scanner needs local `.env.local` values for `VITE_SUPABASE_URL` (or `SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`. It performs zero writes and prints only counts, anonymized row prefixes, size estimates, and a suggested batch size. Do not run a write migration from this script.

If cleanup is approved later, migrate conservatively:

1. Export or snapshot the candidate document before touching it.
2. Process only 1-3 large documents per batch on the free plan.
3. Upload embedded images to `author-hub-media`, rewrite JSON to public Storage URLs, then verify the document loads and image URLs render.
4. Wait between batches and re-check table size/advisors before continuing.
5. Never run this during active user traffic spikes.
