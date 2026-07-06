# AuthorHub Collaborative Input Design Report

Date: 2026-07-06

## Recommendation

Use a staged approach. Do not jump directly to a CRDT editor.

Recommended v1 is **Presence + throttled Broadcast draft preview**:

- Presence remains the source for who is online.
- Broadcast sends temporary typing previews for the active field only.
- Saved content still uses the current shared-novel save path.
- No draft preview is written to `author_hub_shared_novels.novel`.

This gives users the important Google Docs feeling ("A is typing here") without turning the whole app into a realtime document engine.

## Current System

- Shared novel content is saved as one JSONB document in `author_hub_shared_novels.novel`.
- Postgres changes notify collaborators after a save.
- Presence already tracks online collaborators.
- Current conflict handling avoids replacing text while a user is typing, but it does not show another user's unsaved draft.

This shape is good for saved-state collaboration. It is not enough for per-keystroke co-editing.

## Option A: Presence + Broadcast Draft Preview

Use Supabase Presence for slow-changing state and Broadcast for high-frequency draft events. Supabase docs explicitly recommend Broadcast for cursor/custom realtime messages and warn that Presence is not designed for high-frequency updates.

Draft payload:

```json
{
  "type": "draft-preview",
  "sharedNovelId": "uuid",
  "fieldPath": "outline",
  "userId": "uuid",
  "label": "writer",
  "tail": "xxx和xx正在相爱",
  "cursor": 128,
  "updatedAt": "2026-07-06T00:00:00.000Z"
}
```

Client behavior:

- Broadcast at most once every 700-1000ms per field.
- Send only the last 80-160 characters around the cursor, not the whole field.
- Render a ghost line near the matching field with a blinking underline suffix.
- Remove the ghost when the remote user saves, stops typing for 8-12 seconds, changes field, or disconnects.
- Never apply draft preview to the local saved document.

Pros:

- Lowest schema risk.
- Low Disk IO because drafts are not stored in Postgres JSONB.
- Good user experience for "I can see my collaborator is typing".
- Easy rollback: disable Broadcast preview and keep saved-state collaboration.

Cons:

- Not true Google Docs merging.
- If two users edit the same sentence, saved-state conflict still needs careful handling.
- Requires good throttling to avoid noisy Realtime traffic.

Free-plan impact:

- Low database RAM/Disk IO impact.
- Moderate WebSocket traffic if many collaborators type at once.
- Must throttle, dedupe, and cap payload size.

## Option B: Block-Level Preview

Add stable block IDs inside outline/setting and selected character fields. Broadcast drafts by block ID, and save blocks back into the existing novel JSON.

Pros:

- Clearer matching than plain textarea cursor offsets.
- Better for long outlines and settings.
- Opens the door to sortable outline/setting blocks later.

Cons:

- Requires a data-model migration or compatibility layer.
- More UI surface area and more QA.
- Sharing/export/import must understand both plain text and block text.

Free-plan impact:

- Still acceptable if only saved blocks are persisted.
- More client CPU and more compatibility code.

## Option C: CRDT Editor

Use Yjs or a similar CRDT layer for true concurrent editing.

Pros:

- Closest to Google Docs.
- Handles concurrent edits at character/operation level.
- Strongest long-term collaboration model.

Cons:

- Large architecture change.
- Needs an operation store, provider, awareness protocol, compaction, import/export, and recovery strategy.
- Much harder to keep Supabase free-plan costs predictable.
- Higher bundle size and QA burden.

Free-plan impact:

- Potentially high if operation logs are stored in Postgres.
- Needs retention/compaction or a dedicated realtime backend.

## Failure Modes To Design For

- User disconnects mid-typing: clear ghost preview after TTL.
- User saves while another user is typing: saved content syncs, draft preview remains only if still newer than save.
- Same field edited by two users: show both remote ghost labels, never overwrite local input.
- Mobile IME composition: do not broadcast during `compositionstart`/`compositionupdate`; broadcast after composition settles.
- Very long fields: send snippets only, never full text.
- Malicious payload: ignore messages over a strict byte limit and unknown field paths.

## Rollout Plan

1. Add a draft-preview rule module and tests.
2. Add Broadcast subscription only for editable shared novels.
3. Start with outline and setting fields only.
4. Add ghost preview rendering below the active textarea, not inside the textarea.
5. Expand to character background/secret after outline/setting is stable.
6. Keep CRDT as a later product decision after real usage proves demand.

## Sources

- Supabase Realtime Broadcast: https://supabase.com/docs/guides/realtime/broadcast
- Supabase Realtime Presence: https://supabase.com/docs/guides/realtime/presence
- Supabase Realtime overview: https://supabase.com/docs/guides/realtime
