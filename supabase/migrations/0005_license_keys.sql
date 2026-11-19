-- LeadsGhr license keys (AGENTS.md, "License keys"). No sign-up: the owner creates keys here and gives
-- each person their own. A key can be activated once per product (desktop app, LeadsGhr Mailer,
-- LeadsGhr Tracker, and any future extension); each activation is bound to one installation.
--
-- Only licensing data lives here: key hashes (never the key itself), labels, expiry dates, and activation
-- records (product, installation hash, dates). No leads, recipients, subjects, or message content.
-- The tables have row-level security with no policies, so only the `license` Edge Function (service role)
-- and the owner in the SQL editor can read or change them.
--
-- Owner commands (run in the Supabase SQL editor):
--   select public.create_license_key('Ali', '2026-12-31');         -- returns the new key, e.g. LGHR-7F3K-9QX2-M4TP
--   select * from public.license_overview;                          -- keys, expiry, and where each is used
--   select public.reset_license_product('LGHR-7F3K-9QX2-M4TP', 'mailer');  -- free one product (reinstalled PC)
--   select public.revoke_license_key('LGHR-7F3K-9QX2-M4TP');        -- turn a key off at once

-- Uses only built-in Postgres functions (sha256, gen_random_uuid), no extensions.

create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  key_last4 text not null,
  label text,
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

-- Normalizes the key the same way the apps do (packages/license normalizeLicenseKey) and returns its hash.
create or replace function public.license_key_hash(p_key text) returns text
language plpgsql immutable set search_path = public as $$
declare
  raw text := upper(regexp_replace(coalesce(p_key, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if raw like 'LGHR%' and length(raw) = 16 then raw := substr(raw, 5); end if;
  if raw !~ '^[A-Z0-9]{12}$' then return null; end if;
  return encode(sha256(convert_to('LGHR-' || substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 4), 'UTF8')), 'hex');
end $$;

create or replace function public.create_license_key(p_label text, p_expires_at timestamptz) returns text
language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  -- 12 bytes from a strong random UUID (gen_random_uuid uses the server's secure random source).
  bytes bytea := substring(decode(replace(gen_random_uuid()::text, '-', ''), 'hex') from 1 for 12);
  body text := '';
  new_key text;
begin
  if p_expires_at is null or p_expires_at <= now() then raise exception 'Choose an expiry date in the future'; end if;
  for i in 0..11 loop body := body || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1); end loop;
  new_key := 'LGHR-' || substr(body, 1, 4) || '-' || substr(body, 5, 4) || '-' || substr(body, 9, 4);
  insert into public.license_keys (key_hash, key_last4, label, expires_at) values (public.license_key_hash(new_key), right(new_key, 4), p_label, p_expires_at);
  return new_key;
end $$;

create or replace function public.reset_license_product(p_key text, p_product text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  delete from public.license_activations a using public.license_keys k
  where a.license_id = k.id and k.key_hash = public.license_key_hash(p_key) and a.product = p_product;
  get diagnostics removed = row_count;
  return removed > 0;
end $$;

create or replace function public.revoke_license_key(p_key text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  changed integer;
begin
  update public.license_keys set revoked_at = now() where key_hash = public.license_key_hash(p_key) and revoked_at is null;
  get diagnostics changed = row_count;
  return changed > 0;
end $$;

-- The owner's overview; keys are shown by their last four characters only.
create or replace view public.license_overview with (security_invoker = true) as
select k.label, 'LGHR-••••-••••-' || k.key_last4 as key, k.expires_at, k.revoked_at, k.created_at,
       coalesce(string_agg(a.product || ' (' || to_char(a.activated_at, 'YYYY-MM-DD') || ')', ', ' order by a.product), 'not used yet') as used_on
from public.license_keys k left join public.license_activations a on a.license_id = k.id
group by k.id order by k.created_at desc;

revoke all on function public.create_license_key(text, timestamptz), public.reset_license_product(text, text), public.revoke_license_key(text) from public, anon, authenticated;
revoke all on public.license_overview from anon, authenticated;
