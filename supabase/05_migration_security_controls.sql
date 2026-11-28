-- Kontrol anti-spam booking per perangkat dan percobaan login.
alter table public.bookings add column if not exists device_id text;
create index if not exists idx_bookings_device_created on public.bookings(device_id, created_at);

-- Pastikan RPC terbaru menerima device id dan menegakkan cooldown dari settings.keamanan.
drop function if exists public.buat_booking(uuid[], date, text, uuid, text, text, integer);
create or replace function public.buat_booking(p_svc_ids uuid[], p_tanggal date, p_jam text, p_kap_id uuid, p_nama text, p_wa text, p_people_count integer default 1, p_device_id text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; x uuid; items jsonb:='[]'; total int:=0; names text:=''; outrow bookings%rowtype; n int:=0; hc_count int:=0; cooldown int; enabled boolean;
begin
  select coalesce((data->>'bookingEnabled')::boolean,true), greatest(coalesce((data->>'bookingCooldownMinutes')::int,30),1) into enabled,cooldown from settings where id='keamanan';
  if enabled and nullif(trim(p_device_id),'') is not null and exists (select 1 from bookings where device_id=p_device_id and created_at > now()-make_interval(mins=>cooldown)) then raise exception 'Perangkat ini baru saja membuat booking. Coba lagi setelah jeda keamanan selesai.'; end if;
  if p_svc_ids is null or cardinality(p_svc_ids)=0 then raise exception 'Pilih minimal satu layanan.'; end if;
  if p_people_count not between 1 and 5 then raise exception 'Jumlah orang harus antara 1 dan 5.'; end if;
  foreach x in array p_svc_ids loop select id,nama,harga,kat into r from services where id=x; if not found then raise exception 'Layanan tidak ditemukan.'; end if; items:=items||jsonb_build_array(jsonb_build_object('id',r.id,'nama',r.nama,'harga',r.harga,'kat',r.kat)); total:=total+r.harga; names:=names||case when names='' then '' else ', ' end||r.nama; if r.kat='Hair Cut' then hc_count:=hc_count+1; end if; end loop;
  if hc_count<>p_people_count then raise exception 'Jumlah Hair Cut harus sama dengan jumlah orang.'; end if;
  select coalesce(max(nullif(regexp_replace(nomor,'^BK-[0-9]{6}-',''),'')::int),0)+1 into n from bookings where tgl_buat=(now() at time zone 'Asia/Jakarta')::date;
  insert into bookings(nomor,tgl_buat,items,svc_nama,harga,tanggal,jam,kap_id,kap_nama,nama,wa,status,people_count,device_id) select 'BK-'||to_char(now() at time zone 'Asia/Jakarta','YYMMDD')||'-'||lpad(n::text,3,'0'),(now() at time zone 'Asia/Jakarta')::date,items,names,total,p_tanggal,p_jam,p_kap_id,name,left(trim(p_nama),60),regexp_replace(coalesce(p_wa,''),'\D','','g'),'Baru',p_people_count,nullif(trim(p_device_id),'') from profiles where id=p_kap_id returning * into outrow;
  return to_jsonb(outrow);
end $$;
revoke all on function public.buat_booking(uuid[],date,text,uuid,text,text,integer,text) from public;
grant execute on function public.buat_booking(uuid[],date,text,uuid,text,text,integer,text) to anon,authenticated;
