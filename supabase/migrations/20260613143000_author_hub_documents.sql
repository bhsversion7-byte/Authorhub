create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'writer',
  email text,
  has_completed_tour boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.author_hub_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'default-author-hub',
  document jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, title)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists documents_set_updated_at on public.author_hub_documents;
create trigger documents_set_updated_at
before update on public.author_hub_documents
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.author_hub_documents enable row level security;

drop policy if exists "profiles are private" on public.profiles;
create policy "profiles are private"
  on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "documents are private" on public.author_hub_documents;
create policy "documents are private"
  on public.author_hub_documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
