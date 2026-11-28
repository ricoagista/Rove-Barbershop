-- Status shift capster harian untuk booking publik dan validasi UI.
create or replace view public.public_capster_shifts as
select id, tanggal, uid, status
from public.shifts
where role = 'capster' and tanggal = (now() at time zone 'Asia/Jakarta')::date;

grant select on public.public_capster_shifts to anon, authenticated;
