-- Coupon on orders (e.g. PUREJOY10). Additive only, safe to run more than once.
alter table public.orders
  add column if not exists coupon_code     text,     -- e.g. PUREJOY10
  add column if not exists discount_amount numeric;  -- rupees taken off the product subtotal
