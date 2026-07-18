-- A private, per-user workspace kept outside the large manuscript document.
-- This keeps high-frequency scratchpad autosaves from rewriting an entire novel.
create table if not exists public.author_hub_scratchpads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note_html text not null default '<p></p>',
  note_text text not null default '',
  mind_map jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  active_mode text not null default 'note' check (active_mode in ('note', 'map')),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint scratchpad_note_html_size check (octet_length(note_html) <= 2097152),
  constraint scratchpad_note_text_size check (octet_length(note_text) <= 2097152),
  constraint scratchpad_mind_map_shape check (
    jsonb_typeof(mind_map) = 'object'
    and jsonb_typeof(mind_map -> 'nodes') = 'array'
    and jsonb_typeof(mind_map -> 'edges') = 'array'
  ),
  constraint scratchpad_mind_map_size check (octet_length(mind_map::text) <= 4194304)
);

alter table public.author_hub_scratchpads enable row level security;

drop policy if exists "scratchpads owner only" on public.author_hub_scratchpads;
create policy "scratchpads owner only"
  on public.author_hub_scratchpads
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.author_hub_scratchpads from anon, public;
grant select, insert, update, delete on table public.author_hub_scratchpads to authenticated;

drop trigger if exists set_author_hub_scratchpads_updated_at on public.author_hub_scratchpads;
create trigger set_author_hub_scratchpads_updated_at
  before update on public.author_hub_scratchpads
  for each row execute function public.set_updated_at();
