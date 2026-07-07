-- "Edited while you were away" catch-up notice.
--
-- Scenario: collaborator A is offline while B edits a shared novel, then B
-- goes offline before A comes back online - neither side ever sees a live
-- "已保存" toast for that edit (those are ephemeral realtime broadcasts,
-- only received by clients connected at the moment they fire), so A has no
-- way to know the novel changed underneath them.
--
-- Design: track each member's last_seen_at (updated once per visit, not a
-- continuous heartbeat) and the shared novel's last editor/sections. On
-- visiting a shared novel, compare "did someone ELSE edit after MY last
-- visit" - if A and B were online together, A's last_seen_at was refreshed
-- during that overlap, so edits from that window never qualify as missed.
-- Only a real gap (A absent the whole time B edited) trips the notice.

alter table public.author_hub_shared_novels
  add column if not exists last_edited_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists last_edited_by_name text,
  add column if not exists last_edited_sections text[];

alter table public.author_hub_share_members
  add column if not exists last_seen_at timestamptz not null default now();

-- save_author_hub_shared_novel: now also records who edited and which
-- top-level sections changed (client computes p_changed_sections by diffing
-- the previous/next novel object before calling this).
--
-- The new parameters change this function's signature (uuid, jsonb,
-- timestamptz, text, text[]) from the existing one (uuid, jsonb,
-- timestamptz). Postgres identifies functions by their full parameter type
-- list, not by name, so `create or replace` here would create a SECOND
-- overload alongside the old one rather than replacing it - calls with
-- exactly 3 named args would then be ambiguous between both. Drop the old
-- signature explicitly first.
drop function if exists public.save_author_hub_shared_novel(uuid, jsonb, timestamptz);

create or replace function public.save_author_hub_shared_novel(
  p_shared_novel_id uuid,
  p_novel jsonb,
  p_expected_updated_at timestamptz,
  p_editor_name text default null,
  p_changed_sections text[] default null
)
returns table (
  id uuid,
  source_novel_id text,
  role text,
  novel jsonb,
  collaborator_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_current_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select member.role
  into v_role
  from public.author_hub_share_members member
  where member.shared_novel_id = p_shared_novel_id
    and member.user_id = v_user_id
  limit 1;

  if v_role is null or v_role not in ('owner', 'editor') then
    raise exception 'edit permission required';
  end if;

  select shared.updated_at
  into v_current_updated_at
  from public.author_hub_shared_novels shared
  where shared.id = p_shared_novel_id
  for update;

  if v_current_updated_at is null then
    raise exception 'shared novel not found';
  end if;

  if p_expected_updated_at is not null and v_current_updated_at <> p_expected_updated_at then
    raise exception 'stale shared novel version';
  end if;

  update public.author_hub_shared_novels shared
  set
    title = coalesce(nullif(p_novel->>'title', ''), 'Untitled novel'),
    novel = p_novel,
    last_edited_by_user_id = v_user_id,
    last_edited_by_name = nullif(trim(p_editor_name), ''),
    last_edited_sections = p_changed_sections
  where shared.id = p_shared_novel_id;

  -- Saving counts as a visit too - keeps the editor's own last_seen_at
  -- current so their own edit is never later flagged as "missed" by them.
  update public.author_hub_share_members member
  set last_seen_at = now()
  where member.shared_novel_id = p_shared_novel_id
    and member.user_id = v_user_id;

  return query
  select
    shared.id,
    shared.source_novel_id,
    v_role as role,
    shared.novel,
    (select count(*)::integer from public.author_hub_share_members count_member where count_member.shared_novel_id = shared.id),
    shared.updated_at
  from public.author_hub_shared_novels shared
  where shared.id = p_shared_novel_id;
end;
$$;

-- Call once when a shared novel is opened/becomes active. Returns whether
-- someone else edited it since this user's previous visit, then refreshes
-- last_seen_at to now (so the same edit isn't reported twice, and so this
-- user's own presence going forward correctly shields future edits from
-- being flagged for THEM if they stay online).
create or replace function public.mark_author_hub_shared_novel_seen(p_shared_novel_id uuid)
returns table (
  missed_edit boolean,
  editor_name text,
  sections text[],
  edited_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_previous_seen timestamptz;
  v_editor_id uuid;
  v_editor_name text;
  v_sections text[];
  v_edited_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select member.last_seen_at
  into v_previous_seen
  from public.author_hub_share_members member
  where member.shared_novel_id = p_shared_novel_id
    and member.user_id = v_user_id
  limit 1;

  if v_previous_seen is null then
    raise exception 'not a member of this shared novel';
  end if;

  select shared.last_edited_by_user_id, shared.last_edited_by_name, shared.last_edited_sections, shared.updated_at
  into v_editor_id, v_editor_name, v_sections, v_edited_at
  from public.author_hub_shared_novels shared
  where shared.id = p_shared_novel_id;

  update public.author_hub_share_members member
  set last_seen_at = now()
  where member.shared_novel_id = p_shared_novel_id
    and member.user_id = v_user_id;

  if v_editor_id is not null and v_editor_id <> v_user_id and v_edited_at > v_previous_seen then
    return query select true, v_editor_name, v_sections, v_edited_at;
  else
    return query select false, null::text, null::text[], null::timestamptz;
  end if;
end;
$$;

revoke all on function public.save_author_hub_shared_novel(uuid, jsonb, timestamptz, text, text[]) from anon, authenticated, public;
grant execute on function public.save_author_hub_shared_novel(uuid, jsonb, timestamptz, text, text[]) to authenticated;

revoke all on function public.mark_author_hub_shared_novel_seen(uuid) from anon, public;
grant execute on function public.mark_author_hub_shared_novel_seen(uuid) to authenticated;
