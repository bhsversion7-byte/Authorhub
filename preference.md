# AuthorHub Preference Record

This file records the final product/design rules for AuthorHub so future CSS cleanup keeps the confirmed behavior instead of reintroducing old overrides.

## Product Summary

- AuthorHub is a private manuscript atlas for writers. It organizes author identity, global reading preferences, novels, outlines, settings, themes, character relationship graphs, character detail cards, timelines, reference images, and account/data operations.
- The logged-in app is the product surface. It is not a marketing page: it is a writing cockpit with a persistent sidebar, paper background, floating music player, author dashboard, user center, and per-novel workspace.
- Data behavior should remain privacy-first. Account content belongs to the current user, with local fallback/cache behavior when cloud sync is unavailable.

## 2026-07-02 Final Local Code-Review Polish

- Boundary: this was a local final review/QA pass only. Nothing was committed, pushed, or deployed.
- Desktop novel navigation rule: desktop/fine-pointer sidebar rows must not show any `::`/grip drag symbol. The drag handle is now rendered only when `matchMedia("(pointer: coarse)")` is true; desktop DOM has zero `.novel-drag-handle` elements. Sortable still uses the whole row on desktop and the explicit handle on coarse-pointer devices.
- Floating music player: collapsed content no longer uses `display: none`. Track metadata and controls remain mounted and transition through `opacity`, `visibility`, `transform`, `max-width`, and `max-height`. A real QA click found the collapsed arrow had been overflowing its 62px pill and was partly outside the clickable container; fixed collapsed grid to `38px 0 0 22px`, 73px total width, 49px height. Verified the arrow is inside the container and expand/collapse clicks succeed.
- Focus popovers: `FocusTextarea` now treats `onChange` as optional defensively, clears its delayed focus timer on unmount, and keeps read-only focus mode free of save controls. `usePopoverDismiss` also clears its delayed refocus timer on cleanup.
- Relation graph: removed the dead `normalizeLegacyTag` wrapper after moving tag normalization into `relationGraphRules.js`. Main-character relationship lines remain `#C95F5A`; browser QA found one red main-pair line and ordinary lines still using the novel color.
- Email script: `--send --dry-run` now stays a real dry run (`sendMode = requestedSend && !dryRun`) and does not ask for Resend/env confirmation.
- Verified locally: `npm run build`, `npm run verify:graph`, `npm run verify:share`, `npm run verify:markdown`, `npm audit --omit=dev`, `git diff --check` (only CRLF warnings), desktop geometry for current-word/actions no-overlap, desktop no drag-handle DOM, graph red-line color, music expand/collapse, and mobile 390px no horizontal overflow.
- Tooling limit: MCP browser QA could not simulate a trustworthy real Sortable drag for timeline cards. Synthetic DOM mouse events did not move Sortable, and temporary Playwright test attempts were blocked by npm temporary package resolution without adding project dependencies. Code path remains reviewed (`TimelineFlow` Sortable `onEnd` calls `onReorderEvent(novel.id, movedId, event.newIndex)`, and `reorderEvent` moves by id so selected event identity is preserved), but a human/manual browser drag is still the final confirmation before commit/deploy.

## 2026-07-01 Sharing And Timeline Local Pass

- No commit/deploy boundary: timeline drag sorting and novel sharing are still local on `feature/timeline-sharing-local`. Do not commit, merge, push, or deploy this feature pass until the user inspects localhost.
- Sharing contract: Novel Section has a quiet share-arrow control near the publish pill. It offers `共同编辑` and `只读查看`; editor links require login and join the shared source workspace, while viewer links open a public read-only page.
- Realtime scope: collaboration is saved-version sync only. It is not cursor/keystroke co-editing. Shared saves must use a version/revision guard so stale whole-document writes do not silently overwrite another collaborator's newer save.
- Read-only contract: public viewer mode must hide or disable every mutation path: title/meta edits, theme editing, add/delete/save character, image upload/delete, relationship editing, add/delete/save timeline, and timeline drag sorting. Browsing, image carousel navigation, graph viewing, focus text reading, and music player remain available.
- Public privacy contract: viewer links must not expose private hidden character fields such as `secret`, `hidden`, or `privateNote`. Editor links keep the complete source.
- Timeline ordering: timeline event cards support desktop drag sorting with SortableJS. Manual order is authoritative; new events append instead of being date auto-sorted. The selected event/editor should stay on the same event after reorder.
- Hover clarity: full-card hover motion must remain integer translate-only; no fractional scale on cards because Chrome/Windows text resampling makes card text blurry.
- Supabase schema: sharing uses dedicated shared-novel, member, and link tables plus RPCs for ensure/join/list/save/view. RLS permission checks use a security-definer helper to avoid recursive policy loops; editor-link joins must not downgrade an existing owner membership.
- Public share route: `/share/:token` must stay isolated from private workspace load/save/flush. It may poll the shared row for saved-version updates, but it should only refresh state when `updatedAt` changes.
- Link revocation: "重新生成" (regenerate) must deactivate the previous same-role link (`is_active = false`) before inserting the new token, not just mint a new link alongside the old one. Requires an UPDATE RLS policy + grant on `author_hub_share_links` (owner/editor only) in addition to the existing select/insert ones.
- Realtime conflict guard: while a local edit to a shared novel has an unsaved debounced save in flight, an incoming realtime update for that same novel must be skipped rather than applied, so a collaborator's broadcast cannot clobber not-yet-saved local edits mid-typing. Shared-novel saves must also flush immediately on tab hide/close/unmount, same as the private cloud save.
- Verification done this pass: Supabase sharing migrations were applied to project `scpxsfmsoeosarpafgil`; local QA generated editor/viewer links, opened a public read-only page, joined the editor link, and confirmed the owner role stayed intact. `npm run build`, `npm run verify:markdown`, `npm run verify:share`, and `git diff --check` are still required before user inspection.

## Functional Areas To Preserve

- Landing gateway: cinematic 3D book, quote atmosphere, "开始落墨", login/register panel, and the two required landing fonts 香萃刻宋 and 油印体.
- Sidebar / preview frame: logo, 作者主页, 用户中心, manuscript index, novel entries, add-novel button, and one clear collapse control.
- Author profile: editable public author fields, creation progress ring, global reading settings, font size, font family, day/night mode, and privacy blur.
- User center: username/email, day/night switch, password change, JSON/Markdown export, clear data, logout, unregister account, feedback email, donation panel, and privacy-protected QR reveal.
- Novel section: yellow novel selection/header card, outline card, setting card, theme tag card, platform/publish pill, and editable metadata.
- Relation graph: dotted star-map canvas, add character, focus/reset controls, draggable nodes, relationship labels, graph/detail split adjustment, and right-side character detail editor.
- Character detail: image upload/URL, name, age, role, tags, custom tags, planet color palette, background story, hidden setting, save/delete character, relationship creation/clear controls.
- Timeline flow: event cards, add time point, left/right timeline navigation, selected event editor, background/plot focus editors, reference images, AI handoff buttons, save/delete time point.
- Floating music player: low-interference play/pause, previous/next, track metadata, collapse, and drag positioning.
- Guided onboarding: seven live-target steps for sidebar preview, author profile, user center, music player, novel cards, relation graph/person detail, and timeline.

