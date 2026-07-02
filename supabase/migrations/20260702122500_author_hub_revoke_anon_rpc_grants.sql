-- Follow-up for older explicit grants: revoking from PUBLIC does not remove a
-- direct anon grant. Keep anonymous access only for public read-only share
-- lookup; all collaboration/mutation RPCs require authenticated users.

revoke execute on function public.author_hub_can_access_shared_novel(uuid, text[]) from anon, authenticated, public;
revoke execute on function public.ensure_author_hub_shared_novel(text, jsonb) from anon, authenticated, public;
revoke execute on function public.get_author_hub_shared_novel_by_token(text) from anon, authenticated, public;
revoke execute on function public.join_author_hub_shared_novel(text) from anon, authenticated, public;
revoke execute on function public.list_author_hub_shared_novels() from anon, authenticated, public;
revoke execute on function public.revoke_author_hub_share_role(uuid, text) from anon, authenticated, public;
revoke execute on function public.save_author_hub_shared_novel(uuid, jsonb, timestamp with time zone) from anon, authenticated, public;

grant execute on function public.author_hub_can_access_shared_novel(uuid, text[]) to authenticated;
grant execute on function public.ensure_author_hub_shared_novel(text, jsonb) to authenticated;
grant execute on function public.get_author_hub_shared_novel_by_token(text) to anon, authenticated;
grant execute on function public.join_author_hub_shared_novel(text) to authenticated;
grant execute on function public.list_author_hub_shared_novels() to authenticated;
grant execute on function public.revoke_author_hub_share_role(uuid, text) to authenticated;
grant execute on function public.save_author_hub_shared_novel(uuid, jsonb, timestamp with time zone) to authenticated;
