-- Order alerts for the shop owner: phone notification (Web Push) + optional email.
-- Additive only and safe to run more than once. Does not change existing orders.

create extension if not exists pg_net with schema extensions;

-- 1. Which admin phones/browsers should get alerts.
create table if not exists public.admin_push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid default auth.uid(),
  endpoint     text not null unique,
  subscription jsonb not null,
  device       text,
  created_at   timestamptz not null default now()
);
alter table public.admin_push_subscriptions enable row level security;
drop policy if exists "admin push subs: admins all" on public.admin_push_subscriptions;
create policy "admin push subs: admins all" on public.admin_push_subscriptions
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

-- 2. Web Push key pair. Created by the notify-new-order function itself.
--    RLS on with no policies = only the service role (the function) can read it.
create table if not exists public.push_vapid_keys (
  id          int primary key default 1 check (id = 1),
  public_key  text not null,
  private_jwk jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.push_vapid_keys enable row level security;
revoke all on public.push_vapid_keys from anon, authenticated;

-- 3. Where to email order alerts (set from Admin → Overview → Order alerts).
create table if not exists public.order_alert_settings (
  id            int primary key default 1 check (id = 1),
  alert_email   text,
  email_enabled boolean not null default true,
  updated_at    timestamptz not null default now()
);
alter table public.order_alert_settings enable row level security;
drop policy if exists "order alert settings: admins all" on public.order_alert_settings;
create policy "order alert settings: admins all" on public.order_alert_settings
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());
insert into public.order_alert_settings (id) values (1) on conflict (id) do nothing;

-- 4. Each order is alerted only once.
alter table public.orders add column if not exists notified_at timestamptz;

-- 5. On every new order, ask the function to send the alert (in the background).
--    Any error here is swallowed so an order can never fail because of alerts.
create or replace function public.notify_new_order()
returns trigger
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  begin
    perform net.http_post(
      url     := 'https://fhxlzzjsoalrmkykhacz.supabase.co/functions/v1/notify-new-order',
      body    := jsonb_build_object('order_id', new.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        -- public anon key (same one the website uses); lets the call pass the gateway
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeGx6empzb2Fscm1reWtoYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMzI4OTEsImV4cCI6MjA5OTkwODg5MX0.SynfgiOO394Bmw1r_XlYtTHQnG0KutZybL8TwznjZMM'
      ),
      timeout_milliseconds := 8000
    );
  exception when others then
    raise warning 'notify_new_order failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists orders_notify_new on public.orders;
create trigger orders_notify_new
  after insert on public.orders
  for each row execute function public.notify_new_order();
