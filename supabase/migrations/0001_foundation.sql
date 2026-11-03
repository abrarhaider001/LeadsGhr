-- Supabase stores account data only. Extracted leads, runs, pages and exports stay in desktop SQLite/disk.
create extension if not exists pgcrypto;
create table if not exists public.user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'explorer',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_profile enable row level security;
create policy profile_read on public.user_profile for select to authenticated using (auth.uid() = user_id);
create policy profile_insert on public.user_profile for insert to authenticated with check (auth.uid() = user_id);
create policy profile_update on public.user_profile for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
