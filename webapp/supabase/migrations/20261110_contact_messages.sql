-- Contact form on /support: messages are saved here and shown in Admin → Messages.
-- Additive only and safe to run more than once.

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text,
  order_id   text,
  message    text not null,
  status     text not null default 'new',   -- new / done
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_created on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Only admins can read or update messages directly.
drop policy if exists "contact messages: admins read" on public.contact_messages;
create policy "contact messages: admins read" on public.contact_messages
  for select to authenticated using (public.is_crm_admin());

drop policy if exists "contact messages: admins update" on public.contact_messages;
create policy "contact messages: admins update" on public.contact_messages
  for update to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

-- Customers submit through this function (validates lengths, no read access).
create or replace function public.submit_contact_message(p_name text, p_email text, p_phone text, p_order_id text, p_message text)
returns boolean
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_name    text := btrim(coalesce(p_name, ''));
  v_email   text := btrim(coalesce(p_email, ''));
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_order   text := btrim(coalesce(p_order_id, ''));
  v_message text := btrim(coalesce(p_message, ''));
begin
  if length(v_name) < 1 or length(v_name) > 80 then raise exception 'invalid_name'; end if;
  if length(v_message) < 2 or length(v_message) > 2000 then raise exception 'invalid_message'; end if;
  if length(v_email) > 120 or (v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'invalid_email'; end if;
  if length(v_phone) > 16 then raise exception 'invalid_phone'; end if;
  if length(v_order) > 60 then raise exception 'invalid_order'; end if;

  -- simple flood guard: max 5 messages per phone/email per hour
  if (select count(*) from public.contact_messages
       where created_at > now() - interval '1 hour'
         and ((v_phone <> '' and phone = v_phone) or (v_email <> '' and email = v_email))) >= 5 then
    raise exception 'too_many';
  end if;

  insert into public.contact_messages (name, email, phone, order_id, message)
  values (v_name, nullif(v_email, ''), nullif(v_phone, ''), nullif(v_order, ''), v_message);
  return true;
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text) to anon, authenticated;
