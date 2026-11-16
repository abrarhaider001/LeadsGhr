-- Individual observed tracking-pixel requests (timestamp only).
-- No recipient, subject, IP address, user agent, or message content is stored here.
create table if not exists public.mail_tracking_events (
  id bigint generated always as identity primary key,
  pixel_id uuid not null references public.mail_tracking_pixels(id) on delete cascade,
  observed_at timestamptz not null default now()
);

create index if not exists mail_tracking_events_pixel_observed_idx
  on public.mail_tracking_events (pixel_id, observed_at desc);

alter table public.mail_tracking_events enable row level security;
revoke all on public.mail_tracking_events from anon, authenticated;

-- Keep the parameter name from 0002 (`pixel_id`): Postgres cannot rename an input
-- parameter with CREATE OR REPLACE, and the Edge Function calls the RPC by that name.
-- References are qualified with the function name to avoid the column of the same name.
create or replace function public.record_mail_pixel_load(pixel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.mail_tracking_pixels
  set image_loads = image_loads + 1,
      first_loaded_at = coalesce(first_loaded_at, now()),
      last_loaded_at = now()
  where id = record_mail_pixel_load.pixel_id
    and armed_at is not null
    and now() > armed_at + interval '3 seconds';

  if found then
    insert into public.mail_tracking_events (pixel_id) values (record_mail_pixel_load.pixel_id);
  end if;
end;
$$;

revoke all on function public.record_mail_pixel_load(uuid) from public, anon, authenticated;
grant execute on function public.record_mail_pixel_load(uuid) to service_role;
