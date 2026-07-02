-- Shared novel workspaces.
-- Editor links require login and join the shared source document. Viewer links
-- are public-by-token but read-only in the app.

create table if not exists public.author_hub_shared_novels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_novel_id text not null,
  title text not null default 'Untitled novel',
  novel jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, source_novel_id)
);

create table if not exists public.author_hub_share_members (
  shared_novel_id uuid not null references public.author_hub_shared_novels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (shared_novel_id, user_id)
);

create table if not exists public.author_hub_share_links (
  id uuid primary key default gen_random_uuid(),
  shared_novel_id uuid not null references public.author_hub_shared_novels(id) on delete cascade,
  token text not null unique,
  role text not null check (role in ('editor', 'viewer')),
  created_by uuid references auth.users(id) on delete cascade default auth.uid(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

drop trigger if exists shared_novels_set_updated_at on public.author_hub_shared_novels;
create trigger shared_novels_set_updated_at
before update on public.author_hub_shared_novels
for each row execute function public.set_updated_at();

alter table public.author_hub_shared_novels enable row level security;
alter table public.author_hub_share_members enable row level security;
alter table public.author_hub_share_links enable row level security;

create or replace function public.author_hub_can_access_shared_novel(
  p_shared_novel_id uuid,
  p_roles text[] default null
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.author_hub_shared_novels shared
    where shared.id = p_shared_novel_id
      and shared.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.author_hub_share_members member
    where member.shared_novel_id = p_shared_novel_id
      and member.user_id = auth.uid()
      and (p_roles is null or member.role = any(p_roles))
  );
$$;

drop policy if exists "shared novels visible to collaborators" on public.author_hub_shared_novels;
create policy "shared novels visible to collaborators"
  on public.author_hub_shared_novels
  for select
  using (public.author_hub_can_access_shared_novel(id));

drop policy if exists "shared novels created by owner" on public.author_hub_shared_novels;
create policy "shared novels created by owner"
  on public.author_hub_shared_novels
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "shared novels editable by owners and editors" on public.author_hub_shared_novels;
create policy "shared novels editable by owners and editors"
  on public.author_hub_shared_novels
  for update
  using (public.author_hub_can_access_shared_novel(id, array['owner', 'editor']))
  with check (public.author_hub_can_access_shared_novel(id, array['owner', 'editor']));

drop policy if exists "share members visible to collaborators" on public.author_hub_share_members;
create policy "share members visible to collaborators"
  on public.author_hub_share_members
  for select
  using (
    user_id = auth.uid()
    or public.author_hub_can_access_shared_novel(shared_novel_id, array['owner', 'editor'])
  );

drop policy if exists "share links visible to owners and editors" on public.author_hub_share_links;
create policy "share links visible to owners and editors"
  on public.author_hub_share_links
  for select
  using (public.author_hub_can_access_shared_novel(shared_novel_id, array['owner', 'editor']));

drop policy if exists "share links created by owners and editors" on public.author_hub_share_links;
create policy "share links created by owners and editors"
  on public.author_hub_share_links
  for insert
  with check (
    created_by = auth.uid()
    and public.author_hub_can_access_shared_novel(shared_novel_id, array['owner', 'editor'])
  );

grant select, insert, update on public.author_hub_shared_novels to authenticated;
grant select on public.author_hub_share_members to authenticated;
grant select, insert on public.author_hub_share_links to authenticated;

create or replace function public.ensure_author_hub_shared_novel(
  p_source_novel_id text,
  p_novel jsonb
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
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_shared_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  insert into public.author_hub_shared_novels (owner_id, source_novel_id, title, novel)
  values (v_user_id, p_source_novel_id, coalesce(nullif(p_novel->>'title', ''), 'Untitled novel'), p_novel)
  on conflict (owner_id, source_novel_id) do nothing
  returning author_hub_shared_novels.id into v_shared_id;

  if v_shared_id is null then
    select shared.id
    into v_shared_id
    from public.author_hub_shared_novels shared
    where shared.owner_id = v_user_id
      and shared.source_novel_id = p_source_novel_id
    limit 1;
  end if;

  insert into public.author_hub_share_members (shared_novel_id, user_id, role)
  values (v_shared_id, v_user_id, 'owner')
  on conflict (shared_novel_id, user_id)
  do update set role = 'owner';

  return query
  select
    shared.id,
    shared.source_novel_id,
    'owner'::text as role,
    shared.novel,
    (select count(*)::integer from public.author_hub_share_members member where member.shared_novel_id = shared.id),
    shared.updated_at
  from public.author_hub_shared_novels shared
  where shared.id = v_shared_id;
end;
$$;

create or replace function public.list_author_hub_shared_novels()
returns table (
  id uuid,
  source_novel_id text,
  role text,
  novel jsonb,
  collaborator_count integer,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    shared.id,
    shared.source_novel_id,
    member.role,
    shared.novel,
    (select count(*)::integer from public.author_hub_share_members count_member where count_member.shared_novel_id = shared.id),
    shared.updated_at
  from public.author_hub_shared_novels shared
  join public.author_hub_share_members member on member.shared_novel_id = shared.id
  where member.user_id = auth.uid()
  order by shared.updated_at desc;
$$;

create or replace function public.join_author_hub_shared_novel(p_token text)
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
  v_link record;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select link.shared_novel_id, link.role
  into v_link
  from public.author_hub_share_links link
  where link.token = p_token
    and link.is_active = true
  limit 1;

  if v_link.shared_novel_id is null or v_link.role <> 'editor' then
    raise exception 'invalid editor invite';
  end if;

  insert into public.author_hub_share_members (shared_novel_id, user_id, role)
  values (v_link.shared_novel_id, v_user_id, 'editor')
  on conflict (shared_novel_id, user_id)
  do update set role = case
    when public.author_hub_share_members.role = 'owner' then 'owner'
    else excluded.role
  end;

  return query
  select
    shared.id,
    shared.source_novel_id,
    member.role,
    shared.novel,
    (select count(*)::integer from public.author_hub_share_members count_member where count_member.shared_novel_id = shared.id),
    shared.updated_at
  from public.author_hub_shared_novels shared
  join public.author_hub_share_members member on member.shared_novel_id = shared.id and member.user_id = v_user_id
  where shared.id = v_link.shared_novel_id;
end;
$$;

create or replace function public.save_author_hub_shared_novel(
  p_shared_novel_id uuid,
  p_novel jsonb,
  p_expected_updated_at timestamptz
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

  if v_role not in ('owner', 'editor') then
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
    novel = p_novel
  where shared.id = p_shared_novel_id;

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

create or replace function public.sanitize_author_hub_public_novel(p_novel jsonb)
returns jsonb
language sql
stable
as $$
  select jsonb_set(
    p_novel,
    '{characters}',
    coalesce(
      (
        select jsonb_agg(character - 'secret' - 'hidden' - 'privateNote' order by ord)
        from jsonb_array_elements(coalesce(p_novel->'characters', '[]'::jsonb)) with ordinality as item(character, ord)
      ),
      '[]'::jsonb
    ),
    true
  );
$$;

create or replace function public.get_author_hub_shared_novel_by_token(p_token text)
returns table (
  id uuid,
  source_novel_id text,
  role text,
  novel jsonb,
  collaborator_count integer,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    shared.id,
    shared.source_novel_id,
    'viewer'::text as role,
    public.sanitize_author_hub_public_novel(shared.novel),
    (select count(*)::integer from public.author_hub_share_members member where member.shared_novel_id = shared.id),
    shared.updated_at
  from public.author_hub_share_links link
  join public.author_hub_shared_novels shared on shared.id = link.shared_novel_id
  where link.token = p_token
    and link.role = 'viewer'
    and link.is_active = true
  limit 1;
$$;

revoke all on function public.ensure_author_hub_shared_novel(text, jsonb) from public;
revoke all on function public.author_hub_can_access_shared_novel(uuid, text[]) from public;
revoke all on function public.list_author_hub_shared_novels() from public;
revoke all on function public.join_author_hub_shared_novel(text) from public;
revoke all on function public.get_author_hub_shared_novel_by_token(text) from public;
revoke all on function public.save_author_hub_shared_novel(uuid, jsonb, timestamptz) from public;
revoke all on function public.sanitize_author_hub_public_novel(jsonb) from public;

grant execute on function public.ensure_author_hub_shared_novel(text, jsonb) to authenticated;
grant execute on function public.author_hub_can_access_shared_novel(uuid, text[]) to authenticated;
grant execute on function public.list_author_hub_shared_novels() to authenticated;
grant execute on function public.join_author_hub_shared_novel(text) to authenticated;
grant execute on function public.get_author_hub_shared_novel_by_token(text) to anon, authenticated;
grant execute on function public.save_author_hub_shared_novel(uuid, jsonb, timestamptz) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'author_hub_shared_novels'
  ) then
    alter publication supabase_realtime add table public.author_hub_shared_novels;
  end if;
end;
$$;

