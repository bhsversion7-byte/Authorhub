import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PUBLIC_SECTIONS,
  FULL_PUBLIC_SECTIONS,
  PRIVATE_CHARACTER_FIELDS_LIST,
  filterNovelForSections,
  normalizePublicSections,
} from "../src/lib/shareSections.js";

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

const sampleNovel = {
  id: "novel-1",
  title: "Shared Draft",
  subtitle: "A public slice",
  outline: "Outline text",
  setting: "Setting text",
  themes: ["trust", "archive"],
  characters: [
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
assert.deepEqual(graphOnly.relationships, sampleNovel.relationships);
assert.deepEqual(graphOnly.timeline, []);
assert.equal(graphOnly.outline, "");

const full = filterNovelForSections(sampleNovel, FULL_PUBLIC_SECTIONS);
assert.equal(full.characters[0].secret, undefined);
assert.equal(full.characters[0].hidden, undefined);
assert.equal(full.characters[0].privateNote, undefined);
assert.equal(full.timeline[0].privateNote, undefined);
assert.equal(full.timeline[0].title, "First event");
assert.deepEqual(full.metadata, { public: "ok" });

console.log("share section checks passed");
