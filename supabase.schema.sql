-- Author Hub production schema template.
-- Use Supabase Auth for email/password registration and login.
-- Password hashes are managed by Supabase Auth; do not store plaintext passwords.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'writer',
  email text,
  has_completed_tour boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.author_hub_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  document jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.author_hub_documents enable row level security;

create policy "profiles are private"
  on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "documents are private"
  on public.author_hub_documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
