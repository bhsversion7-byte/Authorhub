export const SHARED_SYNC_NOTICE = "内容已同步";
const VIEWER_ROLE = "viewer";

export function rememberLocalSharedSave(versionMap, row) {
  if (!versionMap || !row?.id || !row.updatedAt) return;
  versionMap.set(row.id, row.updatedAt);
}

export function isLocalSharedSaveEcho(versionMap, row) {
  if (!versionMap || !row?.id || !row.updatedAt) return false;
  return versionMap.get(row.id) === row.updatedAt;
}

export function isObsoleteSharedRealtimeUpdate(versionMap, row) {
  if (!versionMap || !row?.id || !row.updatedAt) return false;
  const localUpdatedAt = versionMap.get(row.id);
  if (!localUpdatedAt) return false;
  const localTime = Date.parse(localUpdatedAt);
  const rowTime = Date.parse(row.updatedAt);
  if (!Number.isFinite(localTime) || !Number.isFinite(rowTime)) return false;
  return rowTime <= localTime;
}

export function shouldHandleSharedRealtimeUpdate({ role, hasPendingLocalSave, hasInFlightSave, isTextEntryActive }) {
  if (role === VIEWER_ROLE) return { action: "ignore", notice: "" };
  if (hasPendingLocalSave || hasInFlightSave || isTextEntryActive) return { action: "defer", notice: "" };
  return { action: "apply", notice: SHARED_SYNC_NOTICE };
}

export function formatPresenceLabel(user = {}) {
  const name = String(user.name ?? user.username ?? "").trim();
  if (name) return name;
  const email = String(user.email ?? "").trim();
  if (email) return email.split("@")[0] || email;
  return "协作者";
}

export function getPresenceInitial(label) {
  return String(label || "协").trim().slice(0, 1).toUpperCase();
}
