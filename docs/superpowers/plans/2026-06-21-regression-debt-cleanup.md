# Regression Fix and Debt Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix regressions caused by CSS/component drift and reduce the remaining bundle/font debt without changing AuthorHub feature zones.

**Architecture:** Fix root causes in component structure where the bug originates, then keep only small CSS rules that match the component class names. Split heavy UI surfaces with React.lazy so three.js/d3-heavy areas do not inflate the first auth/landing bundle.

**Tech Stack:** React 19, Vite 8, CSS modules by import order, Playwright smoke checks, Vercel production deployment.

---

### Task 1: Fix logo modal source mismatch

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/App.jsx`
- Modify: `src/material-system.css`

- [ ] Change portal classes from `logo-preview-modal/logo-preview-dialog` to the viewport-owned `logo-lightbox-overlay/lightbox-content` classes already defined in the final material layer.
- [ ] Update `ESCAPE_BLOCKING_SELECTOR` to match `.logo-lightbox-overlay`.
- [ ] Verify clicking the logo creates exactly one fixed, viewport-sized dialog under `document.body`.

### Task 2: Fix Novel meta layout at the source of cascade conflict

**Files:**
- Modify: `src/material-system.css`
- Modify: `src/novel-page-refine.css` only if needed after computed-style checks.

- [ ] Make `.novel-meta-field` labels plain transparent grid containers.
- [ ] Put all editable pill/highlight styling on `.novel-meta-field input` only.
- [ ] Keep visual ordering: top row `预计总字数 / 当前字数`; bottom row `类型 / 完结时间 / platform pill`.
- [ ] Move the whole cluster about 1% to the right and compact vertical label/input spacing.

### Task 3: Remove copyright disclaimer nodes

**Files:**
- Modify: `src/components/NovelSection.jsx`
- Modify: `src/components/RelationGraph.jsx`
- Modify: `src/components/TimelineFlow.jsx`

- [ ] Delete all `field-disclaimer` paragraphs containing copyright/legal reminders.
- [ ] Keep `.field-disclaimer` CSS for any non-legal helper text still used elsewhere.

### Task 4: Fix timeline event delete affordance

**Files:**
- Modify: `src/material-system.css`
- Modify: `src/TimelineFlow.jsx` only if markup is insufficient.

- [ ] Make `.timeline-node` positioned relative.
- [ ] Place `.timeline-node-delete` at the node top-right.
- [ ] Default it to transparent; show it only on node hover/focus-within.
- [ ] Keep it small and non-layout-affecting.

### Task 5: Restore landing and auth visual model while reducing JS debt

**Files:**
- Modify: `src/components/LandingGateway.jsx`
- Modify: `src/App.jsx`
- Modify: `src/material-system.css`
- Modify: `src/landing-font-local.css`
- Modify: `src/landing.css`

- [ ] Lazy-load `CinematicBookOpener` with `React.lazy` and `Suspense`, preserving the existing book stage.
- [ ] Lazy-load heavy post-auth pages from `App.jsx`: `AuthorDashboard`, `UserCenter`, `NovelSection`.
- [ ] Stop `material-system.css` from overriding auth mode into a plain brown background; inherit the landing-auth gradients.
- [ ] Correct `@font-face` URLs to the actual files in `public/fonts`.

### Task 6: Verify and deploy

**Files:**
- No source edits unless verification fails.

- [ ] Run `npm run build` and compare chunk output.
- [ ] Preview on a non-6173 port.
- [ ] Browser-check logo modal, Novel meta computed styles, no legal reminder text, timeline delete opacity/position, landing book DOM/canvas presence, auth background gradient.
- [ ] Commit, push, inspect Vercel deployment, and verify `https://authorhub.cn/`.
