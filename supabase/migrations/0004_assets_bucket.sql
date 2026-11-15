-- Public storage bucket "assets" for files that LeadsGhr shows publicly (for example images inside outgoing emails).
-- Every file goes in a folder named for its purpose, e.g. email-assets/leadsghr-mailer-logo.png.
-- Only public, non-sensitive files belong here: never upload leads, recipients, subjects, message bodies, or exports.
-- Objects are readable by anyone through their public URL; uploads need the service role (no client policies).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets', 'assets', true, 524288, array['image/png', 'image/jpeg', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
