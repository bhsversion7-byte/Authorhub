import fs from "node:fs";
import path from "node:path";

loadEnvFile(".env");
loadEnvFile(".env.local");

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pageSize = Math.max(1, Number.parseInt(process.argv.find((arg) => arg.startsWith("--page-size="))?.split("=")[1] ?? "50", 10) || 50);

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. This dry-run is read-only but needs admin read access.");
  process.exit(1);
}

let offset = 0;
let documentCount = 0;
let candidateCount = 0;
let totalJsonBytes = 0;
let candidateJsonBytes = 0;
let estimatedInlineBytes = 0;
const largestCandidates = [];

while (true) {
  const rows = await fetchDocuments(offset, pageSize);
  if (!rows.length) break;

  for (const row of rows) {
    documentCount += 1;
    const serialized = JSON.stringify(row.document ?? {});
    const jsonBytes = Buffer.byteLength(serialized, "utf8");
    const matches = [...serialized.matchAll(/data:image\/[^;"]+;base64,([A-Za-z0-9+/=]+)/g)];
    totalJsonBytes += jsonBytes;
    if (!matches.length) continue;

    const inlineBytes = matches.reduce((sum, match) => sum + estimateBase64Bytes(match[1]), 0);
    candidateCount += 1;
    candidateJsonBytes += jsonBytes;
    estimatedInlineBytes += inlineBytes;
    largestCandidates.push({
      id: shortId(row.id),
      userId: shortId(row.user_id),
      updatedAt: row.updated_at,
      jsonBytes,
      inlineImages: matches.length,
      estimatedInlineBytes: inlineBytes,
    });
  }

  if (rows.length < pageSize) break;
  offset += rows.length;
}

largestCandidates.sort((a, b) => b.estimatedInlineBytes - a.estimatedInlineBytes);

console.log(JSON.stringify(
  {
    mode: "dry-run",
    writes: 0,
    documentCount,
    candidateCount,
    totalJsonSize: prettyBytes(totalJsonBytes),
    candidateJsonSize: prettyBytes(candidateJsonBytes),
    estimatedInlineImagePayload: prettyBytes(estimatedInlineBytes),
    suggestedBatchSize: candidateCount > 10 ? "1-3 documents per batch" : "1 document first, then remaining candidates",
    largestCandidates: largestCandidates.slice(0, 10).map((candidate) => ({
      ...candidate,
      jsonSize: prettyBytes(candidate.jsonBytes),
      estimatedInlinePayload: prettyBytes(candidate.estimatedInlineBytes),
      jsonBytes: undefined,
      estimatedInlineBytes: undefined,
    })),
  },
  null,
  2,
));

async function fetchDocuments(from, limit) {
  const url = new URL(`${supabaseUrl}/rest/v1/author_hub_documents`);
  url.searchParams.set("select", "id,user_id,title,updated_at,document");
  url.searchParams.set("order", "updated_at.desc");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(from));

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase document scan failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function estimateBase64Bytes(value) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
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
