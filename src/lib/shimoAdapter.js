import { mockAuthorHubData } from "../data/mockData.js";
import { createDebouncer } from "./debounce.js";
import { migrateEmbeddedImagesToStorage } from "./mediaStorage.js";
import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

const STORAGE_PREFIX = "author-hub-shimo-cache-v4";
const DOCUMENT_TITLE = "default-author-hub";
const ensuredProfileIds = new Set();
const lastCloudSignatures = new Map();
// Do not let fallback/local data overwrite a real cloud document after a
// Supabase load failure in the same browser session.
const cloudSaveBlockedUserIds = new Set();

function storageKey(user) {
  return `${STORAGE_PREFIX}:${user?.id ?? "local"}`;
}

export async function loadAuthorHubData(user) {
  const local = loadLocalData(user);

  if (hasSupabaseConfig && supabase && user?.id) {
    try {
      // ensureProfile (profiles table) and this select (author_hub_documents
      // table) don't depend on each other's result, but used to run one
      // after the other - a fully avoidable extra network round trip added
      // to every single login/page load, which matters most for users with
      // higher latency to the project's region. Run them concurrently
      // instead (2026-07-08 perf pass).
      const [, { data, error }] = await Promise.all([
        ensureProfile(user),
        supabase.from("author_hub_documents").select("document").eq("user_id", user.id).eq("title", DOCUMENT_TITLE).maybeSingle(),
      ]);

      if (error) throw error;

      if (data?.document) {
        const migrated = migrateData(data.document);
        // Documents saved before images moved to Storage still hold data:
        // URIs; quietly upload those and persist the slimmed-down document
        // so future autosaves stop rewriting a multi-MB jsonb blob.
        const { data: healed, changed } = await migrateEmbeddedImagesToStorage(migrated);
        const serialized = saveLocalData(healed, user);
        if (changed) {
          saveCloudData(healed, user)
            .then(() => markCloudSynced(serialized, user))
            .catch((error) => console.warn("Author Hub could not persist the image-storage migration; will retry next load.", error));
        } else {
          markCloudSynced(serialized, user);
        }
        cloudSaveBlockedUserIds.delete(user.id);
        return healed;
      }

      const initial = local ?? migrateData(await fetchFromShimoOrMock());
      await saveCloudData(initial, user);
      markCloudSynced(saveLocalData(initial, user), user);
      cloudSaveBlockedUserIds.delete(user.id);
      return initial;
    } catch (error) {
      cloudSaveBlockedUserIds.add(user.id);
      console.warn("Author Hub cloud load failed; using local cache fallback.", error);
    }
  }

  if (local) return local;
  const data = migrateData(await fetchFromShimoOrMock());
  saveLocalData(data, user);
  return data;
}

const CLOUD_SAVE_DEBOUNCE_MS = 1000;
const cloudSaveDebouncer = createDebouncer(CLOUD_SAVE_DEBOUNCE_MS);

export function saveAuthorHubData(data, user, options = {}) {
  const migrated = migrateData(data);
  // Local cache write stays synchronous/immediate (not debounced): it's the
  // offline-safety net, so a crash or force-quit a moment after the last
  // keystroke must not be able to lose it. Only the network upsert below is
  // debounced.
  const serialized = saveLocalData(migrated, user);

  if (hasSupabaseConfig && supabase && user?.id) {
    if (cloudSaveBlockedUserIds.has(user.id)) {
      console.warn("Author Hub skipped cloud save because the cloud document did not load successfully in this session.");
      return;
    }

    const cloudKey = storageKey(user);
    const cloudSignature = createDocumentSignature(serialized);
    if (lastCloudSignatures.get(cloudKey) === cloudSignature) return;

    const saveNow = () =>
      saveCloudData(migrated, user).then(() => {
        lastCloudSignatures.set(cloudKey, cloudSignature);
    });

    if (options.immediate) {
      cloudSaveDebouncer.cancel();
      return saveNow().catch((error) => {
        console.warn("Author Hub cloud save failed; local cache is preserved.", error);
        throw error;
      });
    }

    // Coalesce the network upsert separately from the immediate local write.
    // Page-hide/logout paths call flushCloudSave().
    cloudSaveDebouncer.schedule(() =>
      saveNow().catch((error) => {
        console.warn("Author Hub cloud save failed; local cache is preserved.", error);
      }),
    );
  }

  return Promise.resolve();
}

