-- Opaque tracking tokens only. Message addresses and content remain in Chrome storage.
create table if not exists public.mail_tracking_pixels (
  id uuid primary key,
  image_loads integer not null default 0 check (image_loads >= 0),
  armed_at timestamptz,
  first_loaded_at timestamptz,
  last_loaded_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.mail_tracking_pixels enable row level security;
-- The Edge Function uses its service role; browser clients have no direct table access.
revoke all on public.mail_tracking_pixels from anon, authenticated;

create or replace function public.record_mail_pixel_load(pixel_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.mail_tracking_pixels
  set image_loads = image_loads + 1,
      first_loaded_at = coalesce(first_loaded_at, now()),
      last_loaded_at = now()
  where id = pixel_id and armed_at is not null and now() > armed_at + interval '3 seconds';
$$;
revoke all on function public.record_mail_pixel_load(uuid) from public, anon, authenticated;
grant execute on function public.record_mail_pixel_load(uuid) to service_role;
