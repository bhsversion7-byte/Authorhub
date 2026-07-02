-- Supabase's performance advisor flagged unindexed foreign-key columns on
-- the new sharing tables (author_hub_share_links.created_by/shared_novel_id,
-- author_hub_share_members.user_id): every RLS check and join against these
-- columns was forcing a sequential scan, which costs more disk IO as the
-- tables grow. Add the missing indexes.

create index if not exists author_hub_share_links_created_by_idx
  on public.author_hub_share_links (created_by);

create index if not exists author_hub_share_links_shared_novel_id_idx
  on public.author_hub_share_links (shared_novel_id);

create index if not exists author_hub_share_members_user_id_idx
  on public.author_hub_share_members (user_id);