## Visual Direction

- Mood: jazz cafe, paper texture, low-saturation Morandi colors, editorial, refined but approachable.
- Keep existing functional regions and overall aesthetic logic intact.
- Cards need visible distinction. They should not merge into one flat surface and should not feel cold or metallic.
- The global background should keep the landing-page paper environment quality: visible, textured, and clear.
- Light and dark mode surfaces should correspond to each other. Dark mode is not color removal.
- Avoid cold metallic surfaces, abrupt neon glow, square form language, and generic AI SaaS gradients.

## Color And Surface Rules

- Global background: high-quality landing-page paper texture, never a flat solid color.
- Novel selection/header: uniform Morandi yellow `#F3E5AB`, not a gradient.
- Outline: light grey rice-paper surface.
- Setting: matte blue-stone grey companion surface.
- Theme tags: soft lilac/purple surface.
- Relation graph: muted green-grey star-map surface with dotted grid.
- Character detail: warm beige paper card.
- Timeline: light green in light mode, deep green companion in dark mode.
- Author profile: warm cream/brown companion in dark mode.
- Progress card: green companion surface; the white progress-ring center keeps dark ink text even in dark mode.
- User account/donation cards: soft green and blue/grey companion surfaces.
- Destructive actions: muted rose/red surface matching confirm delete buttons.
- Primary manuscript actions: dark coffee/ink button with white text.

## Interaction Rules

- Card hover: subtle micro-bounce plus visible border reveal.
- Card hover must not add bright highlight, glow, or abrupt color change unless explicitly requested.
- Active state: small press-down or scale response.
- Motion must be restrained and performant, especially on Windows.
- Editable text fields may use a soft borderless micro-highlight frame.
- Attribute labels/tags themselves should not get high-highlight treatment.
- Avoid square borders. Rounded, paper-like, soft-edge controls are preferred.
- Tags, pills, and labels should stay readable but secondary.
- Guided onboarding must use short copy, a clear arrow, live target positioning, and skip on every step.
- Guided onboarding must not blur, darken, or over-highlight the application behind it. Users need to see the real UI clearly.
- Confirmation modals should be viewport-owned overlays with full-app blur. They should not look like inline blocks inside a card.

## Button Rules

- Same semantic action means same visual language.
- 保存人物 and 添加连线 are primary relationship actions and should share background, border, text color, hover, and active behavior.
- 删除人物, 清空关系选择, 删除时间点, and modal danger actions share red background, fine outer border, white text, and active micro-press in both light and dark mode.
- 确认注销 in the unregister modal must match 确定删除 danger modal styling.
- Buttons must remain readable in dark mode. Icons inherit button text color.

## Landing And Loading Rules

- Landing must preserve 香萃刻宋 and 油印体.
- The landing book cover is procedurally designed in code. Do not reintroduce the old `bookcover.png` dependency.
- The book appears immediately, can auto-flip after page open, and direct drag should control page direction.
- Mouse hover alone should not take over page turning.
- "开始落墨" closes the book and enters auth without a dramatic zoom.
- Normal app navigation should not show "loading manuscript" effects. Only account/session handoff may show a clean, simple privacy-space loader.

## Dark Mode Rules

- Dark mode should echo light mode surfaces: yellow/cream cards become muted amber companions, green cards become deep green companions, purple cards become deep plum companions.
- Bright paper centers such as the progress-ring center keep dark ink text.
- Music player, add buttons, focus editors, tag chips, modal buttons, and expanded text editors require explicit dark-mode readability checks.
- Dark mode should still feel like paper, ink, warm cafe light, and editorial depth, not pure black.

## Preserved Fixes

- Day/night mode persists across refreshes.
- Logo wrapper has no grey mask or accidental border; logo lightbox close button belongs in the upper-right.
- Sidebar collapse button is a single visible control.
- Sidebar novel ordering uses SortableJS-style row sorting: the dragged row lifts, the original list shows a soft ghost placeholder, nearby rows animate out of the way, and the reordered `data.novels` array persists through the existing save flow.
- Sidebar novel ordering should follow the reference row-drag pattern: Sortable attaches to the real list container, `.novel-nav-item` is the draggable row, `oldIndex/newIndex` map directly to the saved novel array, and adjacent one-step moves must work.
- The global page scrollbar is visually hidden while scroll behavior remains available, keeping the right edge clean.
- Preview/media carousel typography follows global font size and font family settings.
- Cards keep hover micro-bounce plus border reveal without hover glow/highlight shifts.
- Novel card metadata fields keep the same rounded micro-highlight in default, hover, focus, and dark mode.
- Focus/expanded editors are readable in light and dark mode.
- Relation graph dotted background covers the intended card area without excessive blank bottom space.
- The right-side layout must avoid the historical extra blank column caused by overflow/music/player/layout conflicts.
- Content cards keep symmetric horizontal breathing room: the gap between the sidebar preview edge and the first card matches the gap between the rightmost card edge and the viewport edge.
- Dark mode music player text, add-novel/add-time buttons, tag chips, and modal actions have explicit contrast.
- Onboarding uses live target arrows and keeps the background clear.
- Unregister and delete confirmation modals use matching danger-button styling.
- Floating music player default state is the compact collapsed pill: vinyl plus collapse button only. Do not widen the collapsed state unless it is explicitly requested.
- Floating music player full expansion must stay smooth on Windows Chrome: avoid React mount/unmount churn and avoid animating heavy blur/shadow effects during collapse/expand.
- Dark timeline editor must not show square parent-background artifacts around rounded editor surfaces. The visible editor surface is `.event-editor-main`; the `.event-editor` wrapper should not leak a square background in dark mode.
- Mobile navigation keeps a single-line horizontal scroll. Novel items and `添加新小说` must not overlap or stack inside that nav.
- Phone timeline uses the compact `< current event >` switcher while hiding oversized timeline cards.
- Card hover text must remain sharp. Avoid fractional scale on full-card hover transforms.
- Desktop content must stay within the viewport right edge and preserve symmetric breathing room beside the sidebar.

## Engineering Rules For Cleanup

- Fix root causes and CSS ownership/override problems instead of adding broad override layers.
- Keep edits scoped to the broken component or state.
- During CSS cleanup, migrate confirmed final rules back to their owning component/area.
- Do not delete or change established feature zones while reducing CSS.
- Do not casually change colors, feature layout, fonts, or functional areas.
- Use precise verification for each visual state: light mode, dark mode, hover, active, focus, mobile/narrow layout, and Windows performance-sensitive animation.

