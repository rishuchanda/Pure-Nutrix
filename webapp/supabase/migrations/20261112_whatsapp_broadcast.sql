-- WhatsApp offer broadcasts: contact opt-in, STOP opt-out, broadcast log.
-- Safe to run more than once.

-- 1) Contacts: who agreed to get offers, who said STOP, where the contact came from.
alter table public.whatsapp_contacts
  add column if not exists offers_opt_in boolean not null default false,
  add column if not exists opted_in_at timestamptz,
  add column if not exists opted_out_at timestamptz,
  add column if not exists source text,
  add column if not exists notes text;

-- 2) A customer who replies STOP is opted out; START opts them back in.
create or replace function public.whatsapp_handle_stop()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text := lower(trim(coalesce(new.message_body, '')));
begin
  if new.direction <> 'inbound' then return new; end if;
  if t in ('stop', 'unsubscribe', 'stop offers', 'band karo', 'band') then
    update public.whatsapp_contacts
       set offers_opt_in = false, opted_out_at = now()
     where phone_number = new.contact_phone;
  elsif t in ('start', 'subscribe', 'start offers') then
    update public.whatsapp_contacts
       set offers_opt_in = true, opted_out_at = null, opted_in_at = now()
     where phone_number = new.contact_phone;
  end if;
  return new;
end $$;

drop trigger if exists whatsapp_messages_stop on public.whatsapp_messages;
create trigger whatsapp_messages_stop
  after insert on public.whatsapp_messages
  for each row execute function public.whatsapp_handle_stop();

-- 3) Broadcast log (admins only).
create table if not exists public.whatsapp_broadcasts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  template_name text not null,
  template_language text not null default 'en',
  product_id uuid,
  product_name text,
  product_slug text,
  offer_text text,
  total integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  status text not null default 'sending' check (status in ('sending', 'done', 'stopped')),
  finished_at timestamptz
);

create table if not exists public.whatsapp_broadcast_recipients (
  id bigint generated always as identity primary key,
  broadcast_id uuid not null references public.whatsapp_broadcasts(id) on delete cascade,
  phone_number text not null,
  name text,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  error text,
  meta_message_id text,
  sent_at timestamptz,
  claimed_at timestamptz,
  unique (broadcast_id, phone_number)
);
create index if not exists whatsapp_broadcast_recipients_pending
  on public.whatsapp_broadcast_recipients (broadcast_id) where status = 'pending';

alter table public.whatsapp_broadcasts enable row level security;
alter table public.whatsapp_broadcast_recipients enable row level security;

drop policy if exists "admins read broadcasts" on public.whatsapp_broadcasts;
create policy "admins read broadcasts" on public.whatsapp_broadcasts
  for select using (public.is_crm_admin());
drop policy if exists "admins read broadcast recipients" on public.whatsapp_broadcast_recipients;
create policy "admins read broadcast recipients" on public.whatsapp_broadcast_recipients
  for select using (public.is_crm_admin());
-- Inserts/updates only happen in the whatsapp-broadcast edge function (service role).

-- 4) Claim the next batch of recipients so two senders never send the same message twice.
create or replace function public.claim_broadcast_batch(p_broadcast uuid, p_limit int)
returns setof public.whatsapp_broadcast_recipients
language sql security definer set search_path = public as $$
  update public.whatsapp_broadcast_recipients r
     set status = 'sending', claimed_at = now()
   where r.id in (
     select id from public.whatsapp_broadcast_recipients
      where broadcast_id = p_broadcast and status = 'pending'
      order by id
      limit p_limit
      for update skip locked)
  returning r.*;
$$;
revoke all on function public.claim_broadcast_batch(uuid, int) from public, anon, authenticated;
