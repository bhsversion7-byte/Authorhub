export const SHARED_SYNC_NOTICE = "内容已同步";
export const SHARED_DRAFT_FIELDS = ["outline", "setting"];
export const SHARED_DRAFT_TAIL_LIMIT = 160;
export const SHARED_DRAFT_TTL_MS = 12000;
export const SHARED_SAVE_SNIPPET_LIMIT = 5;
const VIEWER_ROLE = "viewer";
const SHARED_DRAFT_FIELD_SET = new Set(SHARED_DRAFT_FIELDS);

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

export function createSharedDraftPreview({ sharedNovelId, fieldPath, value, cursorIndex, user, actorRole }) {
  if (!sharedNovelId || !SHARED_DRAFT_FIELD_SET.has(fieldPath) || !user?.id) return null;
  const text = String(value ?? "");
  const cursor = clampNumber(cursorIndex, 0, text.length);
  const beforeCursor = text.slice(0, cursor);
  const fallback = text.slice(cursor, cursor + SHARED_DRAFT_TAIL_LIMIT);
  const tail = normalizeDraftTail(beforeCursor.slice(-SHARED_DRAFT_TAIL_LIMIT) || fallback);
  if (!tail) return null;
  return {
    type: "draft-preview",
    sharedNovelId,
    fieldPath,
    userId: user.id,
    actorRole: normalizeActorRole(actorRole),
    label: formatPresenceLabel({
      name: user.user_metadata?.username ?? user.user_metadata?.name,
      email: user.email,
    }),
    avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? "",
    tail,
    cursor,
    updatedAt: new Date().toISOString(),
  };
}

