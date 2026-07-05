export const SHAREABLE_SECTIONS = [
  { id: "outline", label: "大纲" },
  { id: "setting", label: "设定集" },
  { id: "themes", label: "主题标签" },
  { id: "graph", label: "星图" },
  { id: "characters", label: "人物详情" },
  { id: "timeline", label: "时间线" },
];

export const FULL_PUBLIC_SECTIONS = SHAREABLE_SECTIONS.map((section) => section.id);
export const DEFAULT_PUBLIC_SECTIONS = ["outline", "setting", "themes"];

const VALID_SECTION_IDS = new Set(FULL_PUBLIC_SECTIONS);

// Kept in lockstep with the identical array['secret', 'hidden', 'privateNote']
// literal in supabase/migrations/20260701145543_author_hub_share_sections.sql
// (author_hub_strip_private_jsonb) - that SQL copy is the real security
// boundary for the public anon-facing RPC, this one is a client-side mirror
// used before a viewer-role novel is even sent to the server. The two can't
// share one source of truth across languages, so scripts/verify-share-sections
// asserts they stay identical instead of letting them silently drift apart.
export const PRIVATE_CHARACTER_FIELDS_LIST = ["secret", "hidden", "privateNote"];
const PRIVATE_CHARACTER_FIELDS = new Set(PRIVATE_CHARACTER_FIELDS_LIST);
const GRAPH_CHARACTER_FIELDS = new Set(["id", "name", "role", "tag", "faction", "color"]);
// Novel-level fields that must never reach an anonymous public viewer, even
// for sections they were granted. `urls`/`sourceLinks` are the author's
// external 首发平台 pages (AO3/晋江/起点...) - showing those on an
// otherwise-anonymous outline share deanonymizes the author across
// platforms. The word-count/finish-date fields are progress metadata the
// author may not want attached to a public preview. Section gating alone
// didn't cover these because the sanitizer merges the whole novel object and
// only overrides the six section keys - these top-level keys rode through.
// Kept in lockstep with the identical `- '<field>'` chain in the
// sanitize_author_hub_public_novel migration (the real anon-RPC security
// boundary); scripts/verify-share-sections asserts they stay identical.
export const PUBLIC_STRIPPED_NOVEL_FIELDS_LIST = ["urls", "sourceLinks", "currentWords", "targetWords", "finishDate"];
const PUBLIC_STRIPPED_NOVEL_FIELDS = new Set(PUBLIC_STRIPPED_NOVEL_FIELDS_LIST);

export function normalizePublicSections(sections, options = {}) {
  const fallback = options.fallback ?? DEFAULT_PUBLIC_SECTIONS;
  if (!Array.isArray(sections)) return [...fallback];
  const normalized = sections.filter((section) => VALID_SECTION_IDS.has(section));
  return Array.from(new Set(normalized));
}

export function filterNovelForSections(novel, sections) {
  const selected = new Set(normalizePublicSections(sections, { fallback: FULL_PUBLIC_SECTIONS }));
  const includeGraph = selected.has("graph");
  const includeCharacters = selected.has("characters");
  const strippedNovel = removePrivateFields(novel ?? {});
  const publicNovel = Object.fromEntries(
    Object.entries(strippedNovel).filter(([key]) => !PUBLIC_STRIPPED_NOVEL_FIELDS.has(key)),
  );

  return {
    ...publicNovel,
    outline: selected.has("outline") ? publicNovel.outline ?? "" : "",
    setting: selected.has("setting") ? publicNovel.setting ?? "" : "",
    themes: selected.has("themes") ? publicNovel.themes ?? [] : [],
    characters:
      includeCharacters || includeGraph
        ? (publicNovel.characters ?? []).map((character) => sanitizeCharacter(character, { graphOnly: includeGraph && !includeCharacters }))
        : [],
    relationships: includeGraph ? publicNovel.relationships ?? [] : [],
    timeline: selected.has("timeline") ? publicNovel.timeline ?? [] : [],
  };
}

function sanitizeCharacter(character, options = {}) {
  const source = character ?? {};
  if (options.graphOnly) {
    return Object.fromEntries(Object.entries(source).filter(([key, value]) => GRAPH_CHARACTER_FIELDS.has(key) && value !== undefined));
  }
  return Object.fromEntries(Object.entries(source).filter(([key]) => !PRIVATE_CHARACTER_FIELDS.has(key)));
}

function removePrivateFields(value) {
  if (Array.isArray(value)) return value.map(removePrivateFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_CHARACTER_FIELDS.has(key))
      .map(([key, entryValue]) => [key, removePrivateFields(entryValue)]),
  );
}