// Force any pending debounced cloud write to run immediately. Safe to call
// anytime (logout, tab hide/close, unmount); resolves when the write settles.
export function flushCloudSave() {
  return cloudSaveDebouncer.flush() ?? Promise.resolve();
}

export function isCloudSaveBlocked(userId) {
  return Boolean(userId) && cloudSaveBlockedUserIds.has(userId);
}

// The local cache holds the entire manuscript (every outline, setting,
// timeline, and character - including hidden 隐藏设定) as plaintext JSON. On
// a shared/public computer, leaving it behind after "安全登出" or "注销账号"
// means the next person can read the whole thing from DevTools. Clearing it
// is the actual fix for that exposure (client-side encryption would not help
// - the key would have to live client-side too). Sweeps every historical
// cache prefix (`-v1`..current) plus the anonymous/local key, so a version
// bump never strands an old plaintext copy either.
export function clearLocalAuthorHubData(user) {
  try {
    const ids = new Set([user?.id, "local"].filter(Boolean));
    const legacyPrefixes = ["author-hub-shimo-cache", STORAGE_PREFIX];
    for (const key of Object.keys(window.localStorage)) {
      if (legacyPrefixes.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key);
      }
    }
    // Belt-and-suspenders: also target the exact current keys in case the
    // prefix scan above is ever narrowed.
    for (const id of ids) {
      window.localStorage.removeItem(`${STORAGE_PREFIX}:${id}`);
    }
    lastCloudSignatures.clear();
  } catch (error) {
    console.warn("Author Hub could not clear the local manuscript cache.", error);
  }
}

// A cloud load failure blocks saves for the rest of the session (see
// loadAuthorHubData) so a stale local fallback can't silently overwrite a
// newer cloud document. But that block must not be permanent - every edit
// made afterward (a novel reorder, a character save, anything) is real user
// intent, not stale fallback data, and deserves to reach Supabase once
// connectivity returns. Call this in the background (network regain,
// periodic retry, an explicit "重试" button) to re-probe connectivity; it
// only tests the connection and clears the block on success. The caller is
// responsible for immediately re-pushing the current in-memory document
// afterward (saveAuthorHubData(data, user, { immediate: true })) so nothing
// edited while blocked is lost.
export async function retryCloudSync(user) {
  if (!hasSupabaseConfig || !supabase || !user?.id) return false;
  if (!cloudSaveBlockedUserIds.has(user.id)) return true;
  try {
    await ensureProfile(user);
    const { error } = await supabase
      .from("author_hub_documents")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("title", DOCUMENT_TITLE)
      .maybeSingle();
    if (error) throw error;
    cloudSaveBlockedUserIds.delete(user.id);
    return true;
  } catch (error) {
    console.warn("Author Hub cloud sync retry failed; still saving locally only.", error);
    return false;
  }
}

function loadLocalData(user) {
  try {
    const cached = window.localStorage.getItem(storageKey(user));
    if (!cached) return null;
    const migrated = migrateData(JSON.parse(cached));
    saveLocalData(migrated, user);
    return migrated;
  } catch (error) {
    console.warn("Author Hub local cache could not be read.", error);
    return null;
  }
}

function saveLocalData(data, user) {
  const serialized = JSON.stringify(data);
  try {
    window.localStorage.setItem(storageKey(user), serialized);
  } catch (error) {
    try {
      window.localStorage.setItem(storageKey(user), JSON.stringify(createLocalCacheSnapshot(data)));
      console.warn("Author Hub local cache was compacted; inline media stays in cloud save.", error);
    } catch (compactError) {
      console.warn("Author Hub local cache is full; latest large media changes may not persist.", compactError);
    }
  }
  return serialized;
}

function createLocalCacheSnapshot(data) {
  return {
    ...data,
    novels: (data.novels ?? []).map((novel) => ({
      ...novel,
      characters: (novel.characters ?? []).map((character) => ({
        ...character,
        images: compactMediaList(character.images),
      })),
      timeline: (novel.timeline ?? []).map((event) => ({
        ...event,
        images: compactMediaList(event.images),
      })),
    })),
  };
}

