-- 1) Customer reviews saved in the database (they were only in the customer's
--    own browser before, so nobody else ever saw them).
-- 2) WhatsApp order messages sent by the server (notify-new-order) on new
--    orders and when the admin changes the status to shipped / out for
--    delivery / delivered.
-- Additive only and safe to run more than once.

-- ---------- Reviews ----------
create table if not exists public.product_reviews (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid references public.products(id) on delete set null,
  product_name   text not null,
  user_id        uuid not null default auth.uid(),
  customer_name  text not null,
  customer_email text,
  rating         int  not null check (rating between 1 and 5),
  comment        text not null,
  photos         text[] not null default '{}',
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  verified_buyer boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists product_reviews_product on public.product_reviews (product_id, status);
create unique index if not exists product_reviews_one_per_user on public.product_reviews (user_id, product_id);

alter table public.product_reviews enable row level security;

drop policy if exists "reviews: public reads approved" on public.product_reviews;
create policy "reviews: public reads approved" on public.product_reviews
  for select to anon, authenticated using (status = 'approved');

drop policy if exists "reviews: owner reads own" on public.product_reviews;
create policy "reviews: owner reads own" on public.product_reviews
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "reviews: admins all" on public.product_reviews;
create policy "reviews: admins all" on public.product_reviews
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

-- Customers submit (or edit their own) review through this function.
-- Every new or edited review goes back to 'pending' until an admin approves it.
create or replace function public.submit_product_review(
  p_product_id uuid, p_name text, p_rating int, p_comment text, p_photos text[] default '{}'
) returns uuid
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_name    text := btrim(coalesce(p_name, ''));
  v_comment text := btrim(coalesce(p_comment, ''));
  v_photos  text[] := coalesce(p_photos, '{}');
  v_product record;
  v_email   text;
  v_bought  boolean;
  v_id      uuid;
  p         text;
begin
  if v_uid is null then raise exception 'login_required'; end if;
  select id, name into v_product from public.products where id = p_product_id;
  if not found then raise exception 'invalid_product'; end if;
  if length(v_name) < 2 or length(v_name) > 60 then raise exception 'invalid_name'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'invalid_rating'; end if;
  if length(v_comment) < 10 or length(v_comment) > 1500 then raise exception 'invalid_comment'; end if;
  if array_length(v_photos, 1) > 3 then raise exception 'too_many_photos'; end if;
  foreach p in array v_photos loop
    -- only photos uploaded to our own review-photos bucket, in the customer's folder
    if p !~ ('^https://fhxlzzjsoalrmkykhacz\.supabase\.co/storage/v1/object/public/review-photos/' || v_uid::text || '/[A-Za-z0-9._-]+$') then
      raise exception 'invalid_photo';
    end if;
  end loop;
  if (select count(*) from public.product_reviews where user_id = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many';
  end if;

  select email into v_email from auth.users where id = v_uid;
  select exists (
    select 1 from public.orders o
    where o.user_id = v_uid
      and lower(coalesce(o.status, '')) not in ('cancelled', 'returned')
      and o.product_name ilike '%' || v_product.name || '%'
  ) into v_bought;

  insert into public.product_reviews as r
    (product_id, product_name, user_id, customer_name, customer_email, rating, comment, photos, verified_buyer)
  values
    (v_product.id, v_product.name, v_uid, v_name, nullif(v_email, ''), p_rating, v_comment, v_photos, v_bought)
  on conflict (user_id, product_id) do update set
    customer_name = excluded.customer_name, rating = excluded.rating, comment = excluded.comment,
    photos = excluded.photos, verified_buyer = excluded.verified_buyer,
    status = 'pending', updated_at = now()
  returning r.id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_product_review(uuid, text, int, text, text[]) from public, anon;
grant execute on function public.submit_product_review(uuid, text, int, text, text[]) to authenticated;

-- Review photos: public bucket (only approved reviews link to them), images only, 5 MB,
-- each customer can upload only into their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "review photos: customers upload own folder" on storage.objects;
create policy "review photos: customers upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- WhatsApp order messages ----------
alter table public.orders add column if not exists whatsapp_confirmed_at timestamptz;
alter table public.orders add column if not exists whatsapp_status_sent text;

-- Status changes (shipped / out for delivery / delivered) → server sends the update.
create or replace function public.notify_order_status()
returns trigger
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if lower(coalesce(new.status, '')) in ('shipped', 'out_for_delivery', 'delivered')
     and lower(coalesce(new.status, '')) is distinct from lower(coalesce(old.status, '')) then
    begin
      perform net.http_post(
        url     := 'https://fhxlzzjsoalrmkykhacz.supabase.co/functions/v1/notify-new-order',
        body    := jsonb_build_object('status_order_id', new.id),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeGx6empzb2Fscm1reWtoYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMzI4OTEsImV4cCI6MjA5OTkwODg5MX0.SynfgiOO394Bmw1r_XlYtTHQnG0KutZybL8TwznjZMM'
        ),
        timeout_milliseconds := 8000
      );
    exception when others then
      raise warning 'notify_order_status failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_notify_status on public.orders;
create trigger orders_notify_status
  after update of status on public.orders
  for each row execute function public.notify_order_status();
