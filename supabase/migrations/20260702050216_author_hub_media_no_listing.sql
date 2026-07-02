-- Supabase advisor flagged "author hub media public read" as a broad SELECT
-- policy on storage.objects for the public author-hub-media bucket, which
-- lets anyone (including anon) call the list/select storage API and
-- enumerate every uploaded file's path across every user - not just fetch
-- one they already know the URL for.
--
-- The bucket is already public (storage.buckets.public = true), and public
-- buckets serve objects via the unauthenticated /storage/v1/object/public/
-- URL path, which does NOT check storage.objects RLS at all. So this SELECT
-- policy was never required for normal image display in the app (character/
-- timeline images are always rendered by their full known URL) - it only
-- ever enabled enumeration. Drop it; public URL fetching keeps working
-- exactly as before, listing/enumeration no longer does.

drop policy if exists "author hub media public read" on storage.objects;
