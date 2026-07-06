import assert from "node:assert/strict";
import {
  formatPresenceLabel,
  isLocalSharedSaveEcho,
  isObsoleteSharedRealtimeUpdate,
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

console.log("shared collaboration rule checks passed");