## Maintenance Log (backup record)

Records substantive maintenance so future cleanup keeps the confirmed behavior. Most entries below changed no color, layout, font, or interaction; the 2026-07-02 entry is the exception — it's a bug-fix pass, so some entries there intentionally correct rendered output back to the design intent already described elsewhere in this file (not a redesign).

### 2026-07-02 (evening) — onboarding copy + full 8-angle code review, 6 fixes, not committed/deployed
- **Scope:** local-only. Nothing committed, merged, pushed, or deployed. Covers a tour-copy edit plus a full `/code-review --level high` pass (8 parallel finder angles + targeted verification against live source) over the entire uncommitted sharing/collaboration diff, plus a separate whole-repo dead-code sweep.
- **Onboarding tour copy:** `TourProvider.jsx` Step 05 (the novel-section step, shown after registration) now mentions the share button ("旁边的分享按钮可以生成「共同编辑」或「只读查看」链接，邀请他人协作或预览"). No selector, layout, timing, or backdrop behavior touched — `.guided-tour-layer` still has `backdrop-filter: none !important`, confirmed unchanged. Could not do a full live click-through in this session because local `vite dev` doesn't emulate the `/api/captcha` serverless function (it returns raw source text instead of JSON, so registration's captcha fetch loop never resolves) — verified instead via build success, the CSS backdrop rule, and app boot with zero console errors after the edit.
- **Dead-code sweep (Explore agent, whole repo):** clean — zero unused exports, zero orphan files, zero unused deps, all sampled CSS selectors have JSX matches, no debug leftovers/TODOs, all 8 sharing migrations are non-redundant sequential fixes.
- **Code review (8 finder angles, verified against live files, not just diff text):** fixed 6 real issues, left several minor/lower-value ones unfixed (noted below) per this file's "keep edits scoped" rule.
  - **Fixed — privacy:** `RelationGraph.jsx`'s character detail pane rendered the "隐藏设定" (hidden setting) field label unconditionally, even on the public `/share/:token` read-only page where the underlying `secret` value is already stripped server-side. An anonymous viewer would see an empty but clearly-labeled hidden field, leaking the field's existence. Now the whole field is omitted when `readOnly` (the only read-only path in this app is share-related, never a private read-only mode of the owner's own data, so this gate is unambiguous).
  - **Fixed — data loss:** `logout()` in `App.jsx` awaited `flushCloudSave()` but never called the sharing pass's own `flushSharedSaves()`, so a quick edit-to-a-shared-novel then logout could drop the edit — the exact bug class the 2026-07-01 entry says was fixed for tab-hide/close but missed here.
  - **Fixed — reliability:** `createShareLink` ("重新生成") ran the old-link revoke UPDATE before the new-link INSERT as two independent requests; a failure between them left zero active links for that role. Reordered to insert-then-revoke (excluding the fresh token from the revoke filter), so a mid-operation failure now leaves the old link still working instead of leaving collaborators locked out.
  - **Fixed — defense in depth:** `NovelSection.jsx`'s own top-level fields (title/subtitle/genre/current & target words/finish date/outline/setting) called `onNovelChange` directly with no JS-level `readOnly` guard, relying only on the HTML `readOnly` attribute — the one mutation surface in the whole sharing diff that skipped the internal-guard pattern already applied to `MediaCarousel`/`FocusTextarea`/`RelationGraph`/`TimelineFlow` (per the earlier 2026-07-02 pass). Added a shared `patchNovel()` helper with the guard, used by all 8 call sites.
  - **Fixed — efficiency:** the public share page's 12-second poll (`getSharedNovelByToken`) kept firing while the tab was backgrounded/hidden, unlike every other flush/save path in this diff which is visibility-gated. Now skips the RPC when `document.visibilityState === "hidden"`.
  - **Fixed — drift-proofing:** `NovelSection.jsx`'s default-visible-sections fallback hardcoded a literal `["outline","setting","themes","graph","characters","timeline"]` array instead of importing the identical `FULL_PUBLIC_SECTIONS` already exported by `shareSections.js` (verified byte-identical before the swap, so no behavior change) — closes a silent-drift risk if a section is ever added.
  - **Investigated, not fixed (low value or already unreachable):** a stale `status: "ready"` value in `NovelShareControl.jsx` that's set but never distinctly checked (cosmetic, zero behavior difference from `""`); a duplicated email-regex literal between `AuthGate.jsx` and `scripts/send-user-update-email.mjs` (cross-boundary shared-module extraction judged not worth it for one regex); an unused `SHARE_ROLES.OWNER` export (documents a real DB role, harmless to keep); several `App.jsx` simplification opportunities (chained `useMemo`s for the merged novel list, duplicate splice-reorder logic between private/shared novels, the `shared-${id}` prefix hand-typed in ~5 places, `isPublicShareRoute` guarded per-effect instead of structurally) and efficiency notes (decorate→strip round-trip per keystroke on shared-novel edits, debounce closures capturing full novel objects, `removePrivateFields`'s full recursive walk per viewer decoration) — real but lower-severity, left alone this pass to keep the diff reviewable; worth a dedicated pass later rather than mixing into a bug-fix pass.
  - **Checked and confirmed NOT a bug:** the realtime-subscription effect keys only on shared-novel ids and could in theory keep a stale `role` in its closure — but there is no client-side "change an existing collaborator's role" capability anywhere in the product today, so the path is unreachable; left as-is rather than risk extra resubscribe churn for a currently-impossible case. Also confirmed the `.novel-drag-handle`/`GripVertical` code a reviewer flagged as "should have been removed" is intentional and matches this file's own newer entry above (coarse-pointer-only handle, zero on desktop) — an older superseded entry describes full removal, the current code matches the later decision.
  - **Verification:** `npm run build`, `npm run verify:markdown`, `npm run verify:share`, `npm run verify:graph`, `git diff --check` (CRLF warnings only) all pass after the fixes. Live browser re-verification of the fixed paths (share-link regenerate, logout-with-pending-shared-edit, read-only hidden-setting field) is still needed before commit — blocked this session by the same local captcha/login limitation noted above.

