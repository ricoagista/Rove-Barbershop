-- Idempotent fixes. Run after migration_reservation_operations.sql, never from the app.
create or replace view public.public_booking_settings as
select
  coalesce((select data->>'jam_buka' from public.settings where id='operasional'),'13:00') as jam_buka,
  coalesce((select data->>'jam_tutup' from public.settings where id='operasional'),'21:00') as jam_tutup,
  coalesce((select data->>'batas_reservasi_terakhir' from public.settings where id='operasional'),'19:00') as batas_reservasi_terakhir,
  coalesce((select data->>'pol' from public.settings where id='utama'),'') as booking_policy;
grant select on public.public_booking_settings to anon, authenticated;

create or replace function public.buat_booking(p_svc_ids uuid[], p_tanggal date, p_jam text, p_kap_id uuid, p_nama text, p_wa text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; x uuid; items jsonb:='[]'; total int:=0; names text:=''; mins int; now_wib timestamp; outrow bookings%rowtype; n int; open_min int; close_min int; last_min int; max_min int;
begin
 now_wib:=now() at time zone 'Asia/Jakarta';
 if trim(coalesce(p_nama,''))='' or regexp_replace(coalesce(p_wa,''),'\D','','g') !~ '^62[0-9]{8,13}$' then raise exception 'Data pelanggan tidak valid.'; end if;
 if p_tanggal is null or p_jam !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'Tanggal atau jam tidak valid.'; end if;
 select extract(hour from (coalesce(data->>'jam_buka','13:00')::time))*60+extract(minute from (coalesce(data->>'jam_buka','13:00')::time)), extract(hour from (coalesce(data->>'jam_tutup','21:00')::time))*60+extract(minute from (coalesce(data->>'jam_tutup','21:00')::time)), extract(hour from (coalesce(data->>'batas_reservasi_terakhir','19:00')::time))*60+extract(minute from (coalesce(data->>'batas_reservasi_terakhir','19:00')::time)) into open_min,close_min,last_min from settings where id='operasional';
 open_min:=coalesce(open_min,780); close_min:=coalesce(close_min,1260); last_min:=coalesce(last_min,1140); max_min:=least(last_min,close_min-60);
 mins:=split_part(p_jam,':',1)::int*60+split_part(p_jam,':',2)::int;
 if mins < open_min or mins > max_min or mod(mins-open_min,30) <> 0 then raise exception 'Jam layanan di luar slot operasional.'; end if;
 if (p_tanggal::text||' '||p_jam)::timestamp < now_wib + interval '60 minutes' then raise exception 'Reservasi minimal 60 menit sebelum layanan.'; end if;
 if not exists(select 1 from profiles where id=p_kap_id and role='capster') then raise exception 'Capster tidak ditemukan.'; end if;
 perform pg_advisory_xact_lock(hashtext('rove_booking_date_'||p_tanggal::text));
 if exists(select 1 from booking_slot_closures c where c.tanggal=p_tanggal and c.jam=p_jam and (c.kap_id is null or c.kap_id=p_kap_id)) then raise exception 'Slot ini ditutup.'; end if;
 if exists(select 1 from bookings b where b.tanggal=p_tanggal and b.kap_id=p_kap_id and b.status in ('Baru','Hadir') and abs(split_part(b.jam,':',1)::int*60+split_part(b.jam,':',2)::int-mins)<30) then raise exception 'Capster sudah dipesan di waktu ini.'; end if;
 foreach x in array p_svc_ids loop select id,nama,harga into r from services where id=x; if found then items:=items||jsonb_build_array(jsonb_build_object('id',r.id,'nama',r.nama,'harga',r.harga)); total:=total+r.harga; names:=names||case when names='' then '' else ', ' end||r.nama; end if; end loop;
 if names='' then raise exception 'Pilih minimal satu layanan.'; end if;
 perform pg_advisory_xact_lock(hashtext('rove_issue_date_'||(now_wib::date)::text));
 select coalesce(max(nullif(regexp_replace(b0.nomor, '^BK-[0-9]{6}-', '') , '')::int), 0) + 1 into n from bookings b0 where b0.tgl_buat=now_wib::date;
 insert into bookings(nomor,tgl_buat,items,svc_nama,harga,tanggal,jam,kap_id,kap_nama,nama,wa,status) select 'BK-'||to_char(now_wib,'YYMMDD')||'-'||lpad(n::text,3,'0'),now_wib::date,items,names,total,p_tanggal,p_jam,p_kap_id,name,trim(p_nama),regexp_replace(p_wa,'\D','','g'),'Baru' from profiles where id=p_kap_id returning * into outrow;
 return to_jsonb(outrow);
end $$;
revoke all on function public.buat_booking(uuid[],date,text,uuid,text,text) from public;
grant execute on function public.buat_booking(uuid[],date,text,uuid,text,text) to anon,authenticated;

create or replace function public.set_booking_status(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from profiles where id=auth.uid() and role in ('owner','kasir')) then raise exception 'Hanya Owner atau Kasir yang boleh mengubah status reservasi.'; end if;
 if p_status not in ('Hadir','Batal') then raise exception 'Status reservasi tidak valid.'; end if;
 update bookings set status=p_status where id=p_id and status not in ('Selesai','Batal');
 if not found then raise exception 'Reservasi tidak ditemukan atau sudah selesai/batal.'; end if;
end $$;
revoke all on function public.set_booking_status(uuid,text) from public;
grant execute on function public.set_booking_status(uuid,text) to authenticated;
drop policy if exists staff_update_bookings on bookings;

create or replace function public.buat_penjualan(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p jsonb:=p_payload; bid uuid; out_sale sales%rowtype; n int; today date:=(now() at time zone 'Asia/Jakarta')::date; status_now text;
begin
 if not is_staff() then raise exception 'Hanya staf terdaftar yang boleh membuat penjualan.'; end if;
 p := jsonb_set(p, '{kasir_id}', to_jsonb(auth.uid()::text), true);
 p := jsonb_set(p, '{kasir_nama}', to_jsonb((select name from profiles where id=auth.uid())), true);
 if (select role from profiles where id=auth.uid()) = 'capster' and (p->>'capster_id') <> auth.uid()::text then raise exception 'Capster hanya dapat memilih dirinya sendiri.'; end if;
 bid:=nullif(p->>'booking_id','')::uuid;
 if bid is not null then select status into status_now from bookings where id=bid; if not found or status_now in ('Selesai','Batal') then raise exception 'Reservasi tidak ditemukan atau sudah selesai/batal.'; end if; end if;
 perform pg_advisory_xact_lock(hashtext('rove_issue_date_'||today::text));
 select coalesce(max(nullif(regexp_replace(s.nomor, '^RV-[0-9]{6}-', ''), '')::int), 0) + 1 into n from sales s where (s.ts at time zone 'Asia/Jakarta')::date=today;
 insert into sales(nomor,ts,kasir_id,kasir_nama,capster_id,capster_nama,jenis,booking_id,items,subtotal,diskon,promo,total,metode,pelanggan,wa,diterima,kembali)
 values('RV-'||to_char(now() at time zone 'Asia/Jakarta','YYMMDD')||'-'||lpad(n::text,3,'0'),coalesce((p->>'ts')::timestamptz,now()),(p->>'kasir_id')::uuid,p->>'kasir_nama',(p->>'capster_id')::uuid,p->>'capster_nama',p->>'jenis',bid,p->'items',(p->>'subtotal')::int,(p->>'diskon')::int,coalesce(p->>'promo',''),(p->>'total')::int,p->>'metode',p->>'pelanggan',p->>'wa',(p->>'diterima')::int,(p->>'kembali')::int) returning * into out_sale;
 if bid is not null then update bookings set status='Selesai' where id=bid; end if;
 return to_jsonb(out_sale);
end $$;
revoke all on function public.buat_penjualan(jsonb) from public;
drop policy if exists staff_insert_sales on sales;
grant execute on function public.buat_penjualan(jsonb) to authenticated;
notify pgrst,'reload schema';
