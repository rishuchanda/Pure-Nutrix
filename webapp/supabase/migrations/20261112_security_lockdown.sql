-- Security lockdown (12 Nov 2026). Run ONLY after 20261112_security_audit.sql
-- output is saved. Edge functions use the service role and are not affected.
-- The storefront never reads profiles; the admin panel uses admin_roles.

-- ── profiles: each user sees/edits only their own row, admins see all ──
alter table public.profiles enable row level security;
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='profiles' loop
    execute format('drop policy %I on public.profiles', r.policyname);
  end loop;
end $$;
create policy "profiles: own row read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: admins read"    on public.profiles for select to authenticated using (public.is_crm_admin());
create policy "profiles: own row insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles: own row update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke all on public.profiles from anon;

-- A customer must never be able to make himself admin.
create or replace function public.profiles_keep_is_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_crm_admin() then
    if tg_op = 'INSERT' then new.is_admin := false;
    elsif new.is_admin is distinct from old.is_admin then new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_keep_is_admin on public.profiles;
create trigger profiles_keep_is_admin before insert or update on public.profiles
  for each row execute function public.profiles_keep_is_admin();

-- ── WhatsApp CRM tables + webhook logs: admins only (token lives here) ──
do $$ declare t text; r record; begin
  foreach t in array array['whatsapp_settings','whatsapp_contacts','whatsapp_messages','webhook_logs'] loop
    if to_regclass('public.'||t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    for r in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I', r.policyname, t);
    end loop;
    execute format('create policy "admins all" on public.%I for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin())', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- ── push_subscriptions: each user only their own row ──
alter table public.push_subscriptions enable row level security;
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='push_subscriptions' loop
    execute format('drop policy %I on public.push_subscriptions', r.policyname);
  end loop;
end $$;
create policy "push: own rows" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.push_subscriptions from anon;