### 2026-07-02 — afternoon local refinement pass, not committed/deployed
- **Scope:** local-only refinement after the sharing/security pass; no commit, push, deploy, Resend send, Vercel dashboard save, or Supabase dashboard setting change was performed.
- **Relation graph:** main-character relationship detection now treats `主角`, `主角1`, `主角2`, `主角34`, etc. as main-character tags, while keeping legacy `主角攻`/`主角受` compatibility. Only main-character to main-character relationship lines use the special red. The final line color is `#C95F5A` because the first red pass was too pale for visual emphasis. The highlight transition must preserve core-line width (`1.7`) instead of flattening every non-focused line back to the ordinary width.
- **Relation graph QA:** a local browser QA harness rendered 12 characters with 14 dense relationships, including multiple numbered main-character tags. Main-to-main lines were red and ordinary relationship lines stayed the novel color. No production data or logged-in user data was mutated.
- **Timeline sorting:** `TimelineFlow` already has SortableJS card sorting wired to `onReorderEvent(novel.id, movedId, newIndex)`, and `App.jsx` reorders by stable event id rather than by date. New time points continue to append instead of auto-sorting by date. Synthetic browser events from MCP cannot fully prove native drag because Sortable ignores untrusted drag sequences; verify final tactile behavior manually in localhost before commit.
- **Novel sidebar sorting:** desktop/fine-pointer web must show no `::`/grip handle in the novel navigation. Desktop keeps whole-row dragging. Touch/coarse-pointer devices use a subdued drag handle and Sortable's `handle` option, so horizontal scrolling and tapping a novel title do not accidentally reorder the novel list.
- **Readonly/share hardening:** focused textareas and publish-link save paths now guard internally against read-only writes. Changing the viewer share-section chips clears the previously generated URL so users cannot accidentally copy an old permission set; the picker also refuses to leave a viewer link with zero public sections.
- **Email update tooling:** added `scripts/send-user-update-email.mjs` as a local one-off Resend sender. It defaults to dry-run, sends one email per recipient, writes JSONL logs, and requires explicit `--send --all` plus `AUTHORHUB_EMAIL_CONFIRM=SEND_AUTHORHUB_UPDATE` before any bulk send. Do not build bulk email controls into the AuthorHub UI.
- **Security runbook:** added `docs/ops/email-and-security-runbook.md`. First-stage attack response remains Vercel Firewall/Attack Mode/rate rules in front of the existing Vercel app, with Aliyun DNS unchanged. Supabase leaked-password protection is still a dashboard action, not a code change.
- **Verification run:** `npm run build`, `npm run verify:markdown`, `npm run verify:share`, `npm run verify:graph`, `git diff --check`, and the email script dry-run passed locally; `git diff --check` only reported CRLF conversion warnings.

