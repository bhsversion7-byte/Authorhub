import { hasSupabaseConfig, supabase } from "./supabaseClient.js";
import { DEFAULT_PUBLIC_SECTIONS, FULL_PUBLIC_SECTIONS, filterNovelForSections, normalizePublicSections } from "./shareSections.js";

export const SHARE_ROLES = {
  EDITOR: "editor",
  VIEWER: "viewer",
  OWNER: "owner",
};

export function parseShareRoute(pathname = window.location.pathname) {
  const match = pathname.match(/^\/(share|join)\/([^/?#]+)/);
  if (!match) return null;
  return {
    intent: match[1] === "join" ? SHARE_ROLES.EDITOR : SHARE_ROLES.VIEWER,
    token: decodeURIComponent(match[2]),
  };
}

export function buildShareUrl(token, role) {
  const route = role === SHARE_ROLES.EDITOR ? "join" : "share";
  return `${getShareOrigin()}/${route}/${encodeURIComponent(token)}`;
}

function getShareOrigin() {
  const configuredOrigin = import.meta.env?.VITE_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configuredOrigin) return configuredOrigin;

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  return "https://www.authorhub.cn";
}

export function createShareToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replaceAll("-", "");
  const bytes = new Uint8Array(24);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("") || `${Date.now()}${Math.random().toString(16).slice(2)}`;
}

export async function ensureSharedNovel(novel) {
  assertSharingAvailable();
  const { data, error } = await supabase.rpc("ensure_author_hub_shared_novel", {
    p_source_novel_id: novel.sourceNovelId ?? novel.id,
    p_novel: stripSharedNovel(novel),
  });
  if (error) throw error;
  return normalizeSharedNovelRow(Array.isArray(data) ? data[0] : data);
}

export async function createShareLink(sharedNovelId, role, sections = DEFAULT_PUBLIC_SECTIONS) {
  assertSharingAvailable();
  const token = createShareToken();
  const publicSections = role === SHARE_ROLES.VIEWER ? normalizePublicSections(sections) : FULL_PUBLIC_SECTIONS;

  const { data, error } = await supabase
    .from("author_hub_share_links")
    .insert({
      shared_novel_id: sharedNovelId,
      role,
      token,
      public_sections: publicSections,
    })
    .select("token, role, public_sections")
    .single();
  if (error) throw error;

  // "重新生成" must retire the old link, not just mint a new one alongside it -
  // otherwise the previous token stays is_active=true forever and anyone who
  // already has it keeps access. Revoke other same-role links for this novel
  // only after the new one is safely inserted, so a failure here leaves the
  // old link still working instead of leaving zero active links.
  const { error: revokeError } = await supabase
    .from("author_hub_share_links")
    .update({ is_active: false })
    .eq("shared_novel_id", sharedNovelId)
    .eq("role", role)
    .eq("is_active", true)
    .neq("token", token);
  if (revokeError) throw revokeError;

  return {
    token: data.token,
    role: data.role,
    publicSections: normalizePublicSections(data.public_sections, { fallback: publicSections }),
    url: buildShareUrl(data.token, data.role),
  };
}

// A fixed, reusable link the owner can hand out to many collaborators or
// readers at once - any number of people can open the same 只读查看 token
// concurrently, since it's just a plain anon-granted read (no session/lock).
// Regenerating on every popover open (the old createShareLink-only flow)
// broke the link for everyone who already had it and churned an
// insert+update on every view. Reuses the current active link for this
// role instead. `requireSectionMatch` defaults to true (viewer links need
// an exact section match, since sections are baked into the token at
// creation time) - pass false to just fetch whatever's currently active
// regardless of section selection, e.g. to resync the UI after the local
// section-picker state was reset by a remount instead of by the user.
export async function getActiveShareLink(sharedNovelId, role, sections = DEFAULT_PUBLIC_SECTIONS, { requireSectionMatch = true } = {}) {
  assertSharingAvailable();
  const { data, error } = await supabase
    .from("author_hub_share_links")
    .select("token, role, public_sections")
    .eq("shared_novel_id", sharedNovelId)
    .eq("role", role)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (role === SHARE_ROLES.VIEWER && requireSectionMatch) {
    const activeSections = normalizePublicSections(data.public_sections, { fallback: FULL_PUBLIC_SECTIONS });
    const requestedSections = normalizePublicSections(sections, { fallback: DEFAULT_PUBLIC_SECTIONS });
    const sameSections = activeSections.length === requestedSections.length && activeSections.every((id) => requestedSections.includes(id));
    if (!sameSections) return null;
  }

  return {
    token: data.token,
    role: data.role,
    publicSections: normalizePublicSections(data.public_sections, { fallback: FULL_PUBLIC_SECTIONS }),
    url: buildShareUrl(data.token, data.role),
  };
}

export async function getOrCreateShareLink(sharedNovelId, role, sections = DEFAULT_PUBLIC_SECTIONS, options = {}) {
  const existing = await getActiveShareLink(sharedNovelId, role, sections, options);
  if (existing) return existing;
  return createShareLink(sharedNovelId, role, sections);
}

// Explicit "撤回": deletes the link so it stops working immediately, and for
// editor also removes every already-joined collaborator's membership - not
// just future joins via that URL, since the point is taking back access the
// owner regrets having handed out. Viewer access is purely token-based (no
// membership row), so deleting the link alone fully revokes it.
export async function revokeShareRole(sharedNovelId, role) {
  assertSharingAvailable();
  const { error } = await supabase.rpc("revoke_author_hub_share_role", {
    p_shared_novel_id: sharedNovelId,
    p_role: role,
  });
  if (error) throw error;
}

export async function getSharedNovelByToken(token) {
  assertSharingAvailable();
  const { data, error } = await supabase.rpc("get_author_hub_shared_novel_by_token", {
    p_token: token,
  });
  if (error) throw error;
  return normalizeSharedNovelRow(Array.isArray(data) ? data[0] : data);
}

export async function joinSharedNovel(token) {
  assertSharingAvailable();
  const { data, error } = await supabase.rpc("join_author_hub_shared_novel", {
    p_token: token,
  });
  if (error) throw error;
  return normalizeSharedNovelRow(Array.isArray(data) ? data[0] : data);
}

export async function loadSharedNovelsForUser() {
  if (!hasSupabaseConfig || !supabase) return [];
  const { data, error } = await supabase.rpc("list_author_hub_shared_novels");
  if (error) {
    console.warn("AuthorHub shared novels could not be loaded.", error);
    return [];
  }
  return (data ?? []).map(normalizeSharedNovelRow).filter(Boolean);
}

export async function saveSharedNovel(sharedNovelId, novel, expectedUpdatedAt) {
  assertSharingAvailable();
  const { data, error } = await supabase.rpc("save_author_hub_shared_novel", {
    p_shared_novel_id: sharedNovelId,
    p_novel: stripSharedNovel(novel),
    p_expected_updated_at: expectedUpdatedAt ?? null,
  });
  if (error) throw error;
  return normalizeSharedNovelRow(Array.isArray(data) ? data[0] : data);
}

export function subscribeToSharedNovel(sharedNovelId, onChange) {
  if (!hasSupabaseConfig || !supabase || !sharedNovelId) return () => {};
  const channel = supabase
    .channel(`author-hub-shared-novel:${sharedNovelId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "author_hub_shared_novels",
        filter: `id=eq.${sharedNovelId}`,
      },
      (payload) => onChange?.(normalizeSharedNovelRow(payload.new)),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function stripSharedNovel(novel) {
  const { sharedMeta, sourceNovelId, workspaceId, ...rest } = novel ?? {};
  return {
    ...rest,
    id: sourceNovelId ?? rest.id,
  };
}

export function decorateSharedNovel(row) {
  if (!row?.novel || !row.id) return null;
  const sourceNovelId = row.sourceNovelId ?? row.source_novel_id ?? row.novel.id;
  const role = row.role ?? SHARE_ROLES.VIEWER;
  const publicSections = normalizePublicSections(row.publicSections ?? row.public_sections, { fallback: FULL_PUBLIC_SECTIONS });
  // Owners/editors get the complete source (preference.md: "Editor links keep the complete source").
  // Section filtering + private-field stripping only applies to the public read-only viewer role.
  const novelContent = role === SHARE_ROLES.VIEWER ? filterNovelForSections(row.novel, publicSections) : row.novel;
  return {
    ...novelContent,
    id: `shared-${row.id}`,
    sourceNovelId,
    workspaceId: `shared-${row.id}`,
    sharedMeta: {
      id: row.id,
      role,
      collaboratorCount: row.collaboratorCount ?? row.collaborator_count ?? 1,
      updatedAt: row.updatedAt ?? row.updated_at ?? null,
      publicSections,
    },
  };
}

function normalizeSharedNovelRow(row) {
  if (!row) return null;
  return {
    id: row.id ?? row.shared_novel_id,
    sourceNovelId: row.sourceNovelId ?? row.source_novel_id,
    role: row.role ?? SHARE_ROLES.VIEWER,
    novel: row.novel,
    collaboratorCount: row.collaboratorCount ?? row.collaborator_count ?? 1,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
    publicSections: normalizePublicSections(row.publicSections ?? row.public_sections, { fallback: FULL_PUBLIC_SECTIONS }),
  };
}

function assertSharingAvailable() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error("Sharing requires Supabase configuration.");
  }
}
