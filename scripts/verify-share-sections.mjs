import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PUBLIC_SECTIONS,
  FULL_PUBLIC_SECTIONS,
  PRIVATE_CHARACTER_FIELDS_LIST,
  PUBLIC_STRIPPED_NOVEL_FIELDS_LIST,
  filterNovelForSections,
  normalizePublicSections,
} from "../src/lib/shareSections.js";
import { SHARE_ROLES, decorateSharedNovel } from "../src/lib/shareAdapter.js";

// The private-field allowlist is duplicated by necessity (JS can't import
// SQL): author_hub_strip_private_jsonb in the migration below is the real
// security boundary for the public anon-facing RPC, while the JS Set here is
// a client-side mirror used before a viewer-role novel ever reaches the
// server. Nothing enforces they stay identical except this check - if either
// list changes without the other, this must fail loudly instead of letting
// the two silently drift apart.
const MIGRATION_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase/migrations/20260701145543_author_hub_share_sections.sql");
const migrationSource = readFileSync(MIGRATION_PATH, "utf8");
const arrayLiteralMatch = migrationSource.match(/where key <> all\(array\[([^\]]+)\]\)/);
assert.ok(arrayLiteralMatch, `Could not find the private-field array literal in ${MIGRATION_PATH}; update this check if that SQL was refactored.`);
const sqlFields = arrayLiteralMatch[1].split(",").map((field) => field.trim().replace(/^'|'$/g, ""));
assert.deepEqual(
  [...sqlFields].sort(),
  [...PRIVATE_CHARACTER_FIELDS_LIST].sort(),
  "Private character field allowlist drifted between shareSections.js and the Supabase migration - update both together.",
);

// The novel-level public-strip list (urls/sourceLinks/word-counts/finish-date)
// lives in the sanitize_author_hub_public_novel migration as a `- '<field>'`
// chain and must stay identical to PUBLIC_STRIPPED_NOVEL_FIELDS_LIST.
const STRIP_MIGRATION_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase/migrations/20260705070628_author_hub_strip_author_links_from_public_share.sql",
);
const stripMigrationSource = readFileSync(STRIP_MIGRATION_PATH, "utf8");
const stripChainMatch = stripMigrationSource.match(/((?:-\s*'[^']+'\s*)+)as novel/);
assert.ok(stripChainMatch, `Could not find the public-strip '- field' chain in ${STRIP_MIGRATION_PATH}; update this check if that SQL was refactored.`);
const sqlStrippedFields = [...stripChainMatch[1].matchAll(/-\s*'([^']+)'/g)].map((m) => m[1]);
assert.deepEqual(
  [...sqlStrippedFields].sort(),
  [...PUBLIC_STRIPPED_NOVEL_FIELDS_LIST].sort(),
  "Public novel-level strip list drifted between shareSections.js and the Supabase migration - update both together.",
);

const sampleNovel = {
  id: "novel-1",
  title: "Shared Draft",
  subtitle: "A public slice",
  urls: { ao3: "https://archiveofourown.org/works/123" },
  sourceLinks: [{ label: "AO3", url: "https://archiveofourown.org/works/123" }],
  currentWords: 12345,
  targetWords: 90000,
  finishDate: "2026-12-31",
  outline: "Outline text",
  setting: "Setting text",
  themes: ["trust", "archive"],
  characters: [
    null,
    {
      id: "c1",
      name: "A",
      role: "lead",
      secret: "private",
      hidden: "also private",
      privateNote: "not for public",
    },
  ],
  relationships: [{ source: "c1", target: "c2", label: "friend" }],
  timeline: [{ id: "e1", title: "First event", plot: "plot", privateNote: "timeline secret" }],
  metadata: { hidden: "nested", public: "ok" },
};

assert.deepEqual(normalizePublicSections(["outline", "themes", "outline", "bad"]), ["outline", "themes"]);
assert.deepEqual(normalizePublicSections(null, { fallback: FULL_PUBLIC_SECTIONS }), FULL_PUBLIC_SECTIONS);
assert.deepEqual(DEFAULT_PUBLIC_SECTIONS, ["outline", "setting", "themes"]);

const coreOnly = filterNovelForSections(sampleNovel, DEFAULT_PUBLIC_SECTIONS);
assert.equal(coreOnly.outline, sampleNovel.outline);
assert.equal(coreOnly.setting, sampleNovel.setting);
assert.deepEqual(coreOnly.themes, sampleNovel.themes);
assert.deepEqual(coreOnly.characters, []);
assert.deepEqual(coreOnly.relationships, []);
assert.deepEqual(coreOnly.timeline, []);

const graphOnly = filterNovelForSections(sampleNovel, ["graph"]);
assert.deepEqual(graphOnly.characters[0], { id: "c1", name: "A", role: "lead" });
assert.equal(graphOnly.characters.length, 1, "null characters must be discarded from public share payloads");
assert.deepEqual(graphOnly.relationships, sampleNovel.relationships);
assert.deepEqual(graphOnly.timeline, []);
assert.equal(graphOnly.outline, "");

// Author-identifying platform links and progress metadata must be stripped
// even when every section is shared.
for (const field of PUBLIC_STRIPPED_NOVEL_FIELDS_LIST) {
  assert.equal(coreOnly[field], undefined, `${field} must be stripped from public share payloads`);
  assert.equal(filterNovelForSections(sampleNovel, FULL_PUBLIC_SECTIONS)[field], undefined, `${field} must be stripped even with all sections shared`);
}

const full = filterNovelForSections(sampleNovel, FULL_PUBLIC_SECTIONS);
assert.equal(full.characters[0].secret, undefined);
assert.equal(full.characters[0].hidden, undefined);
assert.equal(full.characters[0].privateNote, undefined);
assert.equal(full.timeline[0].privateNote, undefined);
assert.equal(full.timeline[0].title, "First event");
assert.deepEqual(full.metadata, { public: "ok" });

const editorSharedNovel = decorateSharedNovel({
  id: "shared-1",
  role: SHARE_ROLES.EDITOR,
  novel: {
    id: "source-1",
    title: "Shared Editor Draft",
    characters: [null, { id: "c2", name: "B", role: "主角" }],
    timeline: [null, { id: "e2", title: "Editor event" }],
  },
});

assert.equal(editorSharedNovel.characters.length, 1, "editor shared novels should discard null character entries before rendering");
assert.equal(editorSharedNovel.timeline.length, 1, "editor shared novels should discard null timeline entries before rendering");

console.log("share section checks passed");
