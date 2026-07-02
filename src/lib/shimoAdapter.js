import { mockAuthorHubData } from "../data/mockData.js";
import { createDebouncer } from "./debounce.js";
import { migrateEmbeddedImagesToStorage } from "./mediaStorage.js";
import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

const STORAGE_PREFIX = "author-hub-shimo-cache-v4";
const DOCUMENT_TITLE = "default-author-hub";

function storageKey(user) {
  return `${STORAGE_PREFIX}:${user?.id ?? "local"}`;
}

export async function loadAuthorHubData(user) {
  const local = loadLocalData(user);

  if (hasSupabaseConfig && supabase && user?.id) {
    try {
      await ensureProfile(user);
      const { data, error } = await supabase
        .from("author_hub_documents")
        .select("document")
        .eq("user_id", user.id)
        .eq("title", DOCUMENT_TITLE)
        .maybeSingle();

      if (error) throw error;

      if (data?.document) {
        const migrated = migrateData(data.document);
        // Documents saved before images moved to Storage still hold data:
        // URIs; quietly upload those and persist the slimmed-down document
        // so future autosaves stop rewriting a multi-MB jsonb blob.
        const { data: healed, changed } = await migrateEmbeddedImagesToStorage(migrated);
        saveLocalData(healed, user);
        if (changed) {
          saveCloudData(healed, user).catch((error) =>
            console.warn("Author Hub could not persist the image-storage migration; will retry next load.", error),
          );
        }
        return healed;
      }

      const initial = local ?? migrateData(await fetchFromShimoOrMock());
      await saveCloudData(initial, user);
      saveLocalData(initial, user);
      return initial;
    } catch (error) {
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

export function saveAuthorHubData(data, user) {
  const migrated = migrateData(data);
  // Local cache write stays synchronous/immediate (not debounced): it's the
  // offline-safety net, so a crash or force-quit a moment after the last
  // keystroke must not be able to lose it. Only the network upsert below is
  // debounced.
  saveLocalData(migrated, user);

  if (hasSupabaseConfig && supabase && user?.id) {
    // Coalesce the network upsert separately from the immediate local write.
    // Page-hide/logout paths call flushCloudSave().
    cloudSaveDebouncer.schedule(() =>
      saveCloudData(migrated, user).catch((error) => {
        console.warn("Author Hub cloud save failed; local cache is preserved.", error);
      }),
    );
  }
}

// Force any pending debounced cloud write to run immediately. Safe to call
// anytime (logout, tab hide/close, unmount); resolves when the write settles.
export function flushCloudSave() {
  return cloudSaveDebouncer.flush() ?? Promise.resolve();
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
  try {
    window.localStorage.setItem(storageKey(user), JSON.stringify(data));
  } catch (error) {
    try {
      window.localStorage.setItem(storageKey(user), JSON.stringify(createLocalCacheSnapshot(data)));
      console.warn("Author Hub local cache was compacted; inline media stays in cloud save.", error);
    } catch (compactError) {
      console.warn("Author Hub local cache is full; latest large media changes may not persist.", compactError);
    }
  }
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
  return (images ?? []).filter((image) => typeof image !== "string" || !image.startsWith("data:image/"));
}

async function ensureProfile(user) {
  await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      username: user.user_metadata?.username ?? user.email?.split("@")[0] ?? "writer",
      email: user.email ?? "",
      has_completed_tour: false,
    },
    { onConflict: "user_id" },
  );
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

async function fetchFromShimoOrMock() {
  return mockAuthorHubData;
}

function migrateData(data) {
  const novels = (data.novels?.length ? data.novels : mockAuthorHubData.novels).map((novel) => ({
    ...novel,
    urls: { ao3: "", jjwxc: "", qidian: "", qimao: "", fanqie: "", changpei: "", ...(novel.urls ?? {}) },
    characters: (novel.characters ?? []).map((character, index) => ({
      ...character,
      tag: character.tag ?? character.faction ?? inferCharacterTag(character, index),
      color: character.color ?? ["#8BA09C", "#DDA96A", "#A9A084", "#BFA57B", "#A7B8C8"][index % 5],
      images: character.images ?? [],
    })),
    relationships: novel.relationships ?? [],
    timeline: (novel.timeline ?? []).map((event) => ({ ...event, images: event.images ?? [] })),
  }));

  return {
    ...mockAuthorHubData,
    ...data,
    author: { ...mockAuthorHubData.author, ...(data.author ?? {}) },
    shimoFolders: data.shimoFolders?.length ? data.shimoFolders : mockAuthorHubData.shimoFolders,
    appearance: { ...mockAuthorHubData.appearance, ...(data.appearance ?? {}) },
    novels,
  };
}

function inferCharacterTag(character, index) {
  const role = character.role ?? "";
  if (index === 0 || /主角1|攻/.test(role)) return "主角1";
  if (index === 1 || /主角2|受/.test(role)) return "主角2";
  return "主要配角";
}
