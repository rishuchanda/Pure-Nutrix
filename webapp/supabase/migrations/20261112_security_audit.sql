-- READ-ONLY audit. Run first and save the output (it is the backup of the
-- current policies). Changes nothing.

-- 1) Every public table: is RLS on?
select c.relname as table_name, c.relrowsecurity as rls_on
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- 2) Every policy (name, roles, command, rule).
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;

-- 3) What the anon role can read without logging in (row counts only, no data).
--    Run this block in a new query with: set local role anon;
-- set local role anon;
-- select 'profiles' t, count(*) from public.profiles
-- union all select 'orders', count(*) from public.orders
-- union all select 'user_addresses', count(*) from public.user_addresses
-- union all select 'admin_roles', count(*) from public.admin_roles
-- union all select 'contact_messages', count(*) from public.contact_messages;

-- 4) Who is marked admin in profiles vs admin_roles (ids only).
select p.id, p.is_admin, (a.id is not null) as in_admin_roles
from public.profiles p left join public.admin_roles a on a.id = p.id
where p.is_admin is true or a.id is not null;

-- 5) Functions the site calls without login: do they run as owner (security definer)?
select p.proname, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('get_active_whatsapp_number','submit_contact_message','submit_product_review','is_crm_admin');
