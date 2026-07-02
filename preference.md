# AuthorHub Preference Record

This is the short source of truth for future agents working on AuthorHub. Keep it current, concise, and behavior-focused. Do not use this file as a full changelog.

## Current Boundary

- Repository: `C:\Users\bihui\Documents\Hackson\author-hub-public`
- GitHub: `https://github.com/bhsversion7-byte/Authorhub`
- Production domain: `https://authorhub.cn`
- DNS authority: Alibaba Cloud DNS. The stable production target is Vercel. Do not switch DNS/CDN/WAF routing without explicit user approval.
- Supabase and Vercel are connected. Do not create keys, send emails, change dashboard settings, commit, push, or deploy unless the user explicitly asks.
- Uncommitted work in an ephemeral git worktree can be silently deleted between turns (this has happened). Commit real fixes promptly instead of leaving them uncommitted across multiple turns; Supabase migrations applied via the MCP tool persist independently of git and survive a lost worktree, but application code does not.

## Product Identity

- AuthorHub is a private manuscript atlas for writers, not a marketing site.
- The logged-in workspace is the product: sidebar, author dashboard, user center, novel pages, relation graph, timeline, media references, sharing, and floating music player.
- Tone: privacy-first, warm paper, jazz cafe, feminist creative command center, "a room of one's own for storytellers."
- Preserve the existing domain-specific writing workflow. Do not redesign into a generic SaaS dashboard.

## Visual System

- Global surface: clear paper texture, never flat solid color.
- Mood: editorial, tactile, low-saturation Morandi palette, warm cafe light.
- Avoid cold metallic surfaces, neon glow, generic AI gradients, and square form language.
- Cards need subtle depth and separation. Hover is micro-lift/border reveal, not glow or bright color shift.
- Full-card hover must not use fractional scale; it makes text blurry on Windows Chrome.
- Landing must preserve the cinematic 3D book, drifting quotes, `开始落墨`, 香萃刻宋, and 油印体.
- The landing book is procedural code. Do not reintroduce old `bookcover.png`.

## Surface Colors

- Novel header card: Morandi yellow `#F3E5AB`.
- Outline: light grey rice-paper.
- Setting: matte blue-stone grey.
- Theme tags: soft lilac/purple card surface. Tag chip/pill text color is a **fixed** grey-green `#8BA09C` (`.tag-list span` / `.editable-tags button`) - explicitly not tinted per-novel. An earlier pass tried the opposite (tinting it with `color-mix(var(--novel-color), var(--ink))` to match the AO3 pill/timeline glow) and the user reverted that decision (2026-07-03): tags should look the same regardless of which novel you're viewing.
- Relation graph: muted green-grey star-map with dotted grid.
- Character detail: warm beige paper.
- Timeline: light green in light mode, deep green companion in dark mode.
- Destructive actions: muted rose/red danger-lite palette.
- Primary manuscript actions: dark coffee/ink button with white text.
- Dark mode should echo the light surfaces instead of becoming pure black.

## Core UX Rules

