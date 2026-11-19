-- LeadsGhr license keys become 32 characters with letters, digits, and special characters (AGENTS.md, "License keys").
--
-- A new key is still made from the person's name, email, the creation time, and a random part, hashed with
-- SHA-256; each of the 32 hash bytes picks one character from a 64-character alphabet, so every character is
-- equally likely. The alphabet leaves out look-alikes (I, O, l, o, 0, 1) and quote or space characters:
--   ABCDEFGHJKLMNPQRSTUVWXYZ abcdefghijkmnpqrstuvwxyz 23456789 !@#$%&*?
-- Every new key contains at least one capital letter, small letter, digit, and special character.
-- Keys are case-sensitive. 64-character keys made by 0005 keep working.
--
-- Safe to run more than once. Owner command is unchanged:
--   select public.create_license_key('Ali Khan', 'ali@example.com', '2026-12-31');   -- returns the new 32-character key

alter table public.license_keys drop constraint if exists license_keys_license_key_check;
alter table public.license_keys drop constraint if exists license_keys_license_key_format;
alter table public.license_keys add constraint license_keys_license_key_format
  check (license_key ~ '^[0-9a-f]{64}$' or license_key ~ '^[A-HJ-NP-Za-km-np-z2-9!@#$%&*?]{32}$');

-- Same rules as packages/license normalizeLicenseKey: spaces and line breaks are removed; a 32-character key
-- must match exactly (case-sensitive); an older 64-character hex key is accepted in any case.
create or replace function public.normalize_license_key(p_key text) returns text
language sql immutable set search_path = public as $$
  select case
    when k ~ '^[A-HJ-NP-Za-km-np-z2-9!@#$%&*?]{32}$' then k
    when k ~ '^[0-9A-Fa-f]{64}$' then lower(k)
  end
  from (select regexp_replace(coalesce(p_key, ''), '\s', '', 'g') as k) as input
$$;

create or replace function public.create_license_key(p_name text, p_email text, p_expires_at timestamptz) returns text
language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?';
  digest bytea;
  new_key text;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter the person''s name'; end if;
  if coalesce(trim(p_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address'; end if;
  if p_expires_at is null or p_expires_at <= now() then raise exception 'Choose an expiry date in the future'; end if;
  loop
    -- Name, email, and the exact creation time, merged with a random part and hashed with SHA-256 (32 bytes).
    digest := sha256(convert_to(trim(p_name) || '|' || lower(trim(p_email)) || '|' || clock_timestamp()::text || '|' || gen_random_uuid()::text, 'UTF8'));
    new_key := '';
    for i in 0..31 loop
      new_key := new_key || substr(alphabet, get_byte(digest, i) % 64 + 1, 1);
    end loop;
    exit when new_key ~ '[A-Z]' and new_key ~ '[a-z]' and new_key ~ '[2-9]' and new_key ~ '[!@#$%&*?]'
      and not exists (select 1 from public.license_keys where license_key = new_key);
  end loop;
  insert into public.license_keys (license_key, name, email, expires_at) values (new_key, trim(p_name), lower(trim(p_email)), p_expires_at);
  return new_key;
end $$;

revoke all on function public.create_license_key(text, text, timestamptz) from public, anon, authenticated;
