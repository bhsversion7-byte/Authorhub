create or replace function public.delete_author_hub_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  delete from storage.objects
  where bucket_id = 'author-hub-media'
    and (owner = v_user_id or owner_id = v_user_id::text);

  update public.author_hub_shared_novels
  set last_edited_by_user_id = null
  where last_edited_by_user_id = v_user_id
    and owner_id <> v_user_id;

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

  delete from public.author_hub_shared_novels where owner_id = v_user_id;
  delete from public.author_hub_scratchpads where user_id = v_user_id;
  delete from public.author_hub_documents where user_id = v_user_id;
  delete from public.profiles where user_id = v_user_id;

  delete from auth.users where id = v_user_id;
  get diagnostics v_deleted = row_count;
  if v_deleted <> 1 then
    raise exception 'account deletion did not remove the authenticated user';
  end if;
end;
$$;

revoke all on function public.delete_author_hub_account() from public, anon;
grant execute on function public.delete_author_hub_account() to authenticated;
