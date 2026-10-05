insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 15728640, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']),
       ('sources', 'sources', false, 52428800, array[
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do nothing;
-- No storage policies: the browser uploads only through signed URLs issued by the API.
