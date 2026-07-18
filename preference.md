# AuthorHub Engineering Preferences

This public file records the maintenance choices that should survive individual releases.

- Prefer a narrow, verified repair over a broad cosmetic rewrite.
- Keep long-form writing cards bounded: scroll inside the card, allow vertical resize, and persist the user-selected height per novel and field.
- Preserve the literary material system: reading settings retain their embossed paper texture; scratchpad text uses horizontal rules while mind maps use only low-contrast paper fibre.
- Relationship semantics are visual contracts: every `主角*` pair has the fixed `#C95F5A` line and label; selected supporting characters use a calm outer-halo pulse without recoloring their core.
- Any graph drag interaction must remain correct under zoom by converting viewport coordinates back into graph coordinates before saving layout.
- Treat provider-only settings as configuration, not migrations: Turnstile needs its Cloudflare keys in Vercel, and Supabase Auth leaked-password protection must be enabled in the Auth dashboard or Management API.
- Validate desktop, tablet, and phone before release. Do not delete a test merely because it is inconvenient; delete only tests proven redundant by equivalent coverage.
