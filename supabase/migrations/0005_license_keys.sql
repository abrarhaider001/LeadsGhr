-- LeadsGhr license keys (AGENTS.md, "License keys"). No sign-up: the owner creates a key for each person
-- with their name and email. A key can be activated once per product (desktop app, LeadsGhr Mailer,
-- LeadsGhr Tracker, and any future extension); each activation is bound to one installation.
--
-- A key is 64 hexadecimal characters: SHA-256 of the person's name, email, the creation time, and a random
-- part, so it cannot be recreated from the name, email, and time alone.
--
-- Only licensing data lives here: name, email, key, dates, and activation records (product, installation
-- hash, dates). No leads, recipients, subjects, or message content. The tables have row-level security with
-- no policies, so only the `license` Edge Function (service role) and the owner in the SQL editor can use them.
--
-- Owner commands (run in the Supabase SQL editor):
--   select public.create_license_key('Ali Khan', 'ali@example.com', '2026-12-31');   -- returns the new 64-character key
--   select * from public.license_overview;                                            -- every key, owner, expiry, and where it is used
--   select public.reset_license_product('<key>', 'mailer');                           -- free one product (reinstalled PC)
--   select public.revoke_license_key('<key>');                                        -- turn a key off at once
-- Uses only built-in Postgres functions (sha256, gen_random_uuid), no extensions.

create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  license_key text not null unique check (license_key ~ '^[0-9a-f]{64}$'),
  name text not null,
  email text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.license_activations (
  license_id uuid not null references public.license_keys(id) on delete cascade,
  product text not null check (product ~ '^[a-z][a-z0-9-]{1,40}$'),
  installation_hash text not null,
  activated_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  primary key (license_id, product)
);

alter table public.license_keys enable row level security;
alter table public.license_activations enable row level security;
revoke all on public.license_keys, public.license_activations from anon, authenticated;

-- Normalizes a key the same way the apps do (packages/license normalizeLicenseKey): 64 hex characters, lower case.
create or replace function public.normalize_license_key(p_key text) returns text
language sql immutable set search_path = public as $$
  select case when k ~ '^[0-9a-f]{64}$' then k end from (select lower(regexp_replace(coalesce(p_key, ''), '[^0-9A-Fa-f]', '', 'g')) as k) as input
$$;

create or replace function public.create_license_key(p_name text, p_email text, p_expires_at timestamptz) returns text
language plpgsql security definer set search_path = public as $$
declare
  new_key text;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter the person''s name'; end if;
  if coalesce(trim(p_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address'; end if;
  if p_expires_at is null or p_expires_at <= now() then raise exception 'Choose an expiry date in the future'; end if;
  -- Name, email, and the exact creation time, merged with a random part and hashed with SHA-256 (64 hex characters).
  new_key := encode(sha256(convert_to(trim(p_name) || '|' || lower(trim(p_email)) || '|' || clock_timestamp()::text || '|' || gen_random_uuid()::text, 'UTF8')), 'hex');
  insert into public.license_keys (license_key, name, email, expires_at) values (new_key, trim(p_name), lower(trim(p_email)), p_expires_at);
  return new_key;
end $$;

create or replace function public.reset_license_product(p_key text, p_product text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  delete from public.license_activations a using public.license_keys k
  where a.license_id = k.id and k.license_key = public.normalize_license_key(p_key) and a.product = p_product;
  get diagnostics removed = row_count;
  return removed > 0;
end $$;

create or replace function public.revoke_license_key(p_key text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  changed integer;
begin
  update public.license_keys set revoked_at = now() where license_key = public.normalize_license_key(p_key) and revoked_at is null;
  get diagnostics changed = row_count;
  return changed > 0;
end $$;

-- The owner's overview of every key and where it is used.
create or replace view public.license_overview with (security_invoker = true) as
select k.name, k.email, k.license_key, k.expires_at, k.revoked_at, k.created_at,
       coalesce(string_agg(a.product || ' (' || to_char(a.activated_at, 'YYYY-MM-DD') || ')', ', ' order by a.product), 'not used yet') as used_on
from public.license_keys k left join public.license_activations a on a.license_id = k.id
group by k.id order by k.created_at desc;

revoke all on function public.create_license_key(text, text, timestamptz), public.reset_license_product(text, text), public.revoke_license_key(text) from public, anon, authenticated;
revoke all on public.license_overview from anon, authenticated;
