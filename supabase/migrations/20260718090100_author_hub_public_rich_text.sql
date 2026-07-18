-- Rich-text format data is private unless its matching public section is selected.
create or replace function public.sanitize_author_hub_public_novel(
  p_novel jsonb,
  p_sections text[] default null
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with cleaned as (
    select public.author_hub_strip_private_jsonb(coalesce(p_novel, '{}'::jsonb)) as novel
  ),
  base as (
    select cleaned.novel
      - 'urls'
      - 'sourceLinks'
      - 'currentWords'
      - 'targetWords'
      - 'finishDate'
      - 'focusPages'
      - 'richText' as novel
    from cleaned
  ),
  selected as (
    select coalesce(
      p_sections,
      array['outline', 'setting', 'themes', 'graph', 'characters', 'timeline']::text[]
    ) as sections
  )
  select jsonb_strip_nulls(
    base.novel
    || jsonb_build_object(
      'outline', case when 'outline' = any(selected.sections) then coalesce(cleaned.novel->>'outline', '') else '' end,
      'setting', case when 'setting' = any(selected.sections) then coalesce(cleaned.novel->>'setting', '') else '' end,
      'richText', jsonb_strip_nulls(jsonb_build_object(
        'outline', case when 'outline' = any(selected.sections) then cleaned.novel->'richText'->'outline' else null end,
        'setting', case when 'setting' = any(selected.sections) then cleaned.novel->'richText'->'setting' else null end
      )),
      'themes', case when 'themes' = any(selected.sections) then coalesce(cleaned.novel->'themes', '[]'::jsonb) else '[]'::jsonb end,
      'characters',
        case
          when 'characters' = any(selected.sections) then coalesce((
            select jsonb_agg(character order by ord)
            from jsonb_array_elements(coalesce(cleaned.novel->'characters', '[]'::jsonb)) with ordinality as item(character, ord)
          ), '[]'::jsonb)
          when 'graph' = any(selected.sections) then coalesce((
            select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'id', character->'id', 'name', character->'name', 'role', character->'role',
              'tag', character->'tag', 'faction', character->'faction', 'color', character->'color'
            )) order by ord)
            from jsonb_array_elements(coalesce(cleaned.novel->'characters', '[]'::jsonb)) with ordinality as item(character, ord)
          ), '[]'::jsonb)
          else '[]'::jsonb
        end,
      'relationships', case when 'graph' = any(selected.sections) then coalesce(cleaned.novel->'relationships', '[]'::jsonb) else '[]'::jsonb end,
      'timeline', case when 'timeline' = any(selected.sections) then coalesce(cleaned.novel->'timeline', '[]'::jsonb) else '[]'::jsonb end
    )
  )
  from selected, cleaned, base;
$$;

revoke all on function public.sanitize_author_hub_public_novel(jsonb, text[]) from public;
