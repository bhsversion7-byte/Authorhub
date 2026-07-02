-- "重新生成" (regenerate link) only ever inserted a new share_links row; the
-- previous token's is_active stayed true forever, so an old link never
-- expired even after the owner "regenerated" it. Add the missing UPDATE
-- policy/grant so owners/editors can revoke their own novel's links, and let
-- the app deactivate same-role links before inserting a fresh token.

drop policy if exists "share links revocable by owners and editors" on public.author_hub_share_links;
create policy "share links revocable by owners and editors"
  on public.author_hub_share_links
  for update
  using (public.author_hub_can_access_shared_novel(shared_novel_id, array['owner', 'editor']))
  with check (public.author_hub_can_access_shared_novel(shared_novel_id, array['owner', 'editor']));

grant update on public.author_hub_share_links to authenticated;
