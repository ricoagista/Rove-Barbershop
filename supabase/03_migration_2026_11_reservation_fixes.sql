-- Operator-only follow-up migration. Never run from the frontend.
-- Order: migration.sql, migration_reservation_operations.sql, this file.

alter table public.bookings add column if not exists people_count integer not null default 1;
alter table public.bookings drop constraint if exists bookings_people_count_check;
alter table public.bookings add constraint bookings_people_count_check check (people_count between 1 and 5);

-- Supabase grants EXECUTE to PUBLIC by default; revoke PUBLIC and anon explicitly.
drop function if exists public.buat_booking(uuid[], date, text, uuid, text, text);
drop function if exists public.buat_booking(uuid[], date, text, uuid, text, text, integer);
create or replace function public.buat_booking(p_svc_ids uuid[], p_tanggal date, p_jam text, p_kap_id uuid, p_nama text, p_wa text, p_people_count integer default 1)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; x uuid; items jsonb:='[]'; total int:=0; names text:=''; mins int; now_wib timestamp; outrow bookings%rowtype; n int; hc_count int:=0; open_min int; close_min int; last_min int; max_min int; wa_clean text;
begin
 now_wib:=now() at time zone 'Asia/Jakarta'; wa_clean:=regexp_replace(coalesce(p_wa,''),'\D','','g');
 if p_svc_ids is null or cardinality(p_svc_ids)=0 then raise exception 'Pilih minimal satu layanan.'; end if;
 if cardinality(p_svc_ids)>20 then raise exception 'Maksimal 20 layanan per booking.'; end if;
 if p_people_count is null or p_people_count not between 1 and 5 then raise exception 'Jumlah orang harus antara 1 dan 5.'; end if;
 if trim(coalesce(p_nama,''))='' then raise exception 'Nama pelanggan wajib diisi.'; end if;
 if length(trim(p_nama))>60 then raise exception 'Nama pelanggan maksimal 60 karakter.'; end if;
 if wa_clean !~ '^62[0-9]{8,13}$' then raise exception 'Data pelanggan tidak valid.'; end if;
 if (select count(*) from bookings where wa=wa_clean and status='Baru' and tanggal>=now_wib::date)>=3 then raise exception 'Nomor WhatsApp sudah memiliki 3 reservasi aktif.'; end if;
 if p_tanggal is null or p_jam !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'Tanggal atau jam tidak valid.'; end if;
 select extract(hour from (coalesce(data->>'jam_buka','13:00')::time))*60+extract(minute from (coalesce(data->>'jam_buka','13:00')::time)), extract(hour from (coalesce(data->>'jam_tutup','21:00')::time))*60+extract(minute from (coalesce(data->>'jam_tutup','21:00')::time)), extract(hour from (coalesce(data->>'batas_reservasi_terakhir','19:00')::time))*60+extract(minute from (coalesce(data->>'batas_reservasi_terakhir','19:00')::time)) into open_min,close_min,last_min from settings where id='operasional';
 open_min:=coalesce(open_min,780); close_min:=coalesce(close_min,1260); last_min:=coalesce(last_min,1140); max_min:=least(last_min,close_min-60); mins:=split_part(p_jam,':',1)::int*60+split_part(p_jam,':',2)::int;
 if mins < open_min or mins > max_min or mod(mins-open_min,30) <> 0 then raise exception 'Jam layanan di luar slot operasional.'; end if;
 if (p_tanggal::text||' '||p_jam)::timestamp < now_wib + interval '60 minutes' then raise exception 'Reservasi minimal 60 menit sebelum layanan.'; end if;
 if not exists(select 1 from profiles where id=p_kap_id and role='capster') then raise exception 'Capster tidak ditemukan.'; end if;
 perform pg_advisory_xact_lock(hashtext('rove_booking_date_'||p_tanggal::text));
 if exists(select 1 from booking_slot_closures where tanggal=p_tanggal and jam=p_jam and (kap_id is null or kap_id=p_kap_id)) then raise exception 'Slot ini ditutup.'; end if;
 if exists(select 1 from bookings where tanggal=p_tanggal and kap_id=p_kap_id and status in ('Baru','Hadir') and abs(split_part(jam,':',1)::int*60+split_part(jam,':',2)::int-mins)<30) then raise exception 'Capster sudah dipesan di waktu ini.'; end if;
 perform pg_advisory_xact_lock(hashtext('rove_issue_date_'||now_wib::date::text));
 foreach x in array p_svc_ids loop select id,nama,harga,kat into r from services where id=x; if not found then raise exception 'Layanan tidak ditemukan.'; end if; items:=items||jsonb_build_array(jsonb_build_object('id',r.id,'nama',r.nama,'harga',r.harga,'kat',r.kat)); total:=total+r.harga; names:=names||case when names='' then '' else ', ' end||r.nama; if r.kat='Hair Cut' then hc_count:=hc_count+1; end if; end loop;
 if hc_count<>p_people_count then raise exception 'Jumlah Hair Cut harus sama dengan jumlah orang.'; end if;
 select coalesce(max(nullif(regexp_replace(nomor,'^BK-[0-9]{6}-',''),'')::int),0)+1 into n from bookings where tgl_buat=now_wib::date;
 insert into bookings(nomor,tgl_buat,items,svc_nama,harga,tanggal,jam,kap_id,kap_nama,nama,wa,status,people_count) select 'BK-'||to_char(now_wib,'YYMMDD')||'-'||lpad(n::text,3,'0'),now_wib::date,items,names,total,p_tanggal,p_jam,p_kap_id,name,left(trim(p_nama),60),wa_clean,'Baru',p_people_count from profiles where id=p_kap_id returning * into outrow;
 return to_jsonb(outrow);
end $$;
revoke all on function public.buat_booking(uuid[], date, text, uuid, text, text, integer) from public, anon;
grant execute on function public.buat_booking(uuid[], date, text, uuid, text, text, integer) to anon, authenticated;

-- Reassert restricted operations from the master migration.
revoke all on function public.set_booking_status(uuid,text) from public, anon;
grant execute on function public.set_booking_status(uuid,text) to authenticated;
revoke all on function public.set_booking_slot_closure(date,text,uuid,boolean) from public, anon;
grant execute on function public.set_booking_slot_closure(date,text,uuid,boolean) to authenticated;
revoke all on function public.buat_penjualan(jsonb) from public, anon;
grant execute on function public.buat_penjualan(jsonb) to authenticated;
notify pgrst,'reload schema';
