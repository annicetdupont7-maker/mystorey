-- Audit consolidé en lecture seule de la base Supabase MYSTOREY.
-- Retourne un seul résultat JSON. Ne modifie aucune donnée ni aucun objet.
with expected(table_name) as (
  values
    ('profiles'), ('stores'), ('store_themes'), ('products'), ('categories'),
    ('orders'), ('order_status_history'), ('subscription_plans'),
    ('seller_subscriptions'), ('wave_payments'), ('fedapay_payments'),
    ('customer_contacts'), ('reengagement_logs')
), existing as (
  select table_schema, table_name
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
), table_report as (
  select jsonb_agg(jsonb_build_object(
    'table_name', e.table_name,
    'exists', (x.table_name is not null),
    'schema', coalesce(x.table_schema, 'public')
  ) order by e.table_name) as value
  from expected e
  left join existing x on x.table_name = e.table_name
), columns_report as (
  select jsonb_agg(jsonb_build_object(
    'table_name', c.table_name,
    'column_name', c.column_name,
    'data_type', c.data_type,
    'udt_name', c.udt_name,
    'is_nullable', c.is_nullable,
    'column_default', c.column_default
  ) order by c.table_name, c.ordinal_position) as value
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in (select table_name from expected)
), rls_report as (
  select jsonb_agg(jsonb_build_object(
    'schema_name', n.nspname,
    'table_name', c.relname,
    'rls_enabled', c.relrowsecurity,
    'rls_forced', c.relforcerowsecurity
  ) order by n.nspname, c.relname) as value
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'storage') and c.relkind = 'r'
), policies_report as (
  select jsonb_agg(jsonb_build_object(
    'schema_name', schemaname,
    'table_name', tablename,
    'policy_name', policyname,
    'roles', roles,
    'command', cmd,
    'using', qual,
    'with_check', with_check
  ) order by schemaname, tablename, policyname) as value
  from pg_policies
  where schemaname in ('public', 'storage')
), buckets_report as (
  select jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'public', public,
    'file_size_limit', file_size_limit,
    'allowed_mime_types', allowed_mime_types
  ) order by id) as value
  from storage.buckets
), payment_subscription_report as (
  select jsonb_agg(jsonb_build_object(
    'table_name', e.table_name,
    'exists', (x.table_name is not null),
    'rls_enabled', coalesce(r.relrowsecurity, false),
    'policy_count', coalesce(p.policy_count, 0)
  ) order by e.table_name) as value
  from (values
    ('subscription_plans'), ('seller_subscriptions'), ('wave_payments'), ('fedapay_payments')
  ) e(table_name)
  left join existing x on x.table_name = e.table_name
  left join pg_class r on r.relname = e.table_name
    and r.relnamespace = 'public'::regnamespace
    and r.relkind = 'r'
  left join (
    select tablename, count(*)::integer as policy_count
    from pg_policies
    where schemaname = 'public'
    group by tablename
  ) p on p.tablename = e.table_name
)
select jsonb_build_object(
  'tables', (select value from table_report),
  'columns', (select value from columns_report),
  'rls', (select value from rls_report),
  'policies', (select value from policies_report),
  'storage_buckets', (select value from buckets_report),
  'subscriptions_and_payments', (select value from payment_subscription_report)
) as consolidated_audit;
