drop function if exists public.mark_author_hub_shared_novel_seen(uuid);

create function public.mark_author_hub_shared_novel_seen(p_shared_novel_id uuid)
returns table (
  missed_edit boolean,
  editor_name text,
  editor_id uuid,
  editor_role text,
  sections text[],
  edited_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_previous_seen timestamptz;
  v_editor_id uuid;
  v_owner_id uuid;
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

  select
    shared.last_edited_by_user_id,
    shared.owner_id,
    shared.last_edited_by_name,
    shared.last_edited_sections,
    shared.updated_at
  into v_editor_id, v_owner_id, v_editor_name, v_sections, v_edited_at
  from public.author_hub_shared_novels shared
  where shared.id = p_shared_novel_id;

  update public.author_hub_share_members member
  set last_seen_at = now()
  where member.shared_novel_id = p_shared_novel_id
    and member.user_id = v_user_id;

  if v_editor_id is not null and v_editor_id <> v_user_id and v_edited_at > v_previous_seen then
    return query select
      true,
      v_editor_name,
      v_editor_id,
      case when v_editor_id = v_owner_id then 'owner' else 'editor' end,
      v_sections,
      v_edited_at;
  else
    return query select false, null::text, null::uuid, null::text, null::text[], null::timestamptz;
  end if;
end;
$$;

revoke all on function public.mark_author_hub_shared_novel_seen(uuid) from anon, public;
grant execute on function public.mark_author_hub_shared_novel_seen(uuid) to authenticated;
