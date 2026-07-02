-- Removing a shared novel from your own manuscript list ("确定移除" in the
-- delete-confirm modal) only ever updated local React state; it never
-- deleted the caller's own row from author_hub_share_members, so
-- list_author_hub_shared_novels() kept returning the "removed" novel on the
-- next load/refresh - the exact bug report of "delete doesn't stick after
-- refresh". This adds the missing server-side leave path plus the DELETE
-- policy it needs (no such policy/grant existed on this table before).

drop policy if exists "share members can leave" on public.author_hub_share_members;
create policy "share members can leave"
  on public.author_hub_share_members
  for delete
  using (user_id = (select auth.uid()));

grant delete on public.author_hub_share_members to authenticated;

create or replace function public.leave_author_hub_shared_novel(p_shared_novel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_remaining integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  delete from public.author_hub_share_members
  where shared_novel_id = p_shared_novel_id
    and user_id = v_user_id;

  select count(*)::integer
  into v_remaining
  from public.author_hub_share_members
  where shared_novel_id = p_shared_novel_id;

  -- No collaborators left at all (owner was the last member to leave):
  -- delete the orphaned shared novel row instead of leaving permanently
  -- unreachable garbage behind (links/remaining member rows cascade).
  if v_remaining = 0 then
    delete from public.author_hub_shared_novels where id = p_shared_novel_id;
  end if;
end;
$$;

revoke all on function public.leave_author_hub_shared_novel(uuid) from public;
grant execute on function public.leave_author_hub_shared_novel(uuid) to authenticated;
