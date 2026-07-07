-- CRITICAL FIX: save_author_hub_shared_novel's permission check silently
-- passed for non-members.
--
-- `select role into v_role from author_hub_share_members where ...` leaves
-- v_role as SQL NULL when the caller has no membership row at all (not just
-- when they're a viewer). The original guard was:
--
--   if v_role not in ('owner', 'editor') then raise exception ...; end if;
--
-- In PL/pgSQL, `NULL NOT IN (...)` evaluates to NULL, and `IF NULL THEN`
-- is treated as false - so the exception was never raised, and execution
-- fell through to the UPDATE, silently overwriting the shared novel's
-- content. Since this RPC is SECURITY DEFINER and RLS grants UPDATE on
-- author_hub_shared_novels to no one (this function is the only write
-- path), this check was the sole gate against writes - and it did not
-- actually gate anything for a non-member.
--
-- This was exploitable by any authenticated user, not just prior
-- collaborators: get_author_hub_shared_novel_by_token (used by every
-- read-only public share page) returns the real shared_novel_id to anyone
-- who opens a share link, including anonymous visitors. Any signed-in
-- AuthorHub account could then call this RPC directly with that id and
-- overwrite the owner's manuscript with arbitrary content, with no
-- membership of any kind required.
create or replace function public.save_author_hub_shared_novel(
  p_shared_novel_id uuid,
  p_novel jsonb,
  p_expected_updated_at timestamptz
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
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_current_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select member.role
  into v_role
  from public.author_hub_share_members member
  where member.shared_novel_id = p_shared_novel_id
    and member.user_id = v_user_id
  limit 1;

  if v_role is null or v_role not in ('owner', 'editor') then
    raise exception 'edit permission required';
  end if;

  select shared.updated_at
  into v_current_updated_at
  from public.author_hub_shared_novels shared
  where shared.id = p_shared_novel_id
  for update;

  if v_current_updated_at is null then
    raise exception 'shared novel not found';
  end if;

  if p_expected_updated_at is not null and v_current_updated_at <> p_expected_updated_at then
    raise exception 'stale shared novel version';
  end if;

  update public.author_hub_shared_novels shared
  set
    title = coalesce(nullif(p_novel->>'title', ''), 'Untitled novel'),
    novel = p_novel
  where shared.id = p_shared_novel_id;

  return query
  select
    shared.id,
    shared.source_novel_id,
    v_role as role,
    shared.novel,
    (select count(*)::integer from public.author_hub_share_members count_member where count_member.shared_novel_id = shared.id),
    shared.updated_at
  from public.author_hub_shared_novels shared
  where shared.id = p_shared_novel_id;
end;
$$;

-- Same NULL-swallowing anti-pattern, defense-in-depth only: p_role here
-- is not attacker-influenced in a way that bypasses this function's real
-- gate (author_hub_can_access_shared_novel, an EXISTS-based check that
-- doesn't share this bug), but a NULL p_role should still be rejected
-- outright rather than silently falling through to a delete that matches
-- zero rows.
create or replace function public.revoke_author_hub_share_role(
  p_shared_novel_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role is null or p_role not in ('editor', 'viewer') then
    raise exception 'invalid share role: %', p_role;
  end if;

  if not public.author_hub_can_access_shared_novel(p_shared_novel_id, array['owner', 'editor']) then
    raise exception 'not authorized to revoke this share role';
  end if;

  delete from public.author_hub_share_links
  where shared_novel_id = p_shared_novel_id
    and role = p_role;

  if p_role = 'editor' then
    delete from public.author_hub_share_members
    where shared_novel_id = p_shared_novel_id
      and role = 'editor';
  end if;
end;
$$;

revoke all on function public.save_author_hub_shared_novel(uuid, jsonb, timestamptz) from anon, authenticated, public;
grant execute on function public.save_author_hub_shared_novel(uuid, jsonb, timestamptz) to authenticated;

revoke all on function public.revoke_author_hub_share_role(uuid, text) from anon, authenticated, public;
grant execute on function public.revoke_author_hub_share_role(uuid, text) to authenticated;
