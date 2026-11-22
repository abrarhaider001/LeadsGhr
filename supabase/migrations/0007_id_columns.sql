-- Every table has an `id` column (AGENTS.md, "Migrations and data"). Two tables were missing one:
--   license_activations: `id` becomes the primary key; one activation per key and product stays enforced
--                        by a unique constraint on (license_id, product).
--   user_profile:        `id` is added as a unique column; `user_id` stays the primary key that sign-in uses.
-- Existing rows get an id automatically. Safe to run more than once.

alter table public.license_activations add column if not exists id uuid not null default gen_random_uuid();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'license_activations_license_product_key' and conrelid = 'public.license_activations'::regclass) then
    alter table public.license_activations add constraint license_activations_license_product_key unique (license_id, product);
  end if;
  if exists (select 1 from pg_constraint where conname = 'license_activations_pkey' and conrelid = 'public.license_activations'::regclass
             and pg_get_constraintdef(oid) <> 'PRIMARY KEY (id)') then
    alter table public.license_activations drop constraint license_activations_pkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'license_activations_pkey' and conrelid = 'public.license_activations'::regclass) then
    alter table public.license_activations add constraint license_activations_pkey primary key (id);
  end if;
end $$;

alter table public.user_profile add column if not exists id uuid not null default gen_random_uuid();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_profile_id_key' and conrelid = 'public.user_profile'::regclass) then
    alter table public.user_profile add constraint user_profile_id_key unique (id);
  end if;
end $$;
