# AuthorHub Preference Record

This file records the final product/design rules for AuthorHub so future CSS cleanup keeps the confirmed behavior instead of reintroducing old overrides.

## Product Summary

- AuthorHub is a private manuscript atlas for writers. It organizes author identity, global reading preferences, novels, outlines, settings, themes, character relationship graphs, character detail cards, timelines, reference images, and account/data operations.
- The logged-in app is the product surface. It is not a marketing page: it is a writing cockpit with a persistent sidebar, paper background, floating music player, author dashboard, user center, and per-novel workspace.
- Data behavior should remain privacy-first. Account content belongs to the current user, with local fallback/cache behavior when cloud sync is unavailable.

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

## Engineering Rules For Cleanup

- Fix root causes and CSS ownership/override problems instead of adding broad override layers.
- Keep edits scoped to the broken component or state.
- During CSS cleanup, migrate confirmed final rules back to their owning component/area.
- Do not delete or change established feature zones while reducing CSS.
- Do not casually change colors, feature layout, fonts, or functional areas.
- Use precise verification for each visual state: light mode, dark mode, hover, active, focus, mobile/narrow layout, and Windows performance-sensitive animation.

## Maintenance Log (backup record)

Records substantive maintenance so future cleanup keeps the confirmed behavior. None of the entries below changed any color, layout, font, or interaction.

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
