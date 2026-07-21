-- Owners need a distinct, authoritative delete path. Leaving a shared
-- workspace is correct for collaborators, but it must never turn an owner's
-- permanent-delete action into an invisible membership removal that leaves
-- links and collaborator access behind.

create or replace function public.delete_author_hub_owned_shared_novel(
  p_shared_novel_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_source_novel_id text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  -- The owner_id check is made inside the SECURITY DEFINER function, so an
  -- editor cannot delete a workspace merely by knowing its UUID. Lock the
  -- workspace first so its source id cannot change between the document and
  -- workspace deletes.
  select source_novel_id
  into v_source_novel_id
  from public.author_hub_shared_novels
  where id = p_shared_novel_id
    and owner_id = v_user_id
  for update;

  if v_source_novel_id is null then
    raise exception 'only the shared novel owner can delete this workspace';
  end if;

  -- The owner's private document and the collaboration workspace represent
  -- one manuscript. Update them in this same transaction: otherwise a
  -- network failure between two client-side writes could resurrect an old
  -- private copy or leave collaborators in an orphaned workspace.
  update public.author_hub_documents
  set document = jsonb_set(
    document,
    '{novels}',
    coalesce(
      (
        select jsonb_agg(item.novel)
        from jsonb_array_elements(coalesce(document->'novels', '[]'::jsonb)) as item(novel)
        where item.novel->>'id' <> v_source_novel_id
      ),
      '[]'::jsonb
    ),
    true
  )
  where user_id = v_user_id
    and title = 'default-author-hub';

  delete from public.author_hub_shared_novels
  where id = p_shared_novel_id
    and owner_id = v_user_id;

  -- Both author_hub_share_members and author_hub_share_links reference this
  -- row with ON DELETE CASCADE. Deleting the workspace therefore atomically
  -- revokes collaborator memberships and all public/editor links.
end;
$$;

revoke all on function public.delete_author_hub_owned_shared_novel(uuid) from public, anon;
grant execute on function public.delete_author_hub_owned_shared_novel(uuid) to authenticated;
