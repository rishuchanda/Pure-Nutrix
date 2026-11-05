-- Lab reports behind a QR code (e.g. Liposomal Glutathione).
-- The QR always opens https://purenutrix.in/lab-report/<slug>; the admin can
-- replace the report file at any time without changing the QR.
-- Additive only and safe to run more than once.

-- 1. One row per product report
create table if not exists public.lab_reports (
  slug         text primary key,                 -- part of the QR link, never change it after printing
  product_name text not null,
  batch_no     text,
  file_path    text,                             -- path inside the lab-reports bucket
  file_name    text,
  file_type    text,                             -- application/pdf, image/jpeg ...
  is_active    boolean not null default true,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- 2. Who opened a report (first name, last name, mobile)
create table if not exists public.lab_report_leads (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null,
  first_name text not null,
  last_name  text not null,
  mobile     text not null,
  created_at timestamptz not null default now()
);
create index if not exists lab_report_leads_slug_created on public.lab_report_leads (slug, created_at desc);

alter table public.lab_reports enable row level security;
alter table public.lab_report_leads enable row level security;

-- Only admins read or change these tables directly. Customers go through the
-- two functions below, which never expose other customers' details.
drop policy if exists "lab reports: admins all" on public.lab_reports;
create policy "lab reports: admins all" on public.lab_reports
  for all to authenticated
  using (public.is_crm_admin()) with check (public.is_crm_admin());

drop policy if exists "lab report leads: admins read" on public.lab_report_leads;
create policy "lab report leads: admins read" on public.lab_report_leads
  for select to authenticated
  using (public.is_crm_admin());

-- 3. First report
insert into public.lab_reports (slug, product_name)
values ('liposomal-glutathione', 'Liposomal Glutathione')
on conflict (slug) do nothing;

-- 4. Page header before the form (no file link here)
create or replace function public.lab_report_info(p_slug text)
returns table (product_name text, batch_no text, has_report boolean, updated_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select r.product_name, r.batch_no, (r.file_path is not null), r.updated_at
  from public.lab_reports r
  where r.slug = p_slug and r.is_active;
$$;

-- 5. Customer submits name + mobile → saved as a lead → gets the report file
create or replace function public.open_lab_report(p_slug text, p_first_name text, p_last_name text, p_mobile text)
returns json
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_first  text := btrim(coalesce(p_first_name, ''));
  v_last   text := btrim(coalesce(p_last_name, ''));
  v_mobile text := regexp_replace(coalesce(p_mobile, ''), '\D', '', 'g');
  r public.lab_reports;
begin
  if length(v_mobile) = 12 and left(v_mobile, 2) = '91' then v_mobile := right(v_mobile, 10); end if;
  if length(v_mobile) = 11 and left(v_mobile, 1) = '0'  then v_mobile := right(v_mobile, 10); end if;

  if length(v_first) < 1 or length(v_first) > 50 then raise exception 'invalid_first_name'; end if;
  if length(v_last)  < 1 or length(v_last)  > 50 then raise exception 'invalid_last_name';  end if;
  if v_mobile !~ '^[6-9][0-9]{9}$' then raise exception 'invalid_mobile'; end if;

  select * into r from public.lab_reports where slug = p_slug and is_active;
  if not found or r.file_path is null then raise exception 'report_not_available'; end if;

  insert into public.lab_report_leads (slug, first_name, last_name, mobile)
  values (p_slug, v_first, v_last, v_mobile);

  return json_build_object(
    'product_name', r.product_name,
    'batch_no',     r.batch_no,
    'file_path',    r.file_path,
    'file_name',    r.file_name,
    'file_type',    r.file_type,
    'updated_at',   r.updated_at
  );
end;
$$;

revoke all on function public.lab_report_info(text) from public;
revoke all on function public.open_lab_report(text, text, text, text) from public;
grant execute on function public.lab_report_info(text) to anon, authenticated;
grant execute on function public.open_lab_report(text, text, text, text) to anon, authenticated;

-- 6. Report files. Public bucket so phones can open the PDF/image directly,
--    but each file gets a random name, and the name is only handed out after
--    the form is filled. Max 20 MB; PDF or image only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lab-reports', 'lab-reports', true, 20971520,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "lab reports files: admins upload" on storage.objects;
create policy "lab reports files: admins upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lab-reports' and public.is_crm_admin());

drop policy if exists "lab reports files: admins read" on storage.objects;
create policy "lab reports files: admins read" on storage.objects
  for select to authenticated
  using (bucket_id = 'lab-reports' and public.is_crm_admin());
