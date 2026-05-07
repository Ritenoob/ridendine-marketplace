with expected(role_name, expected_count) as (
  values
    ('chefs', 3),
    ('drivers', 3),
    ('customers', 3),
    ('orders', 3),
    ('ledger_entries', 20),
    ('payout_runs', 1),
    ('reconciliation_rows', 1),
    ('promo_codes', 1),
    ('support_tickets', 1),
    ('notifications', 1)
),
actual(role_name, actual_count) as (
  select 'chefs', count(*)::int from public.chef_profiles where display_name like 'Test Dummy Chef %'
  union all
  select 'drivers', count(*)::int from public.drivers where first_name = 'Test Dummy' and last_name like 'Driver %'
  union all
  select 'customers', count(*)::int from public.customers where first_name = 'Test Dummy' and last_name like 'Customer %'
  union all
  select 'orders', count(*)::int from public.orders where order_number like 'RDDUMMY-%'
  union all
  select 'ledger_entries', count(*)::int
  from public.ledger_entries
  where idempotency_key like 'local-dummy-%'
  union all
  select 'payout_runs', count(*)::int from public.payout_runs where id = '64000000-0000-0000-0000-000000000001'
  union all
  select 'reconciliation_rows', count(*)::int from public.stripe_reconciliation where id = '65000000-0000-0000-0000-000000000001'
  union all
  select 'promo_codes', count(*)::int from public.promo_codes where code = 'TESTDUMMY10'
  union all
  select 'support_tickets', count(*)::int from public.support_tickets where id = '66000000-0000-0000-0000-000000000001'
  union all
  select 'notifications', count(*)::int from public.notifications where id = '67000000-0000-0000-0000-000000000001'
)
select
  expected.role_name,
  actual.actual_count,
  expected.expected_count,
  case when actual.actual_count >= expected.expected_count then 'ok' else 'missing' end as status
from expected
join actual using (role_name)
order by expected.role_name;
