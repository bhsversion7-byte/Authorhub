alter table public.author_hub_share_links
add column if not exists public_sections text[];

drop function if exists public.sanitize_author_hub_public_novel(jsonb);
drop function if exists public.author_hub_strip_private_jsonb(jsonb);

create or replace function public.author_hub_strip_private_jsonb(p_value jsonb)
returns jsonb
language sql
immutable
as $$
  select case jsonb_typeof(p_value)
    when 'object' then coalesce(
      (
        select jsonb_object_agg(key, public.author_hub_strip_private_jsonb(value))
        from jsonb_each(p_value)
        where key <> all(array['secret', 'hidden', 'privateNote'])
      ),
      '{}'::jsonb
    )
    when 'array' then coalesce(
      (
        select jsonb_agg(public.author_hub_strip_private_jsonb(value) order by ord)
        from jsonb_array_elements(p_value) with ordinality as item(value, ord)
      ),
      '[]'::jsonb
    )
    else p_value
  end;
$$;

create or replace function public.sanitize_author_hub_public_novel(
  p_novel jsonb,
  p_sections text[] default null
)
returns jsonb
language sql
stable
as $$
  with cleaned as (
    select public.author_hub_strip_private_jsonb(coalesce(p_novel, '{}'::jsonb)) as novel
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

-- PostgreSQL cannot change a table-returning function's OUT columns with
-- CREATE OR REPLACE. Drop the six-column version from the sharing migration
-- before recreating it with public_sections as the seventh column.
drop function if exists public.get_author_hub_shared_novel_by_token(text);

create or replace function public.get_author_hub_shared_novel_by_token(p_token text)
returns table (
  id uuid,
  source_novel_id text,
  role text,
  novel jsonb,
  collaborator_count integer,
  updated_at timestamptz,
  public_sections text[]
)
language sql
security definer
set search_path = public
as $$
  select
    shared.id,
    shared.source_novel_id,
    'viewer'::text as role,
    public.sanitize_author_hub_public_novel(shared.novel, link.public_sections),
    (select count(*)::integer from public.author_hub_share_members member where member.shared_novel_id = shared.id),
    shared.updated_at,
    coalesce(
      link.public_sections,
      array['outline', 'setting', 'themes', 'graph', 'characters', 'timeline']::text[]
    )
  from public.author_hub_share_links link
  join public.author_hub_shared_novels shared on shared.id = link.shared_novel_id
  where link.token = p_token
    and link.role = 'viewer'
    and link.is_active = true
  limit 1;
$$;

revoke all on function public.sanitize_author_hub_public_novel(jsonb, text[]) from public;
revoke all on function public.author_hub_strip_private_jsonb(jsonb) from public;
revoke all on function public.get_author_hub_shared_novel_by_token(text) from public;

grant execute on function public.get_author_hub_shared_novel_by_token(text) to anon, authenticated;
