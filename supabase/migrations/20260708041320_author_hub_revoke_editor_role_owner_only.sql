-- Tighten revoke_author_hub_share_role: any editor could previously revoke
-- the shared "editor" role, kicking out every other editor collaborator
-- without the owner's consent. Revoking the editor role (which removes
-- collaborators, not just a link) is now owner-only; revoking the
-- read-only viewer link stays available to owner + editor as before.
create or replace function public.revoke_author_hub_share_role(p_shared_novel_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_role is null or p_role not in ('editor', 'viewer') then
    raise exception 'invalid share role: %', p_role;
  end if;

  if p_role = 'editor' then
    if not public.author_hub_can_access_shared_novel(p_shared_novel_id, array['owner']) then
      raise exception 'not authorized to revoke this share role';
    end if;
  else
    if not public.author_hub_can_access_shared_novel(p_shared_novel_id, array['owner', 'editor']) then
      raise exception 'not authorized to revoke this share role';
    end if;
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
$function$;