function compactMediaList(images) {
  return (images ?? []).filter((image) => {
    if (typeof image === "string") return !image.startsWith("data:image/");
    return typeof image?.src !== "string" || !image.src.startsWith("data:image/");
  });
}

async function ensureProfile(user) {
  if (ensuredProfileIds.has(user.id)) return;
  await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      username: user.user_metadata?.username ?? user.email?.split("@")[0] ?? "writer",
      email: user.email ?? "",
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  ensuredProfileIds.add(user.id);
}

async function saveCloudData(data, user) {
  await ensureProfile(user);
  const { error } = await supabase.from("author_hub_documents").upsert(
    {
      user_id: user.id,
      title: DOCUMENT_TITLE,
      document: data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,title" },
  );
  if (error) throw error;
}

function markCloudSynced(serialized, user) {
  if (!user?.id) return;
  lastCloudSignatures.set(storageKey(user), createDocumentSignature(serialized));
}

function createDocumentSignature(serialized) {
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${serialized.length}:${hash >>> 0}`;
}

async function fetchFromShimoOrMock() {
  return mockAuthorHubData;
}

// migrateData/migrateNovel are pure functions of their input, so caching by
// object identity is safe: `App.jsx`'s `saveAuthorHubData` runs this on
// EVERY keystroke (only the network write is debounced - the local cache
// write is intentionally immediate, see the "Data And Auth Rules" note in
// preference.md), but `setData`'s updaters only ever replace the ONE novel
// object actually being edited - every other novel keeps its exact previous
// object reference across renders. Without this cache, every keystroke in
// any single novel re-rebuilt every character/event object across the ENTIRE
// workspace (all novels), not just the one being typed in - the single
// biggest per-keystroke cost found in a 2026-07-07 performance audit.
const migratedNovelCache = new WeakMap();

function migrateNovel(novel) {
  const cached = migratedNovelCache.get(novel);
  if (cached) return cached;
  try {
    const migrated = {
      ...novel,
      urls: { ao3: "", jjwxc: "", qidian: "", qimao: "", fanqie: "", changpei: "", ...(novel.urls ?? {}) },
      characters: (novel.characters ?? []).filter(isRecord).map((character, index) => ({
        ...character,
        tag: character.tag ?? character.faction ?? inferCharacterTag(character, index),
        color: character.color ?? ["#8BA09C", "#DDA96A", "#A9A084", "#BFA57B", "#A7B8C8"][index % 5],
        images: character.images ?? [],
      })),
      relationships: novel.relationships ?? [],
      timeline: (novel.timeline ?? []).filter(isRecord).map((event) => ({ ...event, images: event.images ?? [] })),
    };
    migratedNovelCache.set(novel, migrated);
    return migrated;
  } catch (error) {
    // This runs on every keystroke (saveAuthorHubData) and inside a render
    // path (decorateSharedNovel -> normalizeSharedNovelContent) for EVERY
    // novel in the workspace - one malformed novel throwing here would take
    // down the whole app via the top-level ErrorBoundary, not just that
    // novel. Fall back to the un-migrated novel rather than crashing
    // (2026-07-07 stability review); it may be missing a default field or
    // two, but the rest of the workspace keeps working.
    console.warn("AuthorHub could not migrate a novel; using it unmigrated.", novel?.id, error);
    return novel;
  }
}

export function migrateData(data) {
  const sourceNovels = Array.isArray(data.novels) ? data.novels : mockAuthorHubData.novels;
  const novels = sourceNovels.filter(isRecord).map(migrateNovel);

  return {
    ...mockAuthorHubData,
    ...data,
    author: { ...mockAuthorHubData.author, ...(data.author ?? {}) },
    shimoFolders: data.shimoFolders?.length ? data.shimoFolders : mockAuthorHubData.shimoFolders,
    appearance: { ...mockAuthorHubData.appearance, ...(data.appearance ?? {}) },
    novels,
  };
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function inferCharacterTag(character, index) {
  const role = character.role ?? "";
  if (index === 0 || /主角1|攻/.test(role)) return "主角1";
  if (index === 1 || /主角2|受/.test(role)) return "主角2";
  return "主要配角";
}
