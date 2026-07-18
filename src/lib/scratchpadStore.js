import { createRichTextDocument, richTextToPlainText } from "./richTextModel.js";
import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

const STORAGE_PREFIX = "author-hub-scratchpad-v1";

export function createEmptyScratchpad() {
  const note = createRichTextDocument(undefined, "");
  return {
    note,
    mindMap: { nodes: [], edges: [] },
    activeMode: "note",
    revision: 0,
    updatedAt: null,
    clientUpdatedAt: null,
    pendingSync: false,
  };
}

export async function loadScratchpad(user) {
  const local = readLocalScratchpad(user);
  if (!canUseCloudScratchpad(user)) return local;

  try {
    const { data, error } = await supabase
      .from("author_hub_scratchpads")
      .select("note_html, note_text, mind_map, active_mode, revision, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return local;
    const scratchpad = fromRow(data);
    if (local.pendingSync || isNewerLocalCopy(local, scratchpad)) return local;
    writeLocalScratchpad(scratchpad, user);
    return scratchpad;
  } catch (error) {
    console.warn("Author Hub scratchpad cloud load failed; using local copy.", error);
    return local;
  }
}

export async function saveScratchpad(scratchpad, user) {
  const next = normalizeScratchpad(scratchpad);
  writeLocalScratchpad(next, user);
  if (!canUseCloudScratchpad(user)) {
    const savedLocally = { ...next, pendingSync: false };
    writeLocalScratchpad(savedLocally, user);
    return { scratchpad: savedLocally, conflict: false };
  }

  const payload = toRow(next);
  try {
    if (next.revision > 0) {
      const { data, error } = await supabase
        .from("author_hub_scratchpads")
        .update({ ...payload, revision: next.revision + 1 })
        .eq("user_id", user.id)
        .eq("revision", next.revision)
        .select("note_html, note_text, mind_map, active_mode, revision, updated_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) return { scratchpad: { ...next, pendingSync: true }, conflict: true };
      const saved = { ...fromRow(data), clientUpdatedAt: next.clientUpdatedAt, pendingSync: false };
      writeLocalScratchpadUnlessNewerPending(saved, user);
      return { scratchpad: saved, conflict: false };
    }

    const { data, error } = await supabase
      .from("author_hub_scratchpads")
      .insert({ user_id: user.id, ...payload, revision: 1 })
      .select("note_html, note_text, mind_map, active_mode, revision, updated_at")
      .single();
    if (error) {
      if (error.code === "23505") return { scratchpad: { ...next, pendingSync: true }, conflict: true };
      throw error;
    }
    const saved = { ...fromRow(data), clientUpdatedAt: next.clientUpdatedAt, pendingSync: false };
    writeLocalScratchpadUnlessNewerPending(saved, user);
    return { scratchpad: saved, conflict: false };
  } catch (error) {
    console.warn("Author Hub scratchpad cloud save failed; local copy is preserved.", error);
    const pending = { ...next, pendingSync: true };
    writeLocalScratchpadUnlessNewerPending(pending, user);
    return { scratchpad: pending, conflict: false, error };
  }
}

export function cacheScratchpad(scratchpad, user) {
  const next = {
    ...normalizeScratchpad(scratchpad),
    clientUpdatedAt: new Date().toISOString(),
    pendingSync: true,
  };
  writeLocalScratchpad(next, user);
  return next;
}

function fromRow(row) {
  return normalizeScratchpad({
    note: { version: 1, html: row.note_html || "" },
    mindMap: row.mind_map,
    activeMode: row.active_mode,
    revision: row.revision,
    updatedAt: row.updated_at,
  });
}

function toRow(scratchpad) {
  return {
    note_html: scratchpad.note.html,
    note_text: richTextToPlainText(scratchpad.note),
    mind_map: scratchpad.mindMap,
    active_mode: scratchpad.activeMode,
  };
}

function normalizeScratchpad(value) {
  const note = createRichTextDocument(value?.note, "");
  return {
    note,
    mindMap: {
      nodes: Array.isArray(value?.mindMap?.nodes) ? value.mindMap.nodes : [],
      edges: Array.isArray(value?.mindMap?.edges) ? value.mindMap.edges : [],
    },
    activeMode: value?.activeMode === "map" ? "map" : "note",
    revision: Number.isFinite(Number(value?.revision)) ? Number(value.revision) : 0,
    updatedAt: value?.updatedAt || null,
    clientUpdatedAt: value?.clientUpdatedAt || value?.updatedAt || null,
    pendingSync: Boolean(value?.pendingSync),
  };
}

function localKey(user) {
  return `${STORAGE_PREFIX}:${user?.id || "local"}`;
}

function readLocalScratchpad(user) {
  try {
    const raw = localStorage.getItem(localKey(user));
    return raw ? normalizeScratchpad(JSON.parse(raw)) : createEmptyScratchpad();
  } catch {
    return createEmptyScratchpad();
  }
}

function writeLocalScratchpad(scratchpad, user) {
  try {
    localStorage.setItem(localKey(user), JSON.stringify(normalizeScratchpad(scratchpad)));
  } catch {
    // Quota errors should not stop the editor's in-memory state.
  }
}

function writeLocalScratchpadUnlessNewerPending(scratchpad, user) {
  const local = readLocalScratchpad(user);
  if (local.pendingSync && isNewerLocalCopy(local, scratchpad)) return;
  writeLocalScratchpad(scratchpad, user);
}

function canUseCloudScratchpad(user) {
  return Boolean(hasSupabaseConfig && supabase && user?.id && !String(user.id).startsWith("local-") && !String(user.id).includes("@"));
}

function isNewerLocalCopy(local, cloud) {
  const localTime = Date.parse(local.clientUpdatedAt || local.updatedAt || "");
  const cloudTime = Date.parse(cloud.updatedAt || "");
  return Number.isFinite(localTime) && Number.isFinite(cloudTime) && localTime > cloudTime;
}
