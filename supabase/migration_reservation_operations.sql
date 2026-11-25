-- Jalankan setelah backup. Tidak dijalankan oleh aplikasi/agent.
create table if not exists public.booking_slot_closures (
  id uuid primary key default gen_random_uuid(), tanggal date not null,
  jam text not null check (jam ~ '^[0-2][0-9]:[0-5][0-9]$'),
  kap_id uuid references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists booking_slot_closures_unique
  on public.booking_slot_closures (tanggal, jam, kap_id) nulls not distinct;
create index if not exists booking_slot_closures_date on public.booking_slot_closures(tanggal);

insert into public.settings(id, data) values
('operasional', '{"jam_buka":"13:00","jam_tutup":"21:00","batas_reservasi_terakhir":"19:00"}'::jsonb)
on conflict (id) do update set data = public.settings.data || excluded.data;

create or replace view public.public_booking_settings as
select
  coalesce((select data->>'jam_buka' from public.settings where id='operasional'),'13:00') as jam_buka,
  coalesce((select data->>'jam_tutup' from public.settings where id='operasional'),'21:00') as jam_tutup,
  coalesce((select data->>'batas_reservasi_terakhir' from public.settings where id='operasional'),'19:00') as batas_reservasi_terakhir,
  coalesce((select data->'kontak' from public.settings where id='kontak'),'{}'::jsonb) as kontak,
  coalesce((select data->'pol' from public.settings where id='utama'),'[]'::jsonb) as booking_policy;
create or replace view public.public_booked_slots as
select id, kap_id, tanggal, jam, 'booking'::text as sumber from public.bookings where status in ('Baru','Hadir')
union all select id, kap_id, tanggal, jam, 'ditutup'::text from public.booking_slot_closures;
grant select on public.public_booking_settings, public.public_booked_slots to anon, authenticated;

alter table public.booking_slot_closures enable row level security;
drop policy if exists closure_staff_read on public.booking_slot_closures;
create policy closure_staff_read on public.booking_slot_closures for select to authenticated using (is_staff());

drop function if exists public.set_booking_slot_closure(date,text,uuid,boolean);
create or replace function public.set_booking_slot_closure(p_tanggal date,p_jam text,p_kap_id uuid,p_closed boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from profiles where id=auth.uid() and role in ('owner','kasir')) then raise exception 'Hanya Owner atau Kasir yang boleh mengatur penutupan slot.'; end if;
 if p_tanggal is null or p_jam !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'Tanggal atau jam tidak valid.'; end if;
 perform pg_advisory_xact_lock(hashtext('rove_booking_date_'||p_tanggal::text));
 if p_closed then
   if p_kap_id is null and exists(select 1 from booking_slot_closures where tanggal=p_tanggal and jam=p_jam and kap_id is not null) then raise exception 'Buka penutupan capster terlebih dahulu sebelum menutup semua capster.'; end if;
   if p_kap_id is not null and exists(select 1 from booking_slot_closures where tanggal=p_tanggal and jam=p_jam and kap_id is null) then raise exception 'Buka penutupan semua capster terlebih dahulu.'; end if;
   insert into booking_slot_closures(tanggal,jam,kap_id,created_by) values(p_tanggal,p_jam,p_kap_id,auth.uid()) on conflict do nothing;
 else delete from booking_slot_closures where tanggal=p_tanggal and jam=p_jam and kap_id is not distinct from p_kap_id;
 end if;
end $$;
revoke all on function public.set_booking_slot_closure(date,text,uuid,boolean) from public;
grant execute on function public.set_booking_slot_closure(date,text,uuid,boolean) to authenticated;

-- Ganti RPC booking dengan validasi WIB dan lock bersama per tanggal.
drop function if exists public.buat_booking(uuid[], date, text, uuid, text, text);
create or replace function public.buat_booking(p_svc_ids uuid[], p_tanggal date, p_jam text, p_kap_id uuid, p_nama text, p_wa text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; x uuid; items jsonb:='[]'; total int:=0; names text:=''; mins int; now_wib timestamp; outrow bookings%rowtype; n int;
begin
 now_wib:=now() at time zone 'Asia/Jakarta';
 if trim(coalesce(p_nama,''))='' or regexp_replace(coalesce(p_wa,''),'\D','','g') !~ '^62[0-9]{8,13}$' then raise exception 'Data pelanggan tidak valid.'; end if;
 if p_tanggal is null or p_jam !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'Tanggal atau jam tidak valid.'; end if;
 mins:=split_part(p_jam,':',1)::int*60+split_part(p_jam,':',2)::int;
 if mins < 780 or mins > 1140 then raise exception 'Jam layanan di luar jam operasional.'; end if;
 if (p_tanggal::text||' '||p_jam)::timestamp < now_wib + interval '60 minutes' then raise exception 'Reservasi minimal 60 menit sebelum layanan.'; end if;
 if not exists(select 1 from profiles where id=p_kap_id and role='capster') then raise exception 'Capster tidak ditemukan.'; end if;
 if exists(select 1 from booking_slot_closures c where c.tanggal=p_tanggal and c.jam=p_jam and (c.kap_id is null or c.kap_id=p_kap_id)) then raise exception 'Slot ini ditutup.'; end if;
 perform pg_advisory_xact_lock(hashtext('rove_booking_date_'||p_tanggal::text));
 if exists(select 1 from bookings b where b.tanggal=p_tanggal and b.kap_id=p_kap_id and b.status in ('Baru','Hadir') and abs(split_part(b.jam,':',1)::int*60+split_part(b.jam,':',2)::int-mins)<30) then raise exception 'Capster sudah dipesan di waktu ini.'; end if;
 foreach x in array p_svc_ids loop select id,nama,harga into r from services where id=x; if found then items:=items||jsonb_build_array(jsonb_build_object('id',r.id,'nama',r.nama,'harga',r.harga)); total:=total+r.harga; names:=names||case when names='' then '' else ', ' end||r.nama; end if; end loop;
 if names='' then raise exception 'Pilih minimal satu layanan.'; end if;
 select count(*)+1 into n from bookings b0 where b0.tgl_buat=(now() at time zone 'Asia/Jakarta')::date;
 insert into bookings(nomor,tgl_buat,items,svc_nama,harga,tanggal,jam,kap_id,kap_nama,nama,wa,status)
 select 'BK-'||to_char(now_wib,'YYMMDD')||'-'||lpad(n::text,3,'0'),now_wib::date,items,names,total,p_tanggal,p_jam,p_kap_id,name,trim(p_nama),regexp_replace(p_wa,'\D','','g'),'Baru'
 from profiles where id=p_kap_id returning * into outrow;
 return to_jsonb(outrow);
end $$;
revoke all on function public.buat_booking(uuid[],date,text,uuid,text,text) from public;
grant execute on function public.buat_booking(uuid[],date,text,uuid,text,text) to anon,authenticated;
notify pgrst,'reload schema';
