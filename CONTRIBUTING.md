# Contributing To AuthorHub

AuthorHub is a private manuscript workspace. Changes must preserve data safety, the established paper-and-Morandi visual language, and compatibility with existing documents.

## Engineering Standard

- Keep modules small, explicit, compatible, and editable. Do not add verbose overlays, duplicated branches, or unexplained state coupling.
- Preserve existing documents and share contracts. Any data migration must be deterministic, idempotent, covered by tests, and paired with rollback-aware delivery notes.
- Keep draft interactions local until the product deliberately saves; unrelated changes must never overwrite unsaved fields.
- Use stable IDs for persisted entities and test state transitions that create, update, reorder, or delete them.

## Privacy And Security

- Never commit credentials, tokens, private keys, personal data, user manuscripts, production diagnostics, local exports, or screenshots containing private content.
- Treat public sharing as server-enforced data minimization. New fields must be explicitly allowed or stripped by the relevant share sanitizer and tests.
- Supabase changes require a migration, RLS policies, grants, and local migration verification. Do not apply production migrations without approval.
- Production changes use the protected manual workflow. `validate-only` runs the linked migration dry-run without deployment; `release` applies reviewed pending migrations, deploys the exact prebuilt artifact, verifies that both public domains serve its expected entry asset, and rolls back on failure. Direct Dashboard schema edits are not part of the release path.

## Quality Gate

- Work on a feature branch and open a pull request. `master` accepts only reviewed, passing changes.
- Before requesting review, run all `verify:*` checks, a production build, dependency audit, relevant Playwright tests, `git diff --check`, and a privacy scan.
- A failed path filter, migration check, secret scan, CodeQL analysis, browser test, artifact check, or production smoke test must block promotion. Production release jobs must not be canceled by ordinary branch activity.
- Do not commit, push, merge, deploy, or change production services unless the requested delivery stage has been explicitly approved.

## Reproducible Toolchain

- Use the exact Node version in `.node-version` / `.nvmrc`. `package.json` and `.npmrc` reject installs outside the supported Node 22 line instead of silently regenerating the lockfile under another runtime.
- Run `npm ci`, never an unreviewed global package install, for repository dependencies. Run `npm run doctor` before browser QA to verify Node, the lockfile, and a Playwright-managed Chromium.
- Local Playwright may use another complete Chromium revision from Playwright's own Windows cache when its package-pinned download is incomplete. CI never uses this fallback: it installs the package-pinned browser in a clean runner.
- Docker and the Supabase CLI are required only for local migration reset/lint. Their absence does not invalidate frontend QA; the migration job provisions a pinned Supabase CLI and remains the authoritative database gate.
- Release tooling is version-pinned in the workflow. Do not replace pinned Action SHAs, Supabase CLI, actionlint, or Vercel CLI versions with mutable global installations.
