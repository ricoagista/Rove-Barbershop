alter table public.promos
  add column if not exists kuota integer not null default 1 check (kuota > 0),
  add column if not exists terpakai integer not null default 0 check (terpakai >= 0 and terpakai <= kuota);

create or replace function public.buat_penjualan(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  p jsonb := p_payload;
  bid uuid;
  out_sale sales%rowtype;
  n int;
  today date := (now() at time zone 'Asia/Jakarta')::date;
  status_now text;
  promo_name text := nullif(p->>'promo','');
  promo_row promos%rowtype;
begin
  if not is_staff() then raise exception 'Hanya staf terdaftar yang boleh membuat penjualan.'; end if;
  p := jsonb_set(p, '{kasir_id}', to_jsonb(auth.uid()::text), true);
  p := jsonb_set(p, '{kasir_nama}', to_jsonb((select name from profiles where id=auth.uid())), true);
  if (select role from profiles where id=auth.uid()) = 'capster' and (p->>'capster_id') <> auth.uid()::text then raise exception 'Capster hanya dapat memilih dirinya sendiri.'; end if;
  bid := nullif(p->>'booking_id','')::uuid;
  if bid is not null then
    select status into status_now from bookings where id=bid;
    if not found or status_now in ('Selesai','Batal') then raise exception 'Reservasi tidak ditemukan atau sudah selesai/batal.'; end if;
  end if;
  if promo_name is not null and (p->>'diskon')::int > 0 then
    select * into promo_row from promos where nama = promo_name for update;
    if not found then raise exception 'Promo tidak ditemukan.'; end if;
    if promo_row.terpakai >= promo_row.kuota then raise exception 'Kuota promo sudah habis.'; end if;
    update promos set terpakai = terpakai + 1 where id = promo_row.id;
  end if;
  perform pg_advisory_xact_lock(hashtext('rove_issue_date_'||today::text));
  select coalesce(max(nullif(regexp_replace(s.nomor, '^RV-[0-9]{6}-', ''), '')::int), 0) + 1 into n from sales s where (s.ts at time zone 'Asia/Jakarta')::date=today;
  insert into sales(nomor,ts,kasir_id,kasir_nama,capster_id,capster_nama,jenis,booking_id,items,subtotal,diskon,promo,total,metode,pelanggan,wa,diterima,kembali)
  values('RV-'||to_char(now() at time zone 'Asia/Jakarta','YYMMDD')||'-'||lpad(n::text,3,'0'),coalesce((p->>'ts')::timestamptz,now()),(p->>'kasir_id')::uuid,p->>'kasir_nama',(p->>'capster_id')::uuid,p->>'capster_nama',p->>'jenis',bid,p->'items',(p->>'subtotal')::int,(p->>'diskon')::int,coalesce(p->>'promo',''),(p->>'total')::int,p->>'metode',p->>'pelanggan',p->>'wa',(p->>'diterima')::int,(p->>'kembali')::int) returning * into out_sale;
  if bid is not null then update bookings set status='Selesai' where id=bid; end if;
  return to_jsonb(out_sale);
end $$;

revoke all on function public.buat_penjualan(jsonb) from public;
grant execute on function public.buat_penjualan(jsonb) to authenticated;
notify pgrst, 'reload schema';
