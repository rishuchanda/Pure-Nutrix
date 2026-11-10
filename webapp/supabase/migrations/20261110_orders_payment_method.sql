-- Record how each order is paid (COD was re-enabled at checkout on 2026-11-10).
-- Values written by the website: 'Prepaid' (Razorpay) or 'COD'. Additive, safe to re-run.
alter table public.orders add column if not exists payment_method text;
comment on column public.orders.payment_method is 'Prepaid (Razorpay) or COD — set by checkout';
