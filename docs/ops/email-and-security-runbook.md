# AuthorHub email and security runbook

## User update email

Use the local one-off script. Do not add bulk email controls to the AuthorHub UI.

1. Verify the sending domain in Resend: SPF, DKIM, and DMARC should pass before sending.
2. Store secrets only in local `.env.local`: `RESEND_API_KEY`, `AUTHORHUB_EMAIL_FROM`, `AUTHORHUB_FEEDBACK_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Dry-run the recipient source:
   `node scripts/send-user-update-email.mjs --dry-run`
4. Send to internal test addresses:
   `node scripts/send-user-update-email.mjs --send --test-to you@example.com`
5. Send a small batch:
   `AUTHORHUB_EMAIL_CONFIRM=SEND_AUTHORHUB_UPDATE node scripts/send-user-update-email.mjs --send --all --limit 20`
6. If bounce/spam results are acceptable, send the remaining users with `--offset 20`.

Each user receives an individual email, not BCC. The script writes JSONL send logs under `logs/`.

## First-stage attack response

Keep Aliyun DNS unchanged unless the attack cannot be handled at the Vercel edge.

1. In Vercel, enable Attack Mode when active abuse starts.
2. Add stricter custom firewall rules or rate limits for `/api/captcha`, `/api/verify-captcha`, `/share/*`, and `/join/*`.
3. Prefer path, IP, ASN, bot signal, and request-pattern rules over broad country blocking, because domestic users may be affected.
4. In Supabase Auth, enable leaked-password protection from the dashboard.
5. Keep Aliyun WAF or Anti-DDoS as a second-stage option only if Vercel edge mitigation is not enough or if traffic must be routed through Aliyun cleaning.

Before saving any dashboard setting, capture the rule text and expected user impact so it can be reviewed.
