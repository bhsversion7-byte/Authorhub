-- Tighten execute privileges reported by Supabase Security Advisor without
-- changing the app contract: public viewer links stay anonymous, collaboration
-- and mutation RPCs require an authenticated user.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.author_hub_can_access_shared_novel(uuid, text[]) from public;
revoke all on function public.ensure_author_hub_shared_novel(text, jsonb) from public;
revoke all on function public.get_author_hub_shared_novel_by_token(text) from public;
revoke all on function public.join_author_hub_shared_novel(text) from public;
revoke all on function public.list_author_hub_shared_novels() from public;
revoke all on function public.revoke_author_hub_share_role(uuid, text) from public;
revoke all on function public.save_author_hub_shared_novel(uuid, jsonb, timestamp with time zone) from public;

grant execute on function public.author_hub_can_access_shared_novel(uuid, text[]) to authenticated;
grant execute on function public.ensure_author_hub_shared_novel(text, jsonb) to authenticated;
grant execute on function public.get_author_hub_shared_novel_by_token(text) to anon, authenticated;
grant execute on function public.join_author_hub_shared_novel(text) to authenticated;
grant execute on function public.list_author_hub_shared_novels() to authenticated;
grant execute on function public.revoke_author_hub_share_role(uuid, text) to authenticated;
grant execute on function public.save_author_hub_shared_novel(uuid, jsonb, timestamp with time zone) to authenticated;
