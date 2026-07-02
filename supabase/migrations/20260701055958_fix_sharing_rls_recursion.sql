create or replace function public.author_hub_can_access_shared_novel(
  p_shared_novel_id uuid,
  p_roles text[] default null
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.author_hub_shared_novels shared
    where shared.id = p_shared_novel_id
      and shared.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.author_hub_share_members member
    where member.shared_novel_id = p_shared_novel_id
      and member.user_id = auth.uid()
      and (p_roles is null or member.role = any(p_roles))
  );
$$;

drop policy if exists "shared novels visible to collaborators" on public.author_hub_shared_novels;
create policy "shared novels visible to collaborators"
  on public.author_hub_shared_novels
  for select
  using (public.author_hub_can_access_shared_novel(id));

drop policy if exists "shared novels editable by owners and editors" on public.author_hub_shared_novels;
create policy "shared novels editable by owners and editors"
  on public.author_hub_shared_novels
  for update
  using (public.author_hub_can_access_shared_novel(id, array['owner', 'editor']))
  with check (public.author_hub_can_access_shared_novel(id, array['owner', 'editor']));

drop policy if exists "share members visible to collaborators" on public.author_hub_share_members;
create policy "share members visible to collaborators"
  on public.author_hub_share_members
  for select
  using (
    user_id = auth.uid()
    or public.author_hub_can_access_shared_novel(shared_novel_id, array['owner', 'editor'])
  );

drop policy if exists "share links visible to owners and editors" on public.author_hub_share_links;
create policy "share links visible to owners and editors"
  on public.author_hub_share_links
  for select
  using (public.author_hub_can_access_shared_novel(shared_novel_id, array['owner', 'editor']));

drop policy if exists "share links created by owners and editors" on public.author_hub_share_links;
create policy "share links created by owners and editors"
  on public.author_hub_share_links
  for insert
  with check (
    created_by = auth.uid()
    and public.author_hub_can_access_shared_novel(shared_novel_id, array['owner', 'editor'])
  );

revoke all on function public.author_hub_can_access_shared_novel(uuid, text[]) from public;
grant execute on function public.author_hub_can_access_shared_novel(uuid, text[]) to authenticated;
