-- New functions in this project pick up an implicit anon EXECUTE grant from
-- a schema-level default privilege (the same gap 20260702114702 already
-- closed for every older RPC) - "revoke all from public" alone doesn't
-- remove it. leave_author_hub_shared_novel is a no-op for an unauthenticated
-- caller (it raises on auth.uid() is null) but should be locked down the
-- same way as every sibling mutation RPC for consistency.
revoke execute on function public.leave_author_hub_shared_novel(uuid) from anon, authenticated, public;
grant execute on function public.leave_author_hub_shared_novel(uuid) to authenticated;
