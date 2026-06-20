# CSS Cascade Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce AuthorHub CSS cascade risk and Windows flicker without changing product features or the current editorial paper design.

**Architecture:** Keep the component tree intact. Move high-risk visual rules into one final, explicit stability layer and remove redundant imported patch files only after the final layer owns their active responsibilities. Treat full-viewport blend/filter/fixed layers as the primary flicker risk.

**Tech Stack:** React, Vite, CSS cascade, Playwright/browser verification, Vercel static deployment.

---

### Task 1: Root-Cause Evidence

**Files:**
- Inspect: `src/main.jsx`
- Inspect: `src/styles.css`
- Inspect: `src/authorhub-craft-polish.css`
- Inspect: CSS patch files imported by `src/main.jsx`

- [x] **Step 1: Count high-risk CSS features**

Run:

```powershell
$patterns=@('mix-blend-mode','backdrop-filter','filter:','background-attachment','position: fixed','animation:','@keyframes','will-change','body::before','ambient-top','paper-texture-overlay'); foreach($p in $patterns){ $count=(rg -n --fixed-strings $p src -g "*.css" | Measure-Object).Count; "$p`t$count" }
```

Expected: a count high enough to justify cascade cleanup rather than one-off selector tweaks.

- [x] **Step 2: Inspect active import chain**

Run:

```powershell
Get-Content src\main.jsx | Select-String 'import "\./.*\.css"'
```

Expected: multiple sequential CSS patch files loaded after `styles.css`.

### Task 2: Stop Full-Viewport Flicker

**Files:**
- Modify: `src/authorhub-craft-polish.css`

- [x] **Step 1: Neutralize global fixed blend/filter layers**

Change the final active `html`, `body`, `body::before`, `.loading-screen`, and `.loading-screen::before` rules so full-page texture is static, unfiltered, and uses normal blending. Preserve paper texture by keeping `/texture-3-wide.jpg` as a background image.

- [x] **Step 2: Disable unused full-screen overlays**

Add final rules:

```css
.ambient-top,
.paper-texture-overlay {
  display: none !important;
}
```

Expected: no invisible fixed layer can intercept clicks or repaint above the app.

### Task 3: Consolidate Redundant CSS Imports Safely

**Files:**
- Modify: `src/main.jsx`
- Verify: rendered app screenshots/computed styles

- [x] **Step 1: Remove only redundant late patch imports whose rules are now owned by `authorhub-craft-polish.css`**

Candidate imports:

```js
import "./texture-background.css";
import "./final-polish-fixes.css";
import "./authorhub-refine-pass.css";
import "./authorhub-detail-polish.css";
```

Do not remove if visual verification shows a functional regression.

- [x] **Step 2: Keep semantic base files**

Keep `styles.css`, feature-specific CSS, and `authorhub-craft-polish.css` unless a later audit replaces them with a real consolidated stylesheet.

### Task 4: Verify Behavior and Visual Contracts

**Files:**
- No direct edits unless verification fails.

- [x] **Step 1: Build**

Run:

```powershell
npm run build
```

Expected: exit code 0.

- [x] **Step 2: Browser computed-style check**

Verify in browser:

```js
const before = getComputedStyle(document.body, '::before');
[
  before.mixBlendMode,
  before.filter,
  before.backgroundAttachment,
  getComputedStyle(document.querySelector('.ambient-top') || document.body).display
]
```

Expected: no full-viewport `multiply/color-burn` or heavy filter; `.ambient-top` hidden if present.

- [x] **Step 3: Visual sanity check**

Check:
- Auth/loading still show paper/cinematic background as designed.
- App background is visible and stable.
- Relation graph card and SVG dotted canvas have identical base color.
- Sidebar collapse handle appears only on sidebar hover.
- No console errors.

### Task 5: Commit and Deploy

**Files:**
- Commit modified files only.

- [ ] **Step 1: Commit**

Run:

```powershell
git add src docs
git commit -m "fix: stabilize css cascade and paper rendering"
```

- [ ] **Step 2: Push and deploy**

Run:

```powershell
git push origin master
vercel --prod
```

Expected: successful production deployment URL.