### 2026-07-02 — sharing feature QA pass: found+fixed bugs, no commit/deploy yet
- **Scope:** this pass covered the music player rollback, a full functional/security/responsive QA of the novel-sharing feature (still on `claude/gifted-payne-8760bc`, not merged), the specific bug list the user filed, and additional bugs found during QA that weren't on that list. Per user instruction, nothing in this pass is committed, merged, or deployed yet.
- **Music player:** reverted the in-progress collapsed-pill CSS/icon tweaks back to the last committed version (`ba15c63`). Default is still the compact collapsed pill (`useState(true)` in `FloatingMusicPlayer.jsx`) — unchanged, just discarding the uncommitted WIP on top of it.
- **Blocking migration applied:** `20260701072000_author_hub_share_sections.sql` (the missing `public_sections` column + section-aware sanitize functions) was applied to Supabase project `scpxsfmsoeosarpafgil`. Without it, every share-link creation hard-failed.
- **Critical bug found+fixed — request-storm / self-inflicted overload:** `supabase.auth.onAuthStateChange` fires repeated `SIGNED_IN` events (cross-tab session sync, token refresh) with a **new `authUser` object each time**, even for the same signed-in user. Several `App.jsx` effects depended on the whole `authUser` object (not `authUser?.id`), so every such event re-ran `loadSharedNovelsForUser()` and `saveAuthorHubData()` with zero user activity — hundreds of RPC calls within seconds, which measurably overloaded the live Supabase project (real 500/503/504s observed on otherwise-unrelated requests during QA). Fixed by keying those effects on `authUser?.id`. This was not on the user's bug list; found while investigating why the sharing feature felt unreliable in testing.
- **Bug list fixes (all in `App.jsx` / `shareAdapter.js` / new migrations unless noted):**
  - Dragging a **shared** novel in the sidebar was a silent no-op (`reorderNovel` only searched `data.novels`). Now reorders shared novels among themselves (session-local only — there's no server-side order column for shared novels).
  - Deleting/detaching a shared novel resurrected the stale pre-share private copy (never removed from `data.novels` when the novel was first shared) and re-saved it, discarding collaborative edits. `confirmDeleteNovel`'s shared branch now also strips the matching `sourceNovelId` entry out of `data.novels`.
  - Shared-novel saves (900ms debounce) had no flush on tab-close/hide, unlike the private save. Added `flushSharedSaves()`, wired into the same `beforeunload`/`visibilitychange` effect as `flushCloudSave()`.
  - "重新生成" never revoked the old link (`is_active` stayed `true` forever). New migration `20260702010000_author_hub_revoke_share_links.sql` adds the missing UPDATE RLS policy/grant on `author_hub_share_links`; `createShareLink` now deactivates same-role links before inserting the new one. Verified: old token starts returning "链接暂时无法打开" immediately after regenerating.
  - A collaborator's realtime save could overwrite not-yet-saved local edits mid-typing. The realtime handler now skips an incoming update for a novel that still has a pending local debounced save (`sharedSaveDebouncerRef.current.has(row.id)`); the pending save's own stale-version guard surfaces the conflict notice instead.
  - Consolidated the three hand-rolled debounce implementations (shimoAdapter local save, shimoAdapter cloud save, App.jsx per-novel shared save) into `src/lib/debounce.js` (`createDebouncer` / `createKeyedDebouncer`). Same behavior, one implementation.
  - The private-field allowlist (`secret`/`hidden`/`privateNote`) is still duplicated in `shareSections.js` (JS, client-side mirror) and the migration SQL (`author_hub_strip_private_jsonb`, the real server-side boundary) — languages can't share one source, so `scripts/verify-share-sections.mjs` now reads the SQL literal and asserts it matches the JS list byte-for-byte; verified it fails loudly on an intentional mismatch.
  - Supabase advisories: added `set search_path = public` to `sanitize_author_hub_public_novel` and `author_hub_strip_private_jsonb` (migration `20260702020000`). **Still open, needs the user in the Supabase dashboard (no API for this in the available tools):** enable leaked-password-protection under Auth settings.
  - Delete-confirmation modal showed "will permanently wipe" copy for both real private-novel deletes and harmless shared-novel detaches. Now branches on `deleteCandidate.sharedMeta?.id`: shared novels get "是否从手稿列表中移除该共享小说？" / "确定移除" and explicitly say the cloud workspace is unaffected; private novels keep the original permanent-delete wording.
- **Responsive bugs found+fixed during mobile/tablet QA (user-reported via screenshots, not on the original list):**
  - Novel-meta number/date inputs and the share-link URL display had ballooned to the user's global reading-font-size (16px+, bold) instead of their own fixed 12px chrome size, because material-system.css's blanket `.content-shell :where(input,...) { font-size: var(--editor-font-size) !important }` out-specificity'd their own rules. Fixed with matching-specificity overrides in `authorhub-state-corrections.css`.
  - On phones, the AO3 publish pill and share button (in their own dedicated grid column on desktop) fell back to `grid-column: auto` and auto-flowed into a 3rd 56px track meant only for icon buttons, clipping `预计总字数`'s digits. Fixed in `sharing-collab.css`: 2 even field columns + actions on their own full-width row.
  - Same `.novel-hero-actions` (AO3 + share) also looked disconnected — a floating island vertically centered beside both field rows — at any window narrower than a genuinely wide desktop (~1280px+), not just phones; user confirmed via screenshot at a resized/narrower browser window. Extended the same reflow from `max-width: 760px` to `max-width: 1180px` (this codebase's existing tablet/small-laptop cutoff, already used by `.dashboard-grid`/`.relation-layout`). Verified unchanged at 1280px.
  - That 1180px extension then exposed a deeper pre-existing gap: `.novel-hero`'s own 2-column grid (title block + `.novel-meta`) only drops to single-column at `max-width: 980px` (material-system.css and 3 other files), but the sidebar eats ~200-230px, so a 1000px browser window left `.novel-hero` only ~768px of box width against the ~900px its fixed-minimum columns (`minmax(360px,1fr)` + `minmax(420px,auto)`, plus gap/padding) need — `.novel-meta` (and AO3/share inside it) silently overflowed outside the card's right edge in the 981-1180px range, which read as "the buttons are missing." Rather than editing the 4 scattered 980px rules, added one authoritative override repeating the same single-column value at `max-width: 1180px` in `authorhub-state-corrections.css` (loads last), closing the gap without touching the existing narrower-range rules. Verified no overflow at 375/768/1000/1181/1280px.
  - `.character-attribute-grid` (姓名/年龄/身份属性/标签) used `repeat(auto-fit, minmax(130px, 1fr))`, treating all four as equal-width auto-fit columns — 标签's variable-length tag list never got more than one narrow column's worth of width at any viewport size, most visibly wasteful above phone width. Fixed with `.character-attribute-grid .tag-composer { grid-column: 1 / -1 }` in `styles.css`.
  - Mobile's collapsed sidebar reused desktop's icon-only-rail collapse CSS verbatim, but `.nav-stack` on phones is a horizontal flex bar, not a vertical rail — produced a cramped, unlabeled strip of icons and drag-handles. Fixed by hiding `.nav-stack` entirely when collapsed within the existing `max-width: 860px` breakpoint (`responsive-stability.css`); desktop's collapsed rail is untouched (verified at 1280px, still the narrow icon column).
- **Music player expand glitch (user-reported after the above, separate from the earlier ba15c63 rollback):** expanding the collapsed pill looked glitchy — `display: none` on `.track-window`/`.player-controls` can't be transitioned, so the title/controls popped in at full opacity in one frame while the pill's width was still ~220ms into animating up from 62px, overflowing the still-narrow box for a couple frames. First attempt kept the content permanently in the grid (opacity-only hide) so `display` never had to jump — but that made the collapsed pill's `圆框` visibly larger, because track-window/player-controls still contributed row height to the grid even at 0 width/opacity, unlike true `display: none`. Reverted that: collapsed state is back to exactly the original `display: none !important` (same `38px 18px` 2-track grid, same 9px gap, same 62px pill — pixel-identical to before this whole session). The actual fix is a `@keyframes music-content-reveal` (`opacity: 0 → 1`, 200ms, 60ms delay) applied only via `.floating-music:not(.is-collapsed) .track-window/.player-controls` — CSS *animations* (unlike transitions) do play when an element goes from `display:none` to displayed, so this fades the content in without touching how the collapsed pill looks or sizes at rest.
- **Sidebar drag-handle removed entirely (user-reported, superseding the hover-reveal attempt below):** the `::` drag-handle icon in front of every novel row read as clutter. First attempt kept the icon but faded it in only on desktop hover/focus (`@media (hover: hover)` in `sidebar-stability.css`) - the user tried it and asked to just delete the icon outright instead, for every screen size. Removed the `<button className="novel-drag-handle">` (and its now-dead CSS, and the unused `GripVertical` import) from `DraggableNovelList.jsx` completely, and dropped SortableJS's `handle: ".novel-drag-handle"` option so the whole `.novel-nav-item` row is the drag surface instead (Sortable's own click-vs-drag distance/delay threshold still lets `.novel-select-button`'s onClick fire normally for a plain tap; `filter: ".novel-delete-button"` still keeps the delete button from starting a drag). Verified: clicking a novel still navigates to it: `.novel-drag-handle` no longer exists in the DOM at any width.
  - With the handle gone, the mobile/iPad horizontal nav row had no visual affordance left that it scrolls sideways at all - it was previously an intentionally-hidden native scrollbar (`scrollbar-width: none` / `::-webkit-scrollbar { display: none }` in `responsive-stability.css`, inside the existing `max-width: 860px` breakpoint). Un-hid it there with a thin grey styled scrollbar (`scrollbar-color`/`::-webkit-scrollbar-thumb` at `rgba(141, 122, 107, 0.4)`, matching the muted-brown tone already used for the reading-panel scrollbar in `styles.css`) so the row now visibly shows "there's more to scroll," per user reference screenshot. iOS Safari doesn't support `::-webkit-scrollbar` styling and will just show its own native translucent overlay indicator instead, which is expected/acceptable. Scoped entirely inside the `max-width: 860px` block - verified desktop's `.nav-stack` at 1280px is untouched (`display: grid`, `overflow-x: visible`, no scrollbar involved at all, matching pre-existing behavior).
- **Verification:** all fixes checked live via the preview dev server (real Supabase project `scpxsfmsoeosarpafgil`, real login) at mobile (375px), ~900-1050px, ~1180px, and desktop (1280px) widths, plus a raw-API check confirming the public share RPC response never contains `secret`/`hidden`/`privateNote` fields. `npm run build`, `npm run verify:markdown`, `npm run verify:share`, and `git diff --check` are still required before this is committed.
- **Not yet done:** full end-to-end editor-role join test with a second real account (only the viewer-link flow and the owner-side UI were exercised); dark-mode screenshot pass on the new fixes (spot-checked computed styles only, no visual regression expected since none of the fixes touch color).

### 2026-07-02 (later) — security/data-safety pass + full code review, 10 findings fixed
- **Scope:** answered the user's security questions (Supabase Attack Protection / CAPTCHA, data-safety review, Resend email plan), then ran an 8-angle parallel code review (`/code-review --level high`) over the entire uncommitted diff (the full sharing feature + every fix above - nothing in this branch is committed yet), verified the results directly against the code, and fixed everything that came back CONFIRMED/PLAUSIBLE. CAPTCHA integration itself is deferred - user said "later" - Resend is deferred until the user has an API key.
- **Security/data-safety findings (Supabase project `scpxsfmsoeosarpafgil`):** RLS is enabled on all 5 tables; ~840 real user documents exist (not just the owner's), which raised the bar for how much this mattered. Fixed: the `author-hub-media` storage bucket had a broad SELECT policy letting anyone list every uploaded file across every user - removed it (migration `20260702030000`); the bucket is already `public=true`, so public image URLs are served via a path that never checked that policy in the first place, only enumeration did. Still open, dashboard-only (no API access for this): enabling Leaked Password Protection under Auth settings.
- **Verified NOT a bug:** two independent review passes flagged "new timeline events aren't auto-sorted by date anymore" as a regression. Checked against this file's own **2026-07-01** entry ("new events append instead of being date auto-sorted") - that's documented, intentional behavior from the timeline-drag-sort work, not something this pass touched or broke.
- **Data-loss risk (confirmed, fixed):** the debounce-consolidation cleanup ([[#2026-07-02 — sharing feature QA pass]] above) had accidentally made local-storage saves debounced (300ms) instead of immediate, contradicting the **2026-06-23** entry's explicit rule ("local-storage writes stay immediate ... no observable behavior change"). Reverted `shimoAdapter.js` to write local cache synchronously again; only the cloud upsert stays debounced.
- **Collaboration race (confirmed, fixed):** the realtime-overwrite guard added earlier this pass only covered the 900ms debounce window, not the actual in-flight save request (the keyed-debouncer entry is deleted the instant its timer fires, before the network round trip even starts). Added a separate in-flight tracking set (`sharedSaveInFlightRef`) so the realtime guard now covers both windows.
- **Resurrection bug (confirmed, fixed):** detaching a shared novel didn't cancel its pending 900ms debounced save, so an edit made just before detaching could silently resurrect the novel ~1s later. Added `cancel(key)` to `debounce.js`'s keyed debouncer, called on detach, plus a `detachedSharedIdsRef` guard against an already-in-flight save's response re-adding the row.
- **Defense-in-depth (plausible, fixed):** `MediaCarousel`'s `addFiles`/`addUrl`/`removeImage` had no internal `readOnly` guard (relied entirely on the calling JSX hiding the trigger buttons), unlike every sibling component. Added explicit early returns.
- **Minor UX (plausible, fixed):** dragging a shared novel to a sidebar position within the private section silently snapped it to the front of the shared group regardless of actual drop position. Now a no-op instead of a misleading snap.
- **Performance:** `list_author_hub_shared_novels()` ran a correlated `count(*)` subquery per returned row (N+1) - rewrote with a pre-aggregated `left join` (migration `20260702040000`); verified the share popover still shows the correct collaborator count afterward. `migrateEmbeddedImagesToStorage` unconditionally built a `Promise.all` per character/event on every document load even when nothing needed migrating (the overwhelmingly common case) - added a cheap `JSON.stringify(...).includes('"data:image/')` pre-scan to skip that work entirely when there's nothing to do.
- **Cleanup:** extracted the Escape/outside-click popover-dismiss logic (duplicated near-verbatim between `PublishLinkPill` and `NovelShareControl`) into a shared `src/lib/usePopoverDismiss.js` hook - verified Escape still closes the share popover. Removed the unused `canEditSharedNovel` export from `shareAdapter.js` (checked first: it would have been unsafe to wire in as suggested, since it returns `false` for private novels too, not just viewer-role shared ones - would have made every private novel read-only). Removed one dead CSS selector (`.shared-view-ribbon span`, no matching JSX). Documented (didn't relocate - would break the cascade) why `.novel-hero`'s 1180px override has to stay in `authorhub-state-corrections.css` instead of joining the existing 1180px block in `responsive-stability.css`: equal-specificity `!important` rules resolve by load order, and this file loads before `material-system.css`, so a same-specificity override placed here would lose that tie.
- **Verification:** `npm run build`, `npm run verify:markdown`, `npm run verify:share`, `git diff --check` all clean; spot-checked live (novel section renders, share popover opens/closes/shows correct collaborator count, Escape-to-close works, app boots without errors) via the preview dev server. Still nothing committed or deployed.

### 2026-06-30 — player performance + responsive timeline final polish
- **Target branch:** final work for this pass lives on `perf/faster-first-load`, after bringing in current `master` and the `responsive/mobile-fit` QA fixes.
- **Music player:** collapsed default is restored to the compact old pill; full player content remains mounted and is hidden by CSS while collapsed, reducing expand/collapse jank without changing tracks, local `/music/*.mp3` sources, controls, drag position, or playback fallback.
- **Dark timeline:** the dark timeline keeps its deep green companion palette, but the `.event-editor` wrapper no longer paints a square background/shadow. `.event-editor-main` remains the visible rounded editor surface, and paper texture pseudo-elements inherit card radius.
- **Responsive preservation:** mobile nav stays single-line horizontal scroll; phone timeline uses the compact switcher; desktop content is constrained to the viewport edge; card hover keeps micro-lift + border reveal without fractional scale blur.
- **Verification expectation:** build, markdown export verification, diff check, and browser QA across desktop/wide/mobile plus light/dark mode are required before committing this pass.

### 2026-06-29 — DNS routing + Supabase session consistency
- **Current DNS authority:** `authorhub.cn` is still managed through Alibaba Cloud DNS (`dns7.hichina.com` / `dns8.hichina.com`). Cloudflare records/nameservers are only a prepared alternative until the registrar nameservers are changed to Cloudflare; do not assume Cloudflare is serving live DNS.
- **Stable production target:** keep the active apex target on Vercel's current `A authorhub.cn 216.198.79.1` path unless Vercel's own dashboard changes the required record. Do not restore the old Aliyun CDN/DCDN `authorhub.cn.w.kunlunaq.com` path; earlier 504s came from that edge/origin chain before requests reached Vercel.
- **China 504 diagnosis:** if China-only users see `504 Gateway Time-out`, first check for leftover line-based DNS records or CDN bindings that route `@` through Aliyun/Tengine/kunlun instead of Vercel. If response headers show `Server: Vercel`, the request has reached the app; if they show Tengine/kunlun, the failure is outside AuthorHub code.
- **Cloudflare migration rule:** if moving to Cloudflare later, change registrar nameservers fully to Cloudflare and start with DNS-only records (`@ -> 216.198.79.1`, `www -> Vercel CNAME`) before considering orange-cloud proxy. Never run mixed authority/partial DNS during content debugging.
- **Supabase session source of truth:** in hosted production, only a real Supabase session may enter the workspace. The old `author-hub-local-auth-user` mirror is local-demo-only and must not be used as a production fallback, because different Chrome profiles can then show different local caches for the same visible email.
- **First-load save guard:** after loading a document from Supabase/local cache, skip the immediate automatic save once. This prevents a temporary cloud-read failure from causing one browser's local fallback cache to overwrite the cloud document before the user makes a deliberate edit.
- **Verified production behavior:** after clearing stale local auth keys, refresh with a valid Supabase token keeps the user signed in and loads the 4-novel cloud document; no `author-hub-local-auth-user` key is regenerated by current production code.

### 2026-06-28 — domain health + music stability
- **Domain diagnosis (superseded by 2026-06-29 entry):** this pass found the apex going through `authorhub.cn.w.kunlunaq.com` / Aliyun CDN and producing 504s before reaching Vercel. The active rule is now the newer Aliyun DNS direct-to-Vercel record in the 2026-06-29 entry, not this older CDN path.
- **Music player stability:** the floating music player must not depend on live `archive.org` redirecting media URLs. The five public-domain jazz tracks are mirrored under `public/music/`, and `FloatingMusicPlayer` should load `/music/*.mp3` so playback comes from the same deployed site and can be cached by Vercel Edge.
- **Vercel cache rule:** `/music/(.*)` uses long immutable cache headers, matching the existing static asset strategy. Player UI, titles, controls, and styling remain unchanged.

### 2026-06-23 — refresh persistence + landing pacing
- **Landing book pace:** the automatic open/close flip cycle was slowed from 5.2s + 5.2s to 6.5s + 6.5s. The existing 3D book design, drag logic, page texture, quote orbit, and typography remain unchanged.
- **Refresh auth persistence:** refresh must not send a signed-in writer back to the login wall. Supabase sessions still take priority; if the hosted session is briefly absent, AuthorHub now falls back to the local/session auth mirror and immediately reloads the cached manuscript universe and appearance settings.
- **Remember-account rule:** checked "30 天内免登录" stores a 30-day local auth mirror; unchecked login stores only a session auth mirror. Explicit logout clears both mirrors so logout still means logout.
- **Audit boundary:** repository cleanup must be reported before editing. CSS consolidation, dead-rule removal, export polish, and docs cleanup should be staged and verified visually because the current cascade has load-bearing layers.

### 2026-06-23 — low-risk cleanup A + CSS convergence B
- **Markdown export:** export behavior now lives in `src/lib/markdownExport.js` and is covered by `npm run verify:markdown`. Character labels must use `role` first, then `tag/faction`; relationship endpoints must tolerate D3 object endpoints and never export `[object Object]` or `undefined`.
- **Auth and AI handoff:** "忘记密码" must either send a Supabase reset email or clearly explain local-demo limitations. Timeline AI buttons must all copy the structured prompt before opening ChatGPT, DeepSeek, or Claude; opening should still proceed if clipboard permission fails.
- **Environment docs:** `.env.example` must include `CAPTCHA_SECRET`, because captcha APIs fail closed without it.
- **Dead loader CSS:** old `.loading-orbit` / `.auth-loading-orbit` CSS is removed. The active privacy-space loader is `.privacy-loader`; do not reintroduce old loader selectors.
- **CSS convergence:** import-only shell CSS was removed (`landing-frame-fix.css`), `user-center-refine.css` is imported explicitly, and exact duplicate rules were pruned only where a clearer region owner already exists. Further CSS cleanup should continue in small batches with build + browser smoke tests.
- **CSS convergence round 2:** removed stale CSS references for old/non-rendered class names such as `.relationship-star-chart`, `.shimo-strip`, `.field-disclaimer`, `.user-center-grid`, `.universe-grid`, `.book-progress-list`, `.account-form`, `.account-actions`, `.compliance-note`, `.timeline-hint`, and `.ai-handoff-card`. Current visible owners remain `.graph-card.relation-graph`, `.relation-svg`, `.user-center-page-grid`, `.story-grid`, `.profile-panel`, `.appearance-panel`, `.graph-hint`, and the active component classes.
- **CSS convergence round 3:** removed old AI result/sidebar sound/event-detail styles: `.ai-output`, `.semantic-output`, `.ai-context-card`, `.sidebar-action-grid`, `.cafe-sound-widget`, `.vinyl-player`, `.wave-bars`, `.event-detail-grid`, `.book-progress-card`, `.media-slide`, and standalone `.account-panel`. Current music player classes remain `.floating-music`, `.vinyl-button`, `.track-window`, `.player-controls`, and `.music-collapse`; current timeline editor classes remain `.event-editor-main`, `.event-core-grid`, `.ai-nudge`, and `MediaCarousel`'s `.imessage-*` stack.

### 2026-06-23 — repo re-read after user-side updates
- **Repo state:** local `master` is clean and aligned with `origin/master` at `e13086e feat(landing): auto-flip resumes after the reader stops playing`; GitHub remote remains `https://github.com/bhsversion7-byte/Authorhub.git`.
- **Public positioning:** README now presents AuthorHub as a privacy-first, feminist creative command center / "a room of one's own for storytellers", with bilingual EN + 简体中文 copy and live `authorhub.cn` link. Public setup/deploy internals were intentionally removed.
- **Landing baseline:** landing still preserves the cinematic quote orbit, procedural 3D book, 香萃刻宋 + 油印体 direction, and `开始落墨`. Current book behavior: auto-flip plays gently, click/grab freezes at the current page, drag controls page progress by pointer delta, and auto-flip resumes after a short pause from the page where the reader stopped.
- **Performance baseline:** `@react-three/drei` was removed; 3D book uses `@react-three/fiber` + `three` directly. Landing fonts were subset and `bookinside` texture was re-encoded to JPEG, reducing public assets substantially while preserving the designed look.
- **Settings/data baseline:** appearance preferences now have a local `author-hub-appearance` key so font size/family persist across refresh even before debounced cloud save flushes. Cloud saves remain local-first and are debounced/flushed on visibility/unload/logout.
- **Docs/assets baseline:** README screenshots are now real JPEG captures at `docs/screenshots/landing.jpg` and `docs/screenshots/workspace.jpg`; screenshot placeholders and stale screenshot README were removed.
- **Cleanup baseline:** unused exports/deps and stale plan docs were removed; previous audit found no TODO/FIXME, no commented-out code, and no broken asset URLs. The intentional CSS cascade / `!important` layers remain load-bearing and should not be flattened casually.

### 2026-06-23 — code-review remediation + dead-CSS cleanup
- **Captcha hardening:** `/api/captcha` and `/api/verify-captcha` now require a private `CAPTCHA_SECRET` env var and fail closed if it is missing (no more fallback to the public Supabase URL). Real signups require server-verified captcha; the instant local fallback is kept only for offline/local demo mode so the register form is never blank.
- **Cloud-save debounce:** local-storage writes stay immediate (offline safety unchanged); only the Supabase cloud upsert is debounced ~1s and flushed on logout / tab-hide / unload. No observable behavior change.
- **Schema template:** `supabase.schema.sql` aligned with the canonical migration (pgcrypto, `profiles.updated_at`, the `unique(user_id,title)` constraint, `set_updated_at()` + triggers). Template only.
- **Dead-CSS removal (~620 lines):** removed 108 CSS rules whose selectors referenced only classes no component renders anymore (leftovers from removed features: AI handoff panel, universe overview, old landing book / manuscript UI, old theme picker, old sidebar/tour/music layouts, old loaders, shimo strip). Proven inert: every removed selector matched **zero** elements across landing, auth, register, author, novel, and user views. Deletion-only diff; build green; brace balance intact.
- **NOT touched:** the `!important` cascade layering was deliberately left alone (analysis showed it is intentional, load-bearing, not redundant); CSS consolidation beyond dead-code removal was judged high-risk / low-reward.
- **Docs:** README rewritten as bilingual (English + 简体中文) with live links and current feature set.

### 2026-06-23 — final deployment cleanup + confirmed-dead docs
- **Confirmed-dead definition:** files are safe to delete only when they are not imported, linked, referenced by README/PRODUCT/preference, or used by current website settings/runtime. Public screenshots and `preference.md` stay because they are active documentation.
- **Confirmed-dead docs:** removed the duplicated `docs/authorhub-design-preferences.md`; `preference.md` is the single active design/behavior备案 file.
- **Dead selector cleanup:** removed leftover zero-reference selectors for old tour arrows, fallback manuscript animation, stale loading spinner, and old theme tag dark-mode styling. Current guided tour, privacy loader, tag chips, and landing motion remain unchanged.
- **Large media cache fallback:** local cache writes may compact only inline `data:image/...` media after quota failure; cloud save still keeps complete media data. This preserves refresh resilience without changing visible UI or deleting user text/settings.
- **Verification expectation:** after this cleanup, run markdown export verification, production build, browser smoke, Git commit/push, Vercel production deploy, and a real signed-in account pass before calling the work complete.

### 2026-06-23 — production user pass + targeted UI fixes
- **Production account pass:** real sign-in on `authorhub.cn` succeeded, then refresh kept the user inside the workspace with account content, sidebar manuscript list, author settings, and music player present. This confirms refresh must preserve account state and appearance settings.
- **Deployment commits:** `4f993b2` cleanup/persistence, `916d9ad` local-cache compaction, and `0340aa0` media/publish controls were pushed to GitHub and deployed to Vercel production. Latest production alias is `https://authorhub.cn`.
- **Publish link pill:** the Novel Section publish-link circle must look identical before and after URL insertion. Do not reintroduce `.publish-pill.is-configured` visual styling; URL presence is functional metadata only.
- **Media carousel:** `MediaCarousel` uses a real button plus a hidden file input ref for "添加图片"; do not return to a transparent input stretched over the label, because it can interfere with drag/preview layers and file-chooser state. Image nav buttons are 34px with 14px chevrons; final placement is left 4px / right 4px so the arrows do not crowd the image center.
- **Sidebar collapse handle:** hover/focus must keep `transform: translateY(-50%)` so earlier CSS layers cannot move the chevron and create a double-position/flicker effect.
- **Confirmed-dead asset:** `public/texture-1.png` had zero references and was removed with the UI fix commit. Do not restore it unless a future runtime reference is added.
- **UX score after pass:** 8.6/10 as a real user. The workspace feels coherent, warm, and feature-complete; dark mode is usable and aligned enough for production. Remaining future work should focus on CSS ownership convergence and reducing cascade overlap, not visual redesign.

### 2026-06-23 — CSS ownership convergence round 1
- **Boundary:** this round only migrates confirmed final rules back toward their owning areas. It must not alter feature layout, colors, fonts, hover motion, dark mode logic, or functional regions.
- **Owners:** publish-link pill lives in `novel-section-restore.css`; media upload and carousel arrows live in `styles.css` near `MediaCarousel` base rules; sidebar collapse handle lives in `sidebar-stability.css`.
- **Removed overlap:** delete repeated repair-layer definitions for `.publish-pill`, `.stack-nav`, `.media-upload-button`, and `.sidebar-collapse-toggle` once their final values are present in the owner file. Keep dark-mode-only companion rules where they are still theme-specific.
- **Verification:** every convergence round needs `npm run build`, `npm run verify:markdown`, `git diff --check`, and a short diff review before commit/deploy.

### 2026-06-23 — README refresh + audit cleanup
- **README:** reframed around the feminist identity (the landing's drifting quotes are all from women writers — Woolf, the Brontes, Austen, Morrison, Le Guin, Adichie, ...; "a room of one's own for storytellers"). Removed the unofficial Chinese name "落墨" and the Supabase/Vercel/CAPTCHA setup + deploy sections (kept privately, not in the public repo). Detailed EN + 简体中文.
- **Audit cleanup (all verified zero-usage, no behavior/visual change):** removed unused dependency `@react-three/drei` (3D book uses fiber+three directly; landing verified still rendering); removed dead exports `buildFullHubPrompt`/`buildEventPrompt` (aiHandoff.js) and `resetAuthorHubData`/`shimoConnection` (shimoAdapter.js); deleted 3 stale `docs/superpowers/plans/*.md` files.
- **Audit found clean:** no debug logs (only legitimate error/warn handlers), no TODO/FIXME, no commented-out code, no syntax issues, all url() assets resolve, all other deps/components/CSS in use. The feminist landing, drag-reorder, hidden scrollbar, and !important cascade were deliberately left untouched.
- **GitHub repo About panel** (description/topics/website) still set manually by the user (gh CLI not installed); homepage = https://authorhub.cn.

### 2026-06-23 — blank-page (stale chunk) auto-recovery
- **Diagnosis:** `authorhub.cn` intermittently showed a blank paper background (React never mounted, empty `#root`, no error screen) while `author-hub-public.vercel.app` was fine — both serve byte-identical assets. Cause: after several rapid deploys, a browser holding a cached `index.html` requested a lazy chunk hash the new build had replaced; the catch-all SPA rewrite (`/(.*)` → `/index.html`) returned `index.html` (HTML, 200) instead of the JS, so the dynamic import failed and the page stayed blank. It self-recovers on a normal reload because `index.html` is `max-age=0, must-revalidate`.
- **Fix (additive, no visual/behavior change):** `main.jsx` listens for `vite:preloadError` and reloads once (sessionStorage-guarded against loops) to fetch the fresh build; `ErrorBoundary` also reloads if a chunk-load error reaches it; `vercel.json` now serves `/assets/*` with `immutable` caching AND the SPA rewrite excludes `/assets/` (`"/((?!assets/).*)"`) so a missing chunk returns a clean 404 instead of HTML. Verified on preview: root still renders the app; missing `/assets/*` → 404 (not HTML). The blank can no longer persist across a deploy.
- **Note:** an already-stuck tab still needs one hard refresh (Ctrl+Shift+R); the fix prevents recurrence for everyone after this deploy.