- Sidebar desktop: no visible `::`/grip drag symbol. Fine-pointer desktop can drag the whole novel row.
- Sidebar touch/coarse pointer: novel sort uses an explicit drag handle to avoid accidental reorder while horizontally scrolling.
- Mobile navigation: one-line horizontal scroll; novel items and `添加新小说` must not overlap or stack.
- Timeline: manual order is authoritative. New time points append and are not auto-sorted by date. Selected event identity should stay on the same event after reorder.
- Phone timeline uses the compact previous/current/next switcher, not oversized timeline cards.
- Relation graph: supports many characters, draggable nodes, focus/reset, relationship labels, graph/detail split, and detail editor.
- Main-character relationship lines use `#C95F5A`. Tags `主角`, `主角1`, `主角2`, `主角34`, etc. count as main characters; `主角攻/主角受` remain compatible.
- Every other relationship line, and the timeline event card halo/orb (`--node-color`), use a **fixed** `#8BA09C` grey-green - not `novel.color`. Same reversal as the theme-tag rule above: these should look the same across every novel, only the main-pair red is meaningful. The AO3 pill and sidebar novel bookmark are the exception and stay tied to `novel.color` (that pairing is intentional - see below).
- Relation graph node halo (`.planet-halo`): non-main characters use fixed `#8BA09C` at low opacity (same reasoning as above). Main-tagged characters get a two-tone halo the user considers a locked, loved design: light-yellow outer ring (`stroke: rgba(242,217,138,0.85)`) and light-red inner glow (`fill: rgba(230,140,130,0.42)`), deliberately distinct from any planet color so it never blends into the node's own color. Size/opacity numbers (`radius+21`, `stroke-width 8`, `opacity 0.52`) are unchanged - only change the hues, never the size or shape, if this needs revisiting.
- Relation graph layout: the supporting (non-main) character ring radius scales with how many supporting characters there are (`supportRingRadius`, 150-420px) instead of a fixed 270px every character had to compete for - past ~5 characters the fixed radius caused visible crowding. Initial placement uses true even angular spacing around that ring (not an arbitrary cos/sin pattern) so the layout starts organized before physics even runs.
- Relationship lines must keep the same color, opacity, and width before and after selection or hover - no dimming/re-coloring/resizing of other lines when one is selected. The only line-color distinction in the graph is the fixed main-pair red; everything else stays visually identical regardless of selection state. (Node dimming on focus is unaffected by this rule - only lines.)
- Relation graph node label inside the circle shows only the character's first character (`name.slice(0, 1)`), e.g. "齐百草" → "齐". The full name still appears below the node.
- Outline (大纲) and Setting (设定集) cards use `FocusTextarea` (same 放大/退出/保存 expand-to-modal pattern as character background/hidden fields and timeline event detail fields) instead of a plain resizable `<textarea>`. The compact in-card textarea has `resize: none` - the native resize handle's height was never persisted anywhere and silently reverted on every refresh; the expand button is the one supported way to get more editing room now.
- Relation graph default layout centers the main character(s) (`主角`/`主角1`/etc. tag) at the middle of the canvas; other characters distribute around them. Users can drag any node anywhere and that arrangement persists across normal interactions (adding a character, selecting a node/relationship) - node positions are remembered across simulation rebuilds specifically so clicking around the graph doesn't visibly reshuffle it. Only `重置视图` clears the remembered positions and re-centers the main character(s).
- Character "星球颜色" (planet color) picker has 20 swatches, ordered cool-tone first then warm-tone, including one grey. Pure visual/ordering preference - do not change the count, order, or values without being asked again.
- Sidebar novel bookmark color (`DraggableNovelList`'s `--item-color`) must come from that novel's own persisted `novel.color`, never from its position in the list. Deriving it from array index reassigns every novel's bookmark tint whenever any novel is reordered/added/deleted, which never matches that novel's own AO3-pill/timeline-glow color (both already keyed on the same `novel.color`) and reads as "colors changing at random."
- Novel-meta chrome inputs (预计总字数/当前字数/类型/完结时间) are intentionally fixed at 12px/700 weight, both at rest and while focused, regardless of the reading font-size setting. `novel-page-refine.css`'s base+`:focus` rule for these inputs must declare 12px/700 - a `:focus`-qualified selector has higher specificity than a plain one even with identical class/tag parts, so if this file ever declares a different value here it will silently win only during focus and the field will visibly grow the moment it's clicked (this happened once already - was 13px/760). On mobile, any input under ~16px also triggers the browser's native auto-zoom-on-focus; `index.html`'s viewport meta carries `maximum-scale=1.0` to suppress that separately.
- Image uploads (`MediaCarousel`) are capped at 2MB per file (`MAX_IMAGE_BYTES`; was 5MB, lowered 2026-07-03). The size hint lives inside the image frame's own empty-state text ("添加 2 张或更多图片后，可滑动查看。单张图片最大 2MB。", the second sentence smaller/lighter), not as a separate line outside the frame. A rejected oversized file shows a filled, clearly visible pill-style message (`.media-error`), not a barely-there grey line - so it doesn't read as "the upload button is broken" when the real cause is a file being over the limit. The "添加图片" button/upload pipeline itself was re-verified working end-to-end (real Storage upload round trip) when this was investigated.
- Floating music player: compact collapsed state, local `/music/*.mp3` sources, smooth expand/collapse, no heavy blur/shadow animation during transition, drag positioning preserved.
- Collapsed music player must keep the arrow fully inside the clickable container.
- Floating music player's current visual/interaction design is confirmed perfect by the user (2026-07-03) - do not change it at any time, in any pass, for any reason (including CSS cleanup). Functional bug fixes that leave the visible design pixel-identical are the only exception.
- Focus editors and modals must be readable in light/dark mode and must cleanly close on Escape/outside click.
- Delete-novel confirm modal: both the private-novel and shared-novel branches use "Remove ..." framing (EN eyebrow `Remove novel` / `Remove shared novel`; CN title `是否从手稿列表中移除该...小说？`), so the two read as one consistent action family. The body copy still carries the real severity difference: the private branch explicitly says the wipe is permanent and unrecoverable ("移除后将永久清空...且无法恢复"), the shared branch explicitly says only your list entry is removed and the cloud workspace/collaborators are unaffected. Do not soften the private branch's body copy - only the eyebrow/title wording is unified.

## Data And Auth Rules

- User data is private. Supabase session is the production source of truth.
- Local fallback/local auth is for local demo only. Do not let hosted production enter the workspace without a real Supabase session.
- Local cache writes stay immediate for crash/offline safety. Supabase cloud upserts can be debounced and must flush on logout, tab hide, and unload.
- First-load save guard: after loading from cloud/local cache, skip the immediate automatic save once so a temporary cloud-read failure cannot overwrite cloud data with stale local fallback.
- A cloud *load* failure blocks further cloud *saves* for the rest of the session (`cloudSaveBlockedUserIds` in `shimoAdapter.js`) so stale local fallback data can't overwrite a newer cloud document - but that block must self-heal, not sit silent forever. `retryCloudSync(user)` re-probes connectivity (background retry on `online` event + a periodic interval while blocked, plus a manual "重试同步" banner button in `App.jsx`), and the moment it recovers, the current in-memory document is force-pushed to Supabase immediately so nothing edited while blocked is lost. Every edit after a load failure (novel reorder, character save, anything) is real user intent, not stale fallback data, and must eventually reach Supabase - it must never be silently dropped on refresh with only a console warning.
- Inline `data:image/...` media may be compacted locally only after quota failure; cloud save keeps complete media where possible.
- Public media bucket may serve known public URLs, but do not allow broad object listing/enumeration.
- **Deletion must always sync to Supabase, all the way down - this is a standing rule, not a one-off fix.** Removing a character, a timeline event, a whole novel, or "清空数据" must not just drop it from the `author_hub_documents` JSON document - every image that content had uploaded to the `author-hub-media` Storage bucket must also be deleted (`deleteImageFromStorage`), or it becomes permanently orphaned garbage the user can never see or reclaim again. `MediaCarousel`'s own `removeImage()` already does this correctly for one image at a time while editing; every *bulk* delete path needs its own explicit cleanup call because it bypasses that per-image flow entirely - `App.jsx`'s `deleteImagesFor()`/`deleteImagesForNovel()` helpers exist specifically for this and are wired into `deleteCharacter`, `deleteEvent`, private-novel delete, and `clearAllUserData`. Detaching a *shared* novel from your list is the one legitimate exception (it's not a real delete - the cloud copy and other collaborators' content must stay untouched). Account deletion (`delete_author_hub_account` RPC) already does its own server-side bulk Storage cleanup by owner, so no client-side loop is needed there. Whenever a new bulk-delete surface is added anywhere in this app, check whether it can leave orphaned Storage objects and wire in the same cleanup.

## Sharing And Collaboration

- Share control lives near the publish pill in Novel Section.
- Share modes:
  - `共同编辑`: login required, joins the shared source workspace.
  - `只读查看`: public-by-token, read-only, server-filtered.
- Share popover actions are three buttons: `生成链接` | `撤回` | `复制`.
- A new share link is only ever created by the explicit `生成链接` click (`onCreateShareLink` → `createShareLink`/`ensure_author_hub_shared_novel`). Opening the popover or switching between `共同编辑`/`只读查看` tabs must never silently mint a new link - it may only look up whether one already exists (`onGetActiveShareLink` → `getActiveShareLink`, a read-only `select`) so a novel that was already shared shows its existing link immediately instead of forcing the user to click generate again.
- The generated link is fixed and reused across popover reopens and page refreshes for a given role - it does not change on its own. The only action that changes or ends it is `撤回` (revoke), which must delete the corresponding Supabase rows immediately (see `revoke_author_hub_share_role` below), not just clear local UI state.
- Generated share URLs should use canonical `https://www.authorhub.cn` in production. Localhost/127.0.0.1 keep local origins for QA. `VITE_PUBLIC_SITE_URL` may override this.
- `撤回` uses the same muted rose/red danger-lite language as destructive actions such as 删除人物.
- Viewer section selection supports: `大纲`, `设定集`, `主题标签`, `星图`, `人物详情`, `时间线`.
- Default viewer sections: `大纲`, `设定集`, `主题标签`.
- Server-side public filtering is required. Never rely on URL query parameters or client-only hiding.
- Public viewer links must not expose `secret`, `hidden`, or `privateNote`.
- Graph-only share includes graph-safe character fields only; character details require the `人物详情` section.
- Public `/share/:token` route must stay isolated from private workspace load/save/flush. It may poll for saved-version updates, but only refresh state when `updatedAt` changes.
- Regenerating a link should create the new active token and retire old same-role tokens without leaving a zero-link gap on mid-operation failure.
- Explicit revoke uses RPC `revoke_author_hub_share_role(shared_novel_id, role)`.
- Revoking viewer role deletes viewer links. Revoking editor role deletes editor links and removes non-owner editor memberships for that shared novel.
- Removing a shared novel from your own manuscript list (the "确定移除" delete-confirm path, distinct from `撤回`/revoke above) must call `shareAdapter.leaveSharedNovel(sharedNovelId)` → RPC `leave_author_hub_shared_novel`, which deletes the caller's own `author_hub_share_members` row (and the orphaned `author_hub_shared_novels` row too if that was the last member). Only updating local React state here is the exact bug class that made a "removed" shared novel come back after refresh - always pair the optimistic local removal with the server call, and roll the local state back with an error toast if the RPC fails.
- Novel-share popover visual design (`NovelShareControl`/`sharing-collab.css`) is confirmed perfect by the user (2026-07-02, reconfirmed 2026-07-03) - do not change it at any time, in any pass, for any reason. Functional changes (new RPCs, new buttons wired to existing layout slots) are fine as long as the visible design stays pixel-identical; the layout/visual language itself is locked.
- Realtime collaboration is saved-version sync only, not cursor/keystroke co-editing.
- Incoming realtime updates must not clobber a local edit with a pending or in-flight shared save.
- Shared saves must flush on logout, tab hide, unload, and unmount.

## Supabase Schema Notes

- Core private data: `profiles`, `author_hub_documents`.
- Sharing data: `author_hub_shared_novels`, `author_hub_share_members`, `author_hub_share_links`.
- RLS is required on all user/share tables.
- Security-definer RPCs must pin `set search_path = public`.
- Anonymous RPC execution should be limited to public read-only share lookup. Collaboration, save, list, and revoke RPCs require `authenticated`.
- Important RPCs include:
  - `ensure_author_hub_shared_novel`
  - `list_author_hub_shared_novels`
  - `join_author_hub_shared_novel`
  - `save_author_hub_shared_novel`
  - `get_author_hub_shared_novel_by_token`
  - `revoke_author_hub_share_role`
  - `leave_author_hub_shared_novel`
  - `delete_author_hub_account`
- New RPCs get an implicit anon EXECUTE grant from a schema-level default privilege; `revoke all ... from public` alone does not remove it. Always follow up with an explicit `revoke execute ... from anon, authenticated, public` + `grant execute ... to authenticated` pass (see `20260702114702_author_hub_revoke_anon_rpc_grants.sql` and `20260702140336_author_hub_leave_shared_novel_anon_grant_fix.sql`), and re-run the security advisor after any new `apply_migration` call.
- Local migration filenames must match the version the Supabase MCP `apply_migration` tool actually assigns (check `list_migrations` right after applying) - it ignores whatever timestamp prefix you put in the `name`/local filename, so a filename chosen ahead of time will not match the live version.
- Dashboard-only remaining security setting: enable Supabase Auth leaked-password protection when the user is ready.

## Email And Security Ops

- User update emails should be one-off local/scripted operations, not an AuthorHub UI feature.
- Resend free tier is small but usable via daily batches. The reusable email script supports resume state and daily limits; paid senders are optional, not required.
- Send one email per recipient, not BCC. Test with internal emails first, then a small batch, then full send.
- API keys and service role keys stay local in `.env` and must never be committed.
- For attack mitigation, first use Vercel Firewall/Attack Mode/rate rules. Do not change Alibaba DNS or introduce Cloudflare/Aliyun WAF unless explicitly requested.

## Performance Rules

- Avoid whole-document cloud writes on every keystroke; debounce cloud, flush deliberately.
- Avoid storing large base64 images in the main document when Supabase Storage is available.
- Supabase `author_hub_documents` is intentionally JSONB-centered for flexible fiction data, but large JSONB values live in TOAST. Optimize by preventing embedded base64 media, skipping duplicate upserts, and avoiding repeated profile writes.
- Do not animate heavy blur/shadow in frequently toggled UI.
- CSS is currently large and layered; cleanup must be incremental and visually verified. Do not flatten `!important` layers casually.
- The large Three.js landing chunk is intentional for the cinematic book; optimize only with proof, not guesswork.

## Verification Checklist

Run before any commit/deploy unless the user explicitly narrows the task:

- `npm run build`
- `npm run verify:markdown`
- `npm run verify:share`
- `npm run verify:graph`
- `git diff --check`
- `npm audit --omit=dev` when dependencies or security posture matter

Browser QA targets:

- Desktop 1365/1280: novel header fields do not overlap AO3/share controls; desktop sidebar shows no grip handle.
- Mobile 390/430: no horizontal page overflow; top nav scrolls horizontally without accidental reorder.
- iPad/tablet: novel header, share popover, graph, timeline, and music player remain inside viewport.
- Share popover: generate/regenerate, revoke, copy, Escape close, outside click close.
- Public share page: clear paper background, one-line read-only ribbon, selected sections only, no private fields.
- Relation graph: main-main line is `#C95F5A`; 12+ characters remain usable.
- Timeline: drag card reorder must be manually verified in browser if automation cannot perform a trusted drag.
- Music player: collapsed arrow visible/clickable; expand/collapse smooth; drag position remains bounded.

## Current Local State Memo

- 2026-07-02 local refinement added sharing sections, read-only filtering, collaboration save guards, media storage migration, email script, security runbook, graph main-line rules, timeline Sortable support, mobile nav protections, and music-player tuning.
- User later added share revoke UI/RPC:
  - `NovelShareControl` has `生成链接/重新生成 | 撤回 | 复制`.
  - `shareAdapter.revokeShareRole()` calls `revoke_author_hub_share_role`.
  - `App.revokeNovelShareRole()` clears active shared rows and shows revoke notices.
  - Migration includes `20260702103302_author_hub_revoke_share_role.sql`.
- Recent local verification passed: build, graph/share/markdown checks, audit, and diff check except harmless CRLF warnings.
- Known tooling limitation: automated MCP browser tools could not perform a trusted Sortable drag. Manual browser drag remains the final check for timeline card sorting before commit/deploy.
- 2026-07-02/03: fixed the shared-novel "remove from list" persistence gap (added `leave_author_hub_shared_novel`, wired into `confirmDeleteNovel`, verified live end-to-end against production - deleted a real shared row, confirmed via SQL it stayed gone after refresh), the sidebar bookmark index-based color bug, the delete-novel modal copy consistency, and the mobile input auto-zoom (`maximum-scale=1.0`). Account deletion, share-revoke UI, and migration filename/version sync were already fixed by a separate concurrent session (PRs #3-#11) before this pass started; verified that work is solid rather than duplicating it. Committed directly to `master` and pushed per explicit user authorization ("do not let me pull the request again"); Vercel's GitHub integration auto-deployed to `authorhub.cn` - confirmed `READY`/aliased/no runtime errors via the Vercel API after push, no manual deploy trigger needed.
- 2026-07-03: fixed the actual root cause of "my changes don't survive a refresh, especially sidebar/navigator changes" - a single cloud *load* failure (real-world flaky network) permanently blocked all cloud *saves* for the rest of the browser session via `cloudSaveBlockedUserIds`, with only a `console.warn` and no visible indicator; every edit made afterward (novel reorder included) silently stayed local-only and was lost on the next refresh. Added `retryCloudSync`/`isCloudSaveBlocked` in `shimoAdapter.js` plus a `cloudSyncBlocked` state, background retry effect (network regain + 20s interval), and a visible `.cloud-sync-banner` with a manual "重试同步" button in `App.jsx`, so the block now self-heals and immediately re-pushes the current document instead of silently discarding work. Confirmed the share-link generation rule already matches the required contract (`生成链接` creates once; reopening/switching tabs only reads via `getActiveShareLink`, never creates; `撤回` is the only thing that changes/deletes a link, via `revoke_author_hub_share_role`) - documented explicitly above so a future pass doesn't regress it.
- 2026-07-03 (later): user reported the sidebar novel reorder still didn't survive a refresh even after the load-block fix above. Re-verified live end-to-end against production by invoking the real `onReorderNovel` callback directly (bypassing the untestable Sortable drag): the reorder correctly reached Supabase, and a full page reload reflected the new order. Could not reproduce the persistence bug on current code - most likely explanation is a stale browser tab still running the pre-fix JS bundle from before that deploy (SPAs don't auto-reload already-open tabs). Also this session: added a 20th (grey) planet color and reordered the palette cool-to-warm, fixed relation-graph node labels to show only the first character, fixed relationship lines changing color/width on selection (now constant except the fixed main-pair red), fixed the relation graph not keeping the main character centered by default/after `重置视图` (added position memory across simulation rebuilds + a stronger center-pull force for main-tagged characters, cleared only by 重置视图), confirmed the 5MB image upload cap was already correctly implemented and added a visible "单张图片最大 5MB" hint, and found+fixed the real cause of the novel-meta focus-grows-larger bug: `novel-page-refine.css` declared 13px/760 for both the base and `:focus` states of these inputs, which only visibly won during focus because the `:focus`-qualified selector out-specificities the plain 12px/700 override elsewhere - corrected the source values directly to 12px/700.
- 2026-07-03 (evening): reversed the theme-tag/relation-graph-line/timeline-halo per-novel-color decision from earlier this session - user wants all three fixed at `#8BA09C` regardless of novel, only the main-pair red line is meaningful (documented above, replaces the earlier "intentional, do not change" note which no longer applies). Added `FocusTextarea` (放大/退出/保存) to Outline and Setting, disabled the compact textarea's native resize now that the expand button is the supported way to get more room. Fixed the real `deleteCharacter`/`deleteEvent`/private-novel-delete/`清空数据` gap the user flagged: none of them ever cleaned up Supabase Storage objects for the images that content had uploaded, only the JSON document - added `deleteImagesFor`/`deleteImagesForNovel` helpers and wired them into all four bulk-delete paths (documented as a standing rule above, not a one-off fix). Moved the "单张图片最大 5MB" hint inside the image frame's own empty-state text and made the oversized-file rejection message a visible filled pill instead of a barely-there grey line, after the user reported the upload button "stopped working" - re-verified the actual upload pipeline (click-to-open, file-picker change handler, real Storage round trip) end-to-end and it was never broken; the perceived break was silent/invisible rejection feedback for files over 5MB.
- 2026-07-03 (night): lowered the image upload cap to 2MB (was 5MB). Redesigned the main-character relation-graph halo per explicit user request - the design/size stays exactly as before, only the hues changed: light-yellow outer ring + light-red inner glow, both deliberately distinct from any planet color (documented above). Ordinary-character halo also moved off `novel.color` onto the same fixed `#8BA09C` as the other reversed elements. Improved the relation-graph layout for >5 characters (user referenced Obsidian's graph view as the aesthetic target): the supporting-character ring radius now scales with how many supporting characters exist instead of a fixed 270px everyone competed for, and initial placement uses true even angular spacing instead of an arbitrary cos/sin pattern - both together produce a visibly more organized starting layout before physics even settles it. Ran a dedicated audit agent (read-only, no edits) over every delete/remove path, mediaStorage.js/shareAdapter.js/shimoAdapter.js/supabaseClient.js, the two captcha serverless functions, and a secrets/TODO sweep, per the user's "check Supabase settings and code for problems" request - came back clean, no new issues beyond what's already fixed this session (confirmed `delete_author_hub_account` already cleans up Storage server-side, captcha fails closed, no hardcoded secrets, no SQL/path injection surface).
