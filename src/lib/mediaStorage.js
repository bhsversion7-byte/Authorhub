import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

const MEDIA_BUCKET = "author-hub-media";

// Every UPDATE to a jsonb column rewrites the entire TOASTed value, so
// embedding images as base64 in the novel document meant every autosave
// rewrote several MB of data. Real images live in Storage instead; the
// document only ever holds a short URL string.

export async function uploadImageToStorage(file) {
  if (!hasSupabaseConfig || !supabase) return null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (error) {
    console.warn("AuthorHub image upload to storage failed; falling back to local embed.", error);
    return null;
  }
}

export function deleteImageFromStorage(url) {
  if (!hasSupabaseConfig || !supabase) return;
  const path = storagePathFromUrl(url);
  if (!path) return;
  supabase.storage
    .from(MEDIA_BUCKET)
    .remove([path])
    .catch((error) => console.warn("AuthorHub could not clean up a removed image.", error));
}

function storagePathFromUrl(url) {
  if (typeof url !== "string") return null;
  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

// Self-healing migration: documents saved before images moved to Storage
// still have data: URIs embedded. Whenever a signed-in user's document is
// loaded, quietly upload any embedded images to Storage and swap in the
// URL, so the next autosave stops rewriting the multi-MB blob. Runs with
// the user's own session, so it can only ever touch their own document.
export async function migrateEmbeddedImagesToStorage(data) {
  if (!hasSupabaseConfig || !supabase) return { data, changed: false };

  // The overwhelming majority of loads have nothing to migrate (this only
  // ever matters once, for documents saved before Storage existed), but the
  // code below used to unconditionally build a Promise.all per character and
  // per timeline event to find that out - real cost on every login/reload
  // for an author with many novels. A single cheap string scan rules out the
  // common case before paying for any of that.
  if (!JSON.stringify(data.novels ?? []).includes('"data:image/')) {
    return { data, changed: false };
  }

  let changed = false;
  const novels = await Promise.all(
    (data.novels ?? []).map(async (novel) => {
      const characters = await Promise.all((novel.characters ?? []).map((character) => migrateImageList(character)));
      const timeline = await Promise.all((novel.timeline ?? []).map((event) => migrateImageList(event)));
      if (characters.some((c) => c.changed) || timeline.some((t) => t.changed)) changed = true;
      return {
        ...novel,
        characters: characters.map((c) => c.entity),
        timeline: timeline.map((t) => t.entity),
      };
    }),
  );

  if (!changed) return { data, changed: false };
  return { data: { ...data, novels }, changed: true };
}

async function migrateImageList(entity) {
  const images = entity?.images ?? [];
  if (!images.some((image) => typeof image?.src === "string" && image.src.startsWith("data:image/"))) {
    return { entity, changed: false };
  }

  let changed = false;
  const nextImages = await Promise.all(
    images.map(async (image) => {
      if (typeof image?.src !== "string" || !image.src.startsWith("data:image/")) return image;
      const file = dataUrlToFile(image.src, image.alt || image.id || "image");
      if (!file) return image;
      const url = await uploadImageToStorage(file);
      if (!url) return image;
      changed = true;
      return { ...image, src: url };
    }),
  );

  return { entity: changed ? { ...entity, images: nextImages } : entity, changed };
}

function dataUrlToFile(dataUrl, name) {
  const match = /^data:(image\/[\w+.-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match;
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const ext = mime.split("/")[1] || "jpg";
    return new File([bytes], `${name}.${ext}`, { type: mime });
  } catch (error) {
    console.warn("AuthorHub could not decode an embedded image for migration.", error);
    return null;
  }
}
