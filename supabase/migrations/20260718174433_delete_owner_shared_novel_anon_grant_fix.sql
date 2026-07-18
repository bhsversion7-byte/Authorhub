-- Existing projects may carry an explicit historical anon EXECUTE grant.
-- Keep this owner-only destructive RPC unreachable before authentication.
revoke all on function public.delete_author_hub_owned_shared_novel(uuid) from anon;
grant execute on function public.delete_author_hub_owned_shared_novel(uuid) to authenticated;
