-- sanitize_author_hub_public_novel merged the whole novel object and only
-- overrode the six section keys, so top-level fields like `urls`/`sourceLinks`
-- (the author's external 首发平台 pages - AO3/晋江/起点...) and the
-- word-count/finish-date progress metadata rode through to anonymous viewers
-- regardless of which sections were shared. Showing an author's other-platform
-- links on an otherwise-anonymous outline share deanonymizes them. Strip those
-- top-level keys from the anon payload. Kept in lockstep with
-- PUBLIC_STRIPPED_NOVEL_FIELDS_LIST in src/lib/shareSections.js
-- (verify:share asserts the two lists match).
create or replace function public.sanitize_author_hub_public_novel(
  p_novel jsonb,
  p_sections text[] default null
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with cleaned as (
    select public.author_hub_strip_private_jsonb(coalesce(p_novel, '{}'::jsonb))
      - 'urls' - 'sourceLinks' - 'currentWords' - 'targetWords' - 'finishDate' as novel
  ),
  selected as (
    select coalesce(
      p_sections,
      array['outline', 'setting', 'themes', 'graph', 'characters', 'timeline']::text[]
    ) as sections
  )
  select jsonb_strip_nulls(
    cleaned.novel
    || jsonb_build_object(
      'outline',
        case when 'outline' = any(selected.sections) then coalesce(cleaned.novel->>'outline', '') else '' end,
      'setting',
        case when 'setting' = any(selected.sections) then coalesce(cleaned.novel->>'setting', '') else '' end,
      'themes',
        case when 'themes' = any(selected.sections) then coalesce(cleaned.novel->'themes', '[]'::jsonb) else '[]'::jsonb end,
      'characters',
        case
          when 'characters' = any(selected.sections) then coalesce(
            (
              select jsonb_agg(character order by ord)
              from jsonb_array_elements(coalesce(cleaned.novel->'characters', '[]'::jsonb)) with ordinality as item(character, ord)
            ),
            '[]'::jsonb
          )
          when 'graph' = any(selected.sections) then coalesce(
            (
              select jsonb_agg(
                jsonb_strip_nulls(jsonb_build_object(
                  'id', character->'id',
                  'name', character->'name',
                  'role', character->'role',
                  'tag', character->'tag',
                  'faction', character->'faction',
                  'color', character->'color'
                ))
                order by ord
              )
              from jsonb_array_elements(coalesce(cleaned.novel->'characters', '[]'::jsonb)) with ordinality as item(character, ord)
            ),
            '[]'::jsonb
          )
          else '[]'::jsonb
        end,
      'relationships',
        case when 'graph' = any(selected.sections) then coalesce(cleaned.novel->'relationships', '[]'::jsonb) else '[]'::jsonb end,
      'timeline',
        case when 'timeline' = any(selected.sections) then coalesce(cleaned.novel->'timeline', '[]'::jsonb) else '[]'::jsonb end
    )
  )
  from selected, cleaned;
$$;

revoke all on function public.sanitize_author_hub_public_novel(jsonb, text[]) from public;
