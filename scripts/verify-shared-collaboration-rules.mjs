import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SHARED_DRAFT_TAIL_LIMIT,
  SHARED_SAVE_SNIPPET_LIMIT,
  createSharedDraftPreview,
  createSharedSaveNotice,
  formatSharedEditCatchUpNotice,
  formatSharedSaveNotice,
  getSharedSaveSnippet,
  formatPresenceLabel,
  isLocalSharedSaveEcho,
  isObsoleteSharedRealtimeUpdate,
  normalizeSharedDraftClear,
  normalizeSharedDraftPreview,
  normalizeSharedSaveNotice,
  pruneExpiredSharedDrafts,
  rememberLocalSharedSave,
  shouldHandleSharedRealtimeUpdate,
} from "../src/lib/sharedCollaboration.js";
import { SHARE_ROLES } from "../src/lib/shareAdapter.js";

const localVersions = new Map();
rememberLocalSharedSave(localVersions, { id: "shared-1", updatedAt: "2026-07-06T01:00:00Z" });

assert.equal(
  isLocalSharedSaveEcho(localVersions, { id: "shared-1", updatedAt: "2026-07-06T01:00:00Z" }),
  true,
  "the realtime event caused by the current user's own save should be ignored",
);
assert.equal(
  isLocalSharedSaveEcho(localVersions, { id: "shared-1", updatedAt: "2026-07-06T01:00:02Z" }),
  false,
  "a later collaborator save should not be mistaken for the current user's echo",
);
assert.equal(
  isObsoleteSharedRealtimeUpdate(localVersions, { id: "shared-1", updatedAt: "2026-07-06T00:59:59Z" }),
  true,
  "queued realtime updates older than the current user's committed save should be discarded",
);
assert.equal(
  isObsoleteSharedRealtimeUpdate(localVersions, { id: "shared-1", updatedAt: "2026-07-06T01:00:03Z" }),
  false,
  "newer collaborator saves should still be eligible after the current user's save",
);

assert.deepEqual(
  shouldHandleSharedRealtimeUpdate({
    role: SHARE_ROLES.VIEWER,
    hasPendingLocalSave: false,
    hasInFlightSave: false,
    isTextEntryActive: false,
  }),
  { action: "ignore", notice: "" },
  "viewer rows should not show edit-sync notices",
);
assert.equal(
  formatSharedEditCatchUpNotice({ editorName: "共同作者", editorId: "editor-123456", editorRole: "editor", sections: ["大纲"] }),
  "协作者 共同作者（ID editor-1）已编辑：大纲",
  "offline notices should identify the collaborator role and a stable id prefix",
);

assert.deepEqual(
  shouldHandleSharedRealtimeUpdate({
    role: SHARE_ROLES.EDITOR,
    hasPendingLocalSave: true,
    hasInFlightSave: false,
    isTextEntryActive: false,
  }),
  { action: "defer", notice: "" },
  "remote saves should wait while local edits are still pending",
);

assert.deepEqual(
  shouldHandleSharedRealtimeUpdate({
    role: SHARE_ROLES.EDITOR,
    hasPendingLocalSave: false,
    hasInFlightSave: false,
    isTextEntryActive: true,
  }),
  { action: "defer", notice: "" },
  "remote saves should not replace textarea values while the user is typing",
);

assert.deepEqual(
  shouldHandleSharedRealtimeUpdate({
    role: SHARE_ROLES.EDITOR,
    hasPendingLocalSave: false,
    hasInFlightSave: false,
    isTextEntryActive: false,
  }),
  { action: "apply", notice: "内容已同步" },
  "safe collaborator saves should apply silently with a light sync notice",
);

assert.equal(formatPresenceLabel({ name: "本狗老师" }), "本狗老师");
assert.equal(formatPresenceLabel({ email: "friend@example.com" }), "friend");
assert.equal(formatPresenceLabel({}), "协作者");

