
# AuthorHub Engineering Preferences

This public document is the concise source of truth for future AuthorHub work. Product history belongs in Git, not here.

## Product Boundary

- AuthorHub is a private manuscript atlas for writers. The authenticated workspace is the product; do not turn it into a marketing dashboard.
- Preserve the established writing workflow: author center, novel pages, focus editor, relation graph, timeline, media references, sharing, user center, and reading settings.
- Supabase stores user documents and collaboration data. Persist compatible additions inside the existing document JSON unless a reviewed migration is genuinely required.
- Do not change DNS, production services, email delivery, credentials, repository settings, or deployment behavior without explicit authorization.

## Engineering Standard

- Dirty code means code that is verbose, piled up, illogical, incompatible, difficult to understand, or difficult to edit. Do not ship it.
- Prefer small modules with explicit ownership, stable IDs, pure data helpers, and testable state transitions. Remove obsolete paths instead of covering them with later overrides.
- Preserve backward compatibility for existing user documents and shared novels. Migrations must be deterministic, idempotent, and safe for malformed legacy records.
- Structural edits and destructive actions must persist through the existing local and Supabase save chain. Unsaved text drafts must never be overwritten by unrelated color, tag, layout, or page-structure updates.
- Keep high-frequency UI state out of cloud writes. Typing, hover, selection, animation, and drag frames stay local; persist only deliberate saves and completed structural changes.
- Comments explain non-obvious constraints only. Git history and focused tests carry implementation history.

## UI Standard

- Preserve the current paper texture, editorial hierarchy, warm cafe light, Morandi palette, and restrained tactile depth.
- Avoid generic SaaS layouts, cold metallic surfaces, neon glow, decorative gradients, excessive cards, and visual rewrites that erase the existing identity.
- Keep interfaces responsive, readable, and editable from 320px phones through large desktops. Long content must remain wheel/touch scrollable without visible grey vertical scrollbars.
- Respect reading settings in manuscript content and focus-editor text. English in novel reading/editing content defaults to Nimbus Roman unless the user chooses another reading font; global navigation and product chrome retain their established fonts.
- Motion must be purposeful and support `prefers-reduced-motion`. Avoid permanent animation that consumes resources after the interaction has settled.

## Relation Graph

- Relationships use stable IDs. Selecting A then B keeps A in the inspector, uses A as source, fills B as target, and shows both endpoints without rebuilding the SVG scene.
- Main-character relationships use `#C95F5A`; ordinary relationships and supporting halos use the fixed grey-green `#8BA09C` family.
- Main characters remain central; supporting nodes cluster by relationship distance and degree. User-dragged normalized positions and lock state persist per novel.
- Reset view clears the complete saved graph layout and lock state. Deleting a character also removes its relationships, media, and layout entry.
- Relationship labels, node focus, hover, preview, and pane resizing are lightweight updates. Only graph data, canvas size, or reset may restart the force scene.

## Focus Editor

- Focus pages support long outlines and world-building notes. New subtitles always append to the end; first conversion preserves the existing plain text as the first page.
- Search is scoped to the active subtitle. Without subtitles, it searches the whole field.
- Add, rename, reorder, and delete are structural operations and sync immediately without saving unrelated unsaved fields.

## Privacy And Security

- Before every commit and release, scan tracked files and staged diffs for secrets, tokens, passwords, private keys, personal email addresses, user manuscripts, production identifiers, incident details, database diagnostics, and internal operations data.
- Public feedback contact information explicitly presented to users may remain. Test accounts, real user identifiers, and production snapshots may not.
- Keep secrets only in ignored local environment files or repository/deployment secret stores. Examples and tests use obvious synthetic values.
- Public sharing must expose only the selected display fields. Hidden character settings, private notes, owner links, and account metadata remain server-filtered.
- Security fixes that expose an active vulnerability must reach production before detailed public disclosure.

## CI/CD Gate

- All changes go through a feature branch and pull request. `master` is protected and cannot accept direct pushes.
- Required checks include dependency install, all `verify:*` suites, production build, dependency audit, secret scan, CodeQL, Supabase migration verification when relevant, and Playwright desktop/tablet/mobile flows.
- Production is built from the reviewed commit. Git-based automatic Vercel deployment stays disabled; the release workflow deploys the prebuilt artifact only after checks pass.
- Deployment must include production smoke tests and a defined rollback path. A failed smoke test is not a successful release.
- A task is complete only after `git diff --check`, all required tests, privacy review, and a clean intended worktree. Unrelated user files must not be modified or committed.

