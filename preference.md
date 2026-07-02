# AuthorHub Preference Record

This is the short source of truth for future agents working on AuthorHub. Keep it current, concise, and behavior-focused. Do not use this file as a full changelog.

## Current Boundary

- Repository: `C:\Users\bihui\Documents\Hackson\author-hub-public`
- GitHub: `https://github.com/bhsversion7-byte/Authorhub`
- Production domain: `https://authorhub.cn`
- DNS authority: Alibaba Cloud DNS. The stable production target is Vercel. Do not switch DNS/CDN/WAF routing without explicit user approval.
- Supabase and Vercel are connected. Do not create keys, send emails, change dashboard settings, commit, push, or deploy unless the user explicitly asks.
- Current local sharing/collaboration changes are not automatically safe to commit as one batch. Stage only intentional files/hunks when the user later asks for commit/deploy.

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
- Theme tags: soft lilac/purple.
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
- Floating music player: compact collapsed state, local `/music/*.mp3` sources, smooth expand/collapse, no heavy blur/shadow animation during transition, drag positioning preserved.
- Collapsed music player must keep the arrow fully inside the clickable container.
- Focus editors and modals must be readable in light/dark mode and must cleanly close on Escape/outside click.

## Data And Auth Rules

- User data is private. Supabase session is the production source of truth.
- Local fallback/local auth is for local demo only. Do not let hosted production enter the workspace without a real Supabase session.
- Local cache writes stay immediate for crash/offline safety. Supabase cloud upserts can be debounced and must flush on logout, tab hide, and unload.
- First-load save guard: after loading from cloud/local cache, skip the immediate automatic save once so a temporary cloud-read failure cannot overwrite cloud data with stale local fallback.
- Inline `data:image/...` media may be compacted locally only after quota failure; cloud save keeps complete media where possible.
- Public media bucket may serve known public URLs, but do not allow broad object listing/enumeration.

## Sharing And Collaboration

- Share control lives near the publish pill in Novel Section.
- Share modes:
  - `共同编辑`: login required, joins the shared source workspace.
  - `只读查看`: public-by-token, read-only, server-filtered.
- Share popover actions are three buttons: `生成链接/重新生成` | `撤回` | `复制`.
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
