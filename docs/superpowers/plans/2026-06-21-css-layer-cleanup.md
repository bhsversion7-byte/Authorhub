# CSS Layer Cleanup Plan - 2026-06-21

## Goal
Reduce cascade risk and repaint/flicker risk without changing AuthorHub's feature zones or intended visual direction.

## Findings
- `src/styles.css` is still 149KB and contains several historical "final" material passes after the base styles.
- The same graph, card, timeline, dark-mode, loading, and texture selectors are defined repeatedly in `styles.css`, then again in later patch files.
- `src/authorhub-craft-polish.css` is currently the actual last-loaded material guardrail, but it also contains repeated stability blocks from multiple passes.
- `App.jsx` still renders `.ambient-top`, even though the final CSS disables it. This is dead DOM and a repaint/click-layer risk.
- Logo lightbox CSS exists only inside the late `styles.css` patch tail, so it must be preserved before truncating old patches.

## Implementation Tasks
1. Create a dedicated final layer `src/material-system.css`:
   - Move the current last-loaded material contract into it.
   - Add the logo lightbox viewport rules currently buried in late `styles.css`.
   - Keep this file imported last.
2. Update `src/main.jsx`:
   - Replace `authorhub-craft-polish.css` import with `material-system.css`.
3. Trim `src/styles.css`:
   - Keep base styles up through the first midnight/tour polish layer.
   - Remove the repeated historical material/debug passes starting at `/* AuthorHub Design Prompt Pass... */`.
   - This preserves base layout and tour styles while removing obsolete graph/card/dark/texture overrides.
4. Remove dead `.ambient-top` element from `src/App.jsx`.
5. Delete old `src/authorhub-craft-polish.css` after its content is moved.
6. Verify:
   - `npm run build`
   - Browser smoke test on a non-6173 local preview.
   - Check `body::before` is not generating a fixed full-screen texture layer.
   - Check no `.ambient-top` element exists.
   - Check CSS file count/import order and `styles.css` size reduced.

## Safety Rules
- No UI feature removal.
- No semantic redesign.
- No edits to user content or Supabase configuration.
- If visual smoke check shows a regression, revert the risky extraction and keep only dead-overlay cleanup.
