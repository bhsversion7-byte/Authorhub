-- Supabase is moving public-schema tables from implicit Data API exposure to
-- explicit grants. This project still had broad legacy table grants
-- (`arwdDxtm`) for anon/authenticated on AuthorHub tables; RLS protected rows,
-- but the table privilege layer was unnecessarily wide.
--
-- Keep the app contract intact:
-- - private workspace documents/profiles are client-read/written by the
--   signed-in owner, guarded by existing RLS;
-- - share links are created/revoked directly by authenticated owners/editors;
-- - shared-novel reads/mutations mostly go through RPCs, with SELECT kept for
--   RLS/realtime visibility;
-- - anonymous users only access public shares through
--   get_author_hub_shared_novel_by_token(), not by querying tables directly.

revoke all privileges on table public.profiles from anon, authenticated;
revoke all privileges on table public.author_hub_documents from anon, authenticated;
revoke all privileges on table public.author_hub_shared_novels from anon, authenticated;
revoke all privileges on table public.author_hub_share_members from anon, authenticated;
revoke all privileges on table public.author_hub_share_links from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.author_hub_documents to authenticated;

grant select on table public.author_hub_shared_novels to authenticated;
grant select on table public.author_hub_share_members to authenticated;

grant select, insert on table public.author_hub_share_links to authenticated;
grant update (is_active) on table public.author_hub_share_links to authenticated;