const authorUser = {
  id: "author-1",
  email: "author@example.com",
  user_metadata: { name: "作者A" },
};
const longDraft = "a".repeat(240);
const preview = createSharedDraftPreview({
  sharedNovelId: "shared-1",
  fieldPath: "outline",
  value: longDraft,
  cursorIndex: longDraft.length,
  user: authorUser,
  actorRole: "owner",
});
assert.equal(preview.tail.length, SHARED_DRAFT_TAIL_LIMIT, "draft preview should send only a capped text tail, never the whole field");
assert.equal(
  createSharedDraftPreview({ sharedNovelId: "shared-1", fieldPath: "secret", value: "hidden", cursorIndex: 6, user: authorUser }),
  null,
  "draft preview should only support explicitly allowed long-text fields",
);
assert.equal(
  normalizeSharedDraftPreview(preview, { currentUserId: "author-1" }),
  null,
  "a user's own broadcast echo must be ignored",
);
assert.equal(
  normalizeSharedDraftPreview(preview, { currentUserId: "stale-owner-id", currentRole: "owner" }),
  null,
  "an owner broadcast must not be shown back to the owner even if a stale session exposes a mismatched user id",
);
const remotePreview = normalizeSharedDraftPreview(preview, { currentUserId: "friend-1", currentRole: "editor", now: 1000 });
assert.equal(remotePreview.userId, "author-1");
assert.equal(remotePreview.actorRole, "owner");
assert.equal(remotePreview.expiresAt, 13000, "remote draft previews should have a short TTL");
assert.deepEqual(
  normalizeSharedDraftClear({ type: "draft-clear", sharedNovelId: "shared-1", fieldPath: "outline", userId: "author-1", actorRole: "owner" }, { currentUserId: "friend-1", currentRole: "editor" }),
  { type: "draft-clear", sharedNovelId: "shared-1", fieldPath: "outline", userId: "author-1", actorRole: "owner" },
);
assert.deepEqual(
  pruneExpiredSharedDrafts({ outline: [{ ...remotePreview, expiresAt: 999 }, { ...remotePreview, userId: "author-2", expiresAt: 2000 }] }, 1000),
  { outline: [{ ...remotePreview, userId: "author-2", expiresAt: 2000 }] },
  "expired draft previews should be removed without touching active previews",
);
assert.equal(getSharedSaveSnippet("  乖宝和石墨正在相爱  "), "乖宝和石墨".slice(0, SHARED_SAVE_SNIPPET_LIMIT));
const saveNotice = createSharedSaveNotice({
  sharedNovelId: "shared-1",
  label: "作者A",
  snippet: "乖宝和石墨正在相爱",
  userId: "author-1",
  actorRole: "owner",
});
assert.equal(saveNotice.snippet.length, SHARED_SAVE_SNIPPET_LIMIT, "save notice snippets should be capped at five characters");
assert.equal(formatSharedSaveNotice(saveNotice), "作者 作者A（ID author-1）已保存：乖宝和石墨......");
assert.equal(
  normalizeSharedSaveNotice(saveNotice, { currentUserId: "author-1" }),
  null,
  "a user's own save notice broadcast echo must be ignored",
);
assert.deepEqual(
  normalizeSharedSaveNotice(saveNotice, { currentUserId: "friend-1", currentRole: "editor" }),
  { type: "save-notice", sharedNovelId: "shared-1", userId: "author-1", actorRole: "owner", label: "作者A", snippet: "乖宝和石墨" },
);

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const shareAdapterSource = readFileSync(new URL("../src/lib/shareAdapter.js", import.meta.url), "utf8");
const ownerDeleteMigration = readFileSync(
  new URL("../supabase/migrations/20260718174055_delete_owner_shared_novel.sql", import.meta.url),
  "utf8",
);
assert.ok(
  appSource.includes("deleteCandidate.sharedMeta.role === SHARE_ROLES.OWNER"),
  "delete confirmation must distinguish a workspace owner from a collaborator",
);
assert.ok(
  appSource.includes("是否删除此小说？") && appSource.includes("是否删除此共享小说？"),
  "owners and collaborators must receive distinct delete wording",
);
assert.ok(
  shareAdapterSource.includes('rpc("delete_author_hub_owned_shared_novel"'),
  "owner deletion must use the dedicated server-side RPC instead of leaveSharedNovel",
);
assert.ok(
  ownerDeleteMigration.includes("owner_id = v_user_id") && ownerDeleteMigration.includes("update public.author_hub_documents"),
  "owner deletion must verify ownership and atomically remove the source document",
);
assert.ok(
  ownerDeleteMigration.includes("revoke all on function public.delete_author_hub_owned_shared_novel(uuid) from public, anon")
    && ownerDeleteMigration.includes("grant execute on function public.delete_author_hub_owned_shared_novel(uuid) to authenticated"),
  "the destructive owner-delete RPC must remain unavailable to anonymous callers",
);

console.log("shared collaboration rule checks passed");
