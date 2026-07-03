-- The UPDATE grant on author_hub_share_links was table-wide (from
-- 20260701164928_author_hub_revoke_share_links.sql), and the RLS policy only
-- checks whether the caller is an owner/editor on the shared novel - it never
-- restricted which *columns* an owner/editor can change. The app itself only
-- ever calls .update({ is_active: false }) to revoke a link, but nothing at
-- the database level stopped an editor from directly rewriting a link's
-- `role` or `token` column instead - e.g. silently promoting an already-
-- distributed read-only viewer link into a fully-editable editor link.
-- Narrow the grant to the one column the app actually needs to update.

revoke update on public.author_hub_share_links from authenticated;
grant update (is_active) on public.author_hub_share_links to authenticated;
