-- Real account deletion for the "注销账号" action.
--
-- The previous UI only marked `account_deletion_requested` in auth metadata,
-- cleared local document data, and signed out. That left the Supabase Auth
-- user and rows in place. This RPC can only delete the caller's own account:
-- it derives the target id from auth.uid(), accepts no user id parameter, and
-- is only executable by authenticated users.

create or replace function public.delete_author_hub_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  -- Remove uploaded media owned by this user. The Storage API owns the files;
  -- this removes the database object rows so orphaned media is not retained
  -- after account deletion.
  delete from storage.objects
  where bucket_id = 'author-hub-media'
    and (owner = v_user_id or owner_id = v_user_id::text);

  -- Explicit cleanup before deleting auth.users. Most of these relations also
  -- have ON DELETE CASCADE, but doing it in order keeps the behavior clear and
  -- avoids leaving share links/members around if a future relation changes.
  delete from public.author_hub_share_links
  where created_by = v_user_id
     or shared_novel_id in (
       select id from public.author_hub_shared_novels where owner_id = v_user_id
     );

  delete from public.author_hub_share_members
  where user_id = v_user_id
     or shared_novel_id in (
       select id from public.author_hub_shared_novels where owner_id = v_user_id
     );

  delete from public.author_hub_shared_novels
  where owner_id = v_user_id;

  delete from public.author_hub_documents
  where user_id = v_user_id;

  delete from public.profiles
  where user_id = v_user_id;

  delete from auth.users
  where id = v_user_id;
end;
$$;

revoke all on function public.delete_author_hub_account() from anon, authenticated, public;
grant execute on function public.delete_author_hub_account() to authenticated;
