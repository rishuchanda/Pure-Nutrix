-- Security hardening (14 Nov 2026). Additive; safe to run more than once.
-- 1) WhatsApp OTP: count wrong tries (verify-whatsapp-otp allows 5).
-- 2) Orders: the server re-checks price and online payment for every order a
--    customer saves. Wrong price / unpaid "prepaid" orders are NOT blocked (the
--    customer never loses an order) but get orders.price_check filled in, which
--    the admin panel and the owner alert show in red.

alter table public.whatsapp_otps add column if not exists attempts int not null default 0;

alter table public.orders add column if not exists items jsonb;                -- [{id, qty}] from checkout
alter table public.orders add column if not exists razorpay_order_id text;
alter table public.orders add column if not exists razorpay_payment_id text;
alter table public.orders add column if not exists payment_verified boolean not null default false;
alter table public.orders add column if not exists price_check text;           -- null = OK

-- Payments that razorpay-verify-payment checked with Razorpay (service role only).
create table if not exists public.razorpay_payments (
  razorpay_order_id   text primary key,
  razorpay_payment_id text not null,
  amount_paise        integer not null,
  status              text,
  verified_at         timestamptz not null default now(),
  used_by_order       uuid
);
alter table public.razorpay_payments enable row level security;
revoke all on public.razorpay_payments from anon, authenticated;

-- Price rules = checkout (OrderPage.jsx + utils/coupons.js):
--   subtotal = sum(product price x qty)   (Buy 1 Get 1: the free jar costs nothing)
--   coupon PUREJOY10 = round(10% of subtotal)
--   shipping ₹28 when subtotal < ₹499 (not for test products)
--   COD fee ₹19
-- Returns null when the items list is missing or invalid.
create or replace function public.expected_order_total(p_items jsonb, p_coupon text, p_method text)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_sub numeric := 0; v_qty int; v_price numeric; v_cat text; v_test boolean := false; e jsonb; v_disc numeric := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    return null;
  end if;
  for e in select value from jsonb_array_elements(p_items) loop
    begin v_qty := (e->>'qty')::int; exception when others then return null; end;
    if v_qty is null or v_qty < 1 or v_qty > 50 then return null; end if;
    select price, category into v_price, v_cat from public.products where id::text = e->>'id';
    if v_price is null then return null; end if;
    if upper(coalesce(v_cat, '')) = 'TEST' or v_price = 10 then v_test := true; end if;
    v_sub := v_sub + v_price * v_qty;
  end loop;
  if upper(regexp_replace(coalesce(p_coupon, ''), '\s', '', 'g')) = 'PUREJOY10' then
    v_disc := round(v_sub * 10 / 100);
  end if;
  return v_sub - v_disc
       + case when v_sub < 499 and not v_test then 28 else 0 end
       + case when coalesce(p_method, '') = 'COD' then 19 else 0 end;
end $$;
revoke all on function public.expected_order_total(jsonb, text, text) from public, anon, authenticated;
grant execute on function public.expected_order_total(jsonb, text, text) to service_role;

create or replace function public.orders_check_price()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_exp numeric; v_pay public.razorpay_payments; v_issues text[] := '{}';
begin
  -- System (service role) and admins create orders by hand: no check.
  if coalesce(auth.role(), '') = 'service_role' or public.is_crm_admin() then
    return new;
  end if;

  new.payment_verified := false;
  v_exp := public.expected_order_total(new.items, new.coupon_code, new.payment_method);
  if v_exp is null then
    v_issues := v_issues || 'items list missing (old checkout page?)'::text;
  elsif round(coalesce(new.price, 0)) <> round(v_exp) then
    v_issues := v_issues || format('price ₹%s but should be ₹%s', new.price, v_exp);
  end if;

  if coalesce(new.payment_method, '') <> 'COD' then
    select * into v_pay from public.razorpay_payments
      where razorpay_order_id = new.razorpay_order_id
        and razorpay_payment_id = new.razorpay_payment_id
      for update;
    if not found then
      v_issues := v_issues || 'online payment not verified'::text;
    elsif v_pay.used_by_order is not null then
      v_issues := v_issues || 'this payment was already used for another order'::text;
    else
      update public.razorpay_payments set used_by_order = new.id
        where razorpay_order_id = v_pay.razorpay_order_id;
      if v_pay.amount_paise <> round(coalesce(new.price, 0) * 100) then
        v_issues := v_issues || format('paid ₹%s', v_pay.amount_paise / 100.0);
      elsif v_exp is not null and v_pay.amount_paise = round(v_exp * 100) then
        new.payment_verified := true;
      end if;
    end if;
  end if;

  new.price_check := case when coalesce(array_length(v_issues, 1), 0) = 0 then null
                          else array_to_string(v_issues, '; ') end;
  if new.price_check is not null then new.payment_verified := false; end if;
  return new;
end $$;

drop trigger if exists orders_check_price on public.orders;
create trigger orders_check_price before insert on public.orders
  for each row execute function public.orders_check_price();

-- Customers may never change these after saving (they have no UPDATE policy on
-- orders today; this keeps it so even if one is added later).
create or replace function public.orders_keep_checks()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_crm_admin() then
    new.price := old.price; new.items := old.items;
    new.payment_verified := old.payment_verified; new.price_check := old.price_check;
    new.razorpay_order_id := old.razorpay_order_id; new.razorpay_payment_id := old.razorpay_payment_id;
  end if;
  return new;
end $$;
drop trigger if exists orders_keep_checks on public.orders;
create trigger orders_keep_checks before update on public.orders
  for each row execute function public.orders_keep_checks();
