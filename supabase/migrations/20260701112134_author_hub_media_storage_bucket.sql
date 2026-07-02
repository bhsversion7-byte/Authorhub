-- Storage bucket for character/timeline reference images, so large media
-- moves out of the author_hub_documents jsonb blob (and out of localStorage)
-- and into Supabase Storage instead.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'author-hub-media',
  'author-hub-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- Owners write/delete only their own folder (first path segment = their
-- auth.uid()); the bucket is public so reads are served via the
-- unauthenticated /storage/v1/object/public/ path and don't need a SELECT
-- policy here for normal display (see 20260702050216, which later drops the
-- broad SELECT policy this migration originally added, once it turned out
-- to only enable listing/enumeration rather than gate real image fetches).
drop policy if exists "author hub media owner write" on storage.objects;
create policy "author hub media owner write"
  on storage.objects
  for insert
  with check (
    bucket_id = 'author-hub-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "author hub media owner delete" on storage.objects;
create policy "author hub media owner delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'author-hub-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "author hub media public read" on storage.objects;
create policy "author hub media public read"
  on storage.objects
  for select
  using (bucket_id = 'author-hub-media');
