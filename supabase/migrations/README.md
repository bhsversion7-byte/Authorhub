# Migration index

This folder is Supabase's real, applied migration history - append-only by
design (Supabase itself, not just convention). **Never rename, reorder, or
delete an existing file here** - each filename's timestamp prefix must
exactly match the version Supabase's own migration-history table recorded
when it was applied (see `preference.md`'s Supabase Schema Notes); renaming
one breaks that mapping for no real benefit, since the disk/functional cost
of extra files is zero - only readability was ever a concern. This index
exists to solve that readability problem without touching any of the files
below.

New migrations just get appended normally, in their own dated group at the
bottom of whichever section fits.

## Core schema

- `20260613143000_author_hub_documents.sql` - the original private-workspace table (`author_hub_documents`, `profiles`).

## Sharing & collaboration (initial build-out, 2026-07-01 to 2026-07-03)

- `20260701043518_author_hub_sharing.sql` - `author_hub_shared_novels` / `author_hub_share_members` / `author_hub_share_links` tables + first RPC set.
- `20260701053930_fix_sharing_rpc_variable_conflict.sql`
- `20260701055958_fix_sharing_rls_recursion.sql`
- `20260701110527_fix_disk_io_advisor_findings.sql`
- `20260701112134_author_hub_media_storage_bucket.sql` - `author-hub-media` Storage bucket.
- `20260701145543_author_hub_share_sections.sql` - per-section public-share visibility.
- `20260701164928_author_hub_revoke_share_links.sql`
- `20260701174049_author_hub_share_sections_search_path.sql`
- `20260702050216_author_hub_media_no_listing.sql` - block public Storage object enumeration.
- `20260702052419_author_hub_list_shared_novels_perf.sql`
- `20260702103302_author_hub_revoke_share_role.sql` - original `revoke_author_hub_share_role`.
- `20260702114553_author_hub_rpc_execute_grants.sql`
- `20260702114702_author_hub_revoke_anon_rpc_grants.sql` - closes the "new RPC gets an implicit anon grant" footgun (see preference.md).
- `20260702133219_author_hub_account_deletion_rpc.sql` - `delete_author_hub_account`.
- `20260702140111_author_hub_leave_shared_novel.sql`
- `20260702140336_author_hub_leave_shared_novel_anon_grant_fix.sql`
- `20260703065514_author_hub_restrict_share_links_update_grant.sql`

## Public-share privacy hardening (2026-07-05 to 2026-07-07)

- `20260705070628_author_hub_strip_author_links_from_public_share.sql` - strips author-identifying platform links from anon share payloads.
- `20260705094838_author_hub_least_privilege_table_grants.sql`
- `20260707003000_author_hub_strip_focus_pages_from_public_share.sql`

## Collaboration correctness fixes (2026-07-07)

- `20260707113621_author_hub_fix_shared_save_null_role_bypass.sql` - fixes the critical NULL-role save-permission bypass (see preference.md's 2026-07-09 entry).
- `20260707114832_author_hub_shared_edit_catchup_notice.sql` - "edited while you were away" notice (`last_edited_by_*`, `mark_author_hub_shared_novel_seen`).

## Area-lock era polish (2026-07-08)

- `20260708040153_author_hub_index_shared_novels_last_editor.sql` - FK covering index.
- `20260708041320_author_hub_revoke_editor_role_owner_only.sql` - only the owner (not any editor) can revoke the shared editor role.
