-- WhatsApp CRM: send & receive photos, videos, voice notes and documents.
-- Additive only: new nullable columns, one new private bucket, two storage policies.
-- Safe to run more than once.

-- 1. Where a message's file lives
alter table public.whatsapp_messages
  add column if not exists media_path     text,    -- path inside the whatsapp-media bucket
  add column if not exists media_mime     text,    -- e.g. image/jpeg, application/pdf
  add column if not exists media_filename text,    -- original document name
  add column if not exists media_size     bigint;  -- bytes

-- 2. "Is the logged-in user an admin?" — used by the storage policies below.
create or replace function public.is_crm_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_roles where id = auth.uid());
$$;
revoke all on function public.is_crm_admin() from public;
grant execute on function public.is_crm_admin() to authenticated;

-- 3. PRIVATE bucket: customer photos/documents are never public.
--    50 MB = Supabase free-plan upload limit. Edge functions use the service role and bypass these policies.
insert into storage.buckets (id, name, public, file_size_limit)
values ('whatsapp-media', 'whatsapp-media', false, 52428800)
on conflict (id) do nothing;

-- 4. Only admins can view or upload files in it (no update/delete from the browser).
drop policy if exists "whatsapp media: admins read" on storage.objects;
create policy "whatsapp media: admins read" on storage.objects
  for select to authenticated
  using (bucket_id = 'whatsapp-media' and public.is_crm_admin());

drop policy if exists "whatsapp media: admins upload" on storage.objects;
create policy "whatsapp media: admins upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'whatsapp-media' and public.is_crm_admin());
