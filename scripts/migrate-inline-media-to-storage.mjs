import fs from "node:fs";
import path from "node:path";

// Uploads embedded base64 images (in author_hub_documents.document) to the
// author-hub-media Storage bucket and rewrites the document to reference the
// resulting URL instead - a server-side, one-time version of the same
// self-healing migration mediaStorage.js already runs client-side on load,
// for accounts whose documents haven't been reloaded since the bucket
// started existing.
//
// Defaults to dry-run (no writes at all, not even reads beyond the initial
// scan). Pass --apply to actually upload + update rows. Always run without
// --apply first and read the output before adding it.

loadEnvFile(".env");
loadEnvFile(".env.local");

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes("--apply");
const bucket = "author-hub-media";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (never commit it) before running this.");
  process.exit(1);
}

const rows = await fetchCandidateDocuments();
console.log(`Found ${rows.length} document(s) with embedded base64 images. Mode: ${apply ? "APPLY (will write)" : "DRY RUN (no writes)"}`);

let totalImagesMigrated = 0;
let totalRowsChanged = 0;
let totalBytesReclaimed = 0;

for (const row of rows) {
  const before = Buffer.byteLength(JSON.stringify(row.document), "utf8");
  const result = migrateDocumentImages(row.document);
  if (result.changedCount === 0) {
    console.log(`  [skip] ${shortId(row.id)} - no embeddable images found (already migrated or unrecognized format)`);
    continue;
  }

  if (!apply) {
    // Nothing actually gets uploaded in dry-run, so resolve each src to a
    // realistic placeholder URL (same shape a real upload would produce)
    // purely to make the reported before/after sizes reflect the real
    // projected savings instead of showing no change at all.
    for (const upload of result.uploads) upload.resolve(placeholderUrl(upload.userId, upload.mime));
    const after = Buffer.byteLength(JSON.stringify(result.document), "utf8");
    console.log(
      `  [would-migrate] ${shortId(row.id)} user=${shortId(row.user_id)} images=${result.changedCount} ${prettyBytes(before)} -> ${prettyBytes(after)}`,
    );
    totalImagesMigrated += result.changedCount;
    totalRowsChanged += 1;
    totalBytesReclaimed += before - after;
    continue;
  }

  for (const upload of result.uploads) {
    const uploaded = await uploadToStorage(upload.userId, upload.mime, upload.bytes);
    if (!uploaded) {
      console.error(`    ! upload failed for one image in ${shortId(row.id)} - leaving that image embedded, continuing with the rest`);
      continue;
    }
    upload.resolve(uploaded);
  }

  const after = Buffer.byteLength(JSON.stringify(result.document), "utf8");
  console.log(
    `  [migrate] ${shortId(row.id)} user=${shortId(row.user_id)} images=${result.changedCount} ${prettyBytes(before)} -> ${prettyBytes(after)}`,
  );

  const writeOk = await updateDocument(row.id, result.document);
  if (!writeOk) {
    console.error(`    ! failed to save updated document for ${shortId(row.id)} - images were uploaded to Storage but the row was NOT updated (safe to re-run, orphaned uploads are harmless)`);
    continue;
  }

  totalImagesMigrated += result.changedCount;
  totalRowsChanged += 1;
  totalBytesReclaimed += before - after;
}

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      rowsScanned: rows.length,
      rowsChanged: totalRowsChanged,
      imagesMigrated: totalImagesMigrated,
      estimatedBytesReclaimed: prettyBytes(totalBytesReclaimed),
    },
    null,
    2,
  ),
);

function migrateDocumentImages(document) {
  let changedCount = 0;
  const uploads = [];

  function walkImages(entity, userId) {
    if (!Array.isArray(entity?.images)) return entity;
    let entityChanged = false;
    const nextImages = entity.images.map((image) => {
      const match = typeof image?.src === "string" ? /^data:(image\/[\w+.-]+);base64,(.*)$/.exec(image.src) : null;
      if (!match) return image;
      const [, mime, base64] = match;
      let bytes;
      try {
        bytes = Buffer.from(base64, "base64");
      } catch {
        return image;
      }
      entityChanged = true;
      changedCount += 1;
      const nextImage = { ...image };
      uploads.push({
        userId,
        mime,
        bytes,
        resolve: (url) => {
          nextImage.src = url;
        },
      });
      return nextImage;
    });
    return entityChanged ? { ...entity, images: nextImages } : entity;
  }

  const novels = (document?.novels ?? []).map((novel) => ({
    ...novel,
    characters: (novel.characters ?? []).map((character) => walkImages(character, document._ownerId)),
    timeline: (novel.timeline ?? []).map((event) => walkImages(event, document._ownerId)),
  }));

  return { document: changedCount ? { ...document, novels } : document, changedCount, uploads };
}

async function fetchCandidateDocuments() {
  // Filters client-side after paging through everything, same as the
  // existing dry-run script - only ~1500 rows total, and this sidesteps any
  // uncertainty about whether PostgREST's REST filter syntax pattern-matches
  // a jsonb column the way a raw SQL `::text ilike` would.
  const pageSize = 50;
  const candidates = [];
  let offset = 0;
  while (true) {
    const url = new URL(`${supabaseUrl}/rest/v1/author_hub_documents`);
    url.searchParams.set("select", "id,user_id,document");
    url.searchParams.set("order", "id.asc");
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));
    const response = await fetch(url, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!response.ok) throw new Error(`Scan failed: ${response.status} ${await response.text()}`);
    const rows = await response.json();
    if (!rows.length) break;
    for (const row of rows) {
      if (JSON.stringify(row.document ?? {}).includes('"data:image/')) {
        // Stamp the owning user id onto the document so walkImages can build
        // a per-user Storage path without changing this function's shape.
        candidates.push({ ...row, document: { ...row.document, _ownerId: row.user_id } });
      }
    }
    if (rows.length < pageSize) break;
    offset += rows.length;
  }
  return candidates;
}

function placeholderUrl(userId, mime) {
  const ext = (mime.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${userId}/${crypto.randomUUID()}.${ext}`;
}

async function uploadToStorage(userId, mime, bytes) {
  const ext = (mime.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
  const objectPath = `${userId}/${crypto.randomUUID()}.${ext}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": mime,
      "x-upsert": "false",
    },
    body: bytes,
  });
  if (!response.ok) {
    console.error(`      upload error ${response.status}: ${await response.text()}`);
    return null;
  }
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

async function updateDocument(id, document) {
  const { _ownerId, ...cleanDocument } = document;
  const response = await fetch(`${supabaseUrl}/rest/v1/author_hub_documents?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ document: cleanDocument }),
  });
  if (!response.ok) {
    console.error(`      update error ${response.status}: ${await response.text()}`);
    return false;
  }
  return true;
}

function shortId(value) {
  return String(value ?? "").slice(0, 8);
}

function prettyBytes(bytes) {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function loadEnvFile(fileName) {
  const filePath = path.resolve(fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}