export function createSharedSaveNotice({ sharedNovelId, label, snippet, userId, actorRole }) {
  const cleanSnippet = getSharedSaveSnippet(snippet);
  if (!sharedNovelId || !cleanSnippet || !userId) return null;
  return {
    type: "save-notice",
    sharedNovelId,
    userId,
    actorRole: normalizeActorRole(actorRole),
    label: String(label ?? "协作者").trim().slice(0, 32) || "协作者",
    snippet: cleanSnippet,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeSharedSaveNotice(payload, { currentUserId, currentRole } = {}) {
  if (!payload || payload.type !== "save-notice") return null;
  const sharedNovelId = String(payload.sharedNovelId ?? "").trim();
  const userId = String(payload.userId ?? "").trim();
  const snippet = getSharedSaveSnippet(payload.snippet);
  const actorRole = normalizeActorRole(payload.actorRole);
  if (!sharedNovelId || !userId || isOwnCollaborationEvent({ userId, actorRole }, { currentUserId, currentRole }) || !snippet) return null;
  return {
    type: "save-notice",
    sharedNovelId,
    userId,
    actorRole,
    label: String(payload.label ?? "协作者").trim().slice(0, 32) || "协作者",
    snippet,
  };
}

export function getSharedSaveSnippet(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .slice(0, SHARED_SAVE_SNIPPET_LIMIT);
}

export function formatSharedSaveNotice({ label, snippet, userId, actorRole }) {
  const cleanSnippet = getSharedSaveSnippet(snippet);
  const actor = formatCollaborationActor({ label, userId, actorRole });
  return cleanSnippet ? `${actor}已保存：${cleanSnippet}......` : SHARED_SYNC_NOTICE;
}

// Top-level novel keys the "edited while you were away" catch-up notice can
// name. Anything else (id, sharedMeta, etc.) is either bookkeeping or not
// meaningful to call out by name.
const SHARED_NOVEL_SECTION_LABELS = {
  title: "书名",
  subtitle: "副标题",
  outline: "大纲",
  setting: "设定集",
  characters: "人物详情",
  timeline: "时间线",
  themes: "主题标签",
};

// Shallow top-level diff between the previous and next novel object, mapped
// to the same Chinese section names shown elsewhere in the UI. Deliberately
// shallow (JSON-stringify per key, not a deep patch) - this only needs to
// name WHICH cards changed for a notice, not describe the change itself.
export function diffNovelSections(previousNovel, nextNovel) {
  if (!previousNovel || !nextNovel) return [];
  const sections = [];
  for (const [key, label] of Object.entries(SHARED_NOVEL_SECTION_LABELS)) {
    const before = JSON.stringify(previousNovel[key] ?? null);
    const after = JSON.stringify(nextNovel[key] ?? null);
    if (before !== after) sections.push(label);
  }
  return sections;
}

export function formatSharedEditCatchUpNotice({ editorName, editorId, editorRole, sections }) {
  const label = formatCollaborationActor({ label: editorName, userId: editorId, actorRole: editorRole });
  const cleanSections = Array.isArray(sections) ? sections.filter(Boolean) : [];
  if (!cleanSections.length) return `${label}已编辑此小说。`;
  return `${label}已编辑：${cleanSections.join("、")}`;
}

export function normalizeSharedDraftPreview(payload, { currentUserId, currentRole, now = Date.now() } = {}) {
  if (!payload || payload.type !== "draft-preview") return null;
  const sharedNovelId = String(payload.sharedNovelId ?? "").trim();
  const fieldPath = String(payload.fieldPath ?? "").trim();
  const userId = String(payload.userId ?? "").trim();
  const actorRole = normalizeActorRole(payload.actorRole);
  if (!sharedNovelId || !SHARED_DRAFT_FIELD_SET.has(fieldPath) || !userId || isOwnCollaborationEvent({ userId, actorRole }, { currentUserId, currentRole })) return null;

  const tail = normalizeDraftTail(payload.tail).slice(0, SHARED_DRAFT_TAIL_LIMIT);
  if (!tail) return null;

  return {
    type: "draft-preview",
    sharedNovelId,
    fieldPath,
    userId,
    actorRole,
    label: String(payload.label ?? "协作者").trim().slice(0, 32) || "协作者",
    avatarUrl: String(payload.avatarUrl ?? "").trim().slice(0, 512),
    tail,
    cursor: clampNumber(payload.cursor, 0, Number.MAX_SAFE_INTEGER),
    updatedAt: String(payload.updatedAt ?? new Date(now).toISOString()),
    expiresAt: now + SHARED_DRAFT_TTL_MS,
  };
}

export function normalizeSharedDraftClear(payload, { currentUserId, currentRole } = {}) {
  if (!payload || payload.type !== "draft-clear") return null;
  const sharedNovelId = String(payload.sharedNovelId ?? "").trim();
  const fieldPath = String(payload.fieldPath ?? "").trim();
  const userId = String(payload.userId ?? "").trim();
  const actorRole = normalizeActorRole(payload.actorRole);
  if (!sharedNovelId || !SHARED_DRAFT_FIELD_SET.has(fieldPath) || !userId || isOwnCollaborationEvent({ userId, actorRole }, { currentUserId, currentRole })) return null;
  return { type: "draft-clear", sharedNovelId, fieldPath, userId, actorRole };
}

export function formatCollaborationActor({ label, userId, actorRole } = {}) {
  const roleLabel = normalizeActorRole(actorRole) === "owner" ? "作者" : "协作者";
  const cleanLabel = String(label ?? "").trim().slice(0, 32);
  const cleanId = String(userId ?? "").trim();
  const idLabel = cleanId ? `ID ${cleanId.slice(0, 8)}` : "ID 未知";
  return `${roleLabel}${cleanLabel ? ` ${cleanLabel}` : ""}（${idLabel}）`;
}

function isOwnCollaborationEvent(event, current) {
  if (event.userId && current.currentUserId && event.userId === current.currentUserId) return true;
  return normalizeActorRole(event.actorRole) === "owner" && normalizeActorRole(current.currentRole) === "owner";
}

function normalizeActorRole(role) {
  return role === "owner" ? "owner" : "editor";
}

export function pruneExpiredSharedDrafts(draftsByField, now = Date.now()) {
  const next = {};
  Object.entries(draftsByField ?? {}).forEach(([fieldPath, drafts]) => {
    const activeDrafts = (drafts ?? []).filter((draft) => draft?.expiresAt > now);
    if (activeDrafts.length) next[fieldPath] = activeDrafts;
  });
  return next;
}

function normalizeDraftTail(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
