-- Read-only staging verification. Do not run from the application.
select n.nspname as schema_name, p.proname, pg_get_function_identity_arguments(p.oid) as arguments, pg_get_function_result(p.oid) as result
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('buat_booking','set_booking_status','buat_penjualan','set_booking_slot_closure')
order by p.proname, arguments;

select routine_schema, routine_name, specific_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema='public' and routine_name in ('buat_booking','set_booking_status','buat_penjualan','set_booking_slot_closure')
order by routine_name, grantee;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='public' and tablename in ('bookings','sales') order by tablename, policyname;

select table_schema, table_name, column_name, ordinal_position, data_type
from information_schema.columns
where table_schema='public' and table_name in ('public_booking_settings','public_booked_slots','bookings')
order by table_name, ordinal_position;

select table_schema, table_name from information_schema.views
where table_schema='public' and table_name in ('public_booking_settings','public_booked_slots');

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='bookings' and column_name='people_count';
