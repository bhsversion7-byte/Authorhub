-- list_author_hub_shared_novels() ran a correlated count(*) subquery against
-- author_hub_share_members once per returned row - an N+1 query pattern for
-- a user who belongs to many shared novels. The other sharing RPCs
-- (ensure/join/save/get_by_token) return at most one row each, so their
-- identical correlated subquery is a single extra scan, not N+1 - only this
-- one actually needed the fix. Same return shape, so no drop needed first.

create or replace function public.list_author_hub_shared_novels()
returns table (
  id uuid,
  source_novel_id text,
  role text,
  novel jsonb,
  collaborator_count integer,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    shared.id,
    shared.source_novel_id,
    member.role,
    shared.novel,
    coalesce(counts.collaborator_count, 0),
    shared.updated_at
  from public.author_hub_shared_novels shared
  join public.author_hub_share_members member on member.shared_novel_id = shared.id
  left join (
    select shared_novel_id, count(*)::integer as collaborator_count
    from public.author_hub_share_members
    group by shared_novel_id
  ) counts on counts.shared_novel_id = shared.id
  where member.user_id = auth.uid()
  order by shared.updated_at desc;
$$;
