create or replace function public.ensure_author_hub_shared_novel(
  p_source_novel_id text,
  p_novel jsonb
)
returns table (
  id uuid,
  source_novel_id text,
  role text,
  novel jsonb,
  collaborator_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_shared_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  insert into public.author_hub_shared_novels (owner_id, source_novel_id, title, novel)
  values (v_user_id, p_source_novel_id, coalesce(nullif(p_novel->>'title', ''), 'Untitled novel'), p_novel)
  on conflict (owner_id, source_novel_id) do nothing
  returning author_hub_shared_novels.id into v_shared_id;

  if v_shared_id is null then
    select shared.id
    into v_shared_id
    from public.author_hub_shared_novels shared
    where shared.owner_id = v_user_id
      and shared.source_novel_id = p_source_novel_id
    limit 1;
  end if;

  insert into public.author_hub_share_members (shared_novel_id, user_id, role)
  values (v_shared_id, v_user_id, 'owner')
  on conflict (shared_novel_id, user_id)
  do update set role = 'owner';

  return query
  select
    shared.id,
    shared.source_novel_id,
    'owner'::text as role,
    shared.novel,
    (select count(*)::integer from public.author_hub_share_members member where member.shared_novel_id = shared.id),
    shared.updated_at
  from public.author_hub_shared_novels shared
  where shared.id = v_shared_id;
end;
$$;

revoke all on function public.ensure_author_hub_shared_novel(text, jsonb) from public;
grant execute on function public.ensure_author_hub_shared_novel(text, jsonb) to authenticated;
