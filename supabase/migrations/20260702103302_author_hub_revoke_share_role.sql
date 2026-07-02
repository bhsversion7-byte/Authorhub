-- Explicit "撤回" (revoke) action: deletes the active link(s) for a role so
-- it stops working immediately, and, for editor, also removes every
-- non-owner editor's membership (existing joined collaborators lose access,
-- not just future joiners via that URL). Owner membership is never touched
-- since role is constrained to 'editor'/'viewer' below. Viewer access is
-- purely token-based (no membership row is ever created for viewers), so
-- deleting the link alone fully revokes it.
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
  if p_role not in ('editor', 'viewer') then
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

revoke all on function public.revoke_author_hub_share_role(uuid, text) from public;
grant execute on function public.revoke_author_hub_share_role(uuid, text) to authenticated;
