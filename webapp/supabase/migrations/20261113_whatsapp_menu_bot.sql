-- WhatsApp menu bot: settings, per-contact pause (when a customer asks for a person),
-- and no owner phone alert for menu taps (only real messages / "Talk to our team").
-- Additive, safe to run more than once.

alter table public.whatsapp_contacts add column if not exists bot_paused_until timestamptz;
-- Customer asked to cancel on WhatsApp (admin confirms and changes the status).
alter table public.orders add column if not exists cancel_requested_at timestamptz;

create table if not exists public.whatsapp_bot_settings (
  id            int primary key default 1 check (id = 1),
  enabled       boolean not null default true,
  welcome_text  text not null default 'Welcome to Pure Nutrix 🌿 Buy 1 Get 1 FREE on every product. Please choose an option below 👇',
  offer_text    text not null default '🎁 Buy 1 Get 1 FREE on every product.
➕ Extra 10% off with code PUREJOY10 at checkout.
🚚 Free delivery on orders above ₹499. Cash on Delivery available (+₹19).',
  support_hours text not null default '10 AM – 7 PM, Monday to Saturday',
  updated_at    timestamptz not null default now()
);
insert into public.whatsapp_bot_settings (id) values (1) on conflict (id) do nothing;

alter table public.whatsapp_bot_settings enable row level security;
drop policy if exists "bot settings: admins all" on public.whatsapp_bot_settings;
create policy "bot settings: admins all" on public.whatsapp_bot_settings
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

-- Menu taps (interactive replies) don't ping the owner's phone; the bot itself
-- calls the alert when the customer picks "Talk to our team".
drop trigger if exists whatsapp_messages_notify_owner on public.whatsapp_messages;
create trigger whatsapp_messages_notify_owner
  after insert on public.whatsapp_messages
  for each row when (new.direction = 'inbound' and coalesce(new.message_type, 'text') <> 'interactive')
  execute function public.notify_inbound_whatsapp();
