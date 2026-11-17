-- ROVE BARBERSHOP - pengaturan database Supabase (versi 2)
-- Cara pakai: Supabase > SQL Editor > New query > tempel SEMUA isi file ini > Run.
-- Aman dijalankan ulang kalau perlu.

-- 1. Tabel penyimpanan data
create table if not exists kv (
  col text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);
alter table kv enable row level security;

-- 2. Fungsi pengecek peran
create or replace function is_staff() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from kv where col = 'accounts' and id = auth.uid()::text)
$$;
create or replace function is_owner() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from kv where col = 'accounts' and id = auth.uid()::text and data->>'role' = 'owner')
$$;

-- 3. Aturan akses
drop policy if exists pub_read on kv;
drop policy if exists staff_read on kv;
drop policy if exists staff_insert on kv;
drop policy if exists staff_update on kv;
drop policy if exists staff_delete on kv;
drop policy if exists owner_all on kv;

-- Pelanggan (tanpa login): hanya boleh MELIHAT layanan, capster, jam terisi, dan pengaturan tampilan
create policy pub_read on kv for select to anon, authenticated
  using (col in ('services', 'kapsters', 'slots', 'settings'));

-- Staf (Kasir dan Capster): boleh melihat data, kecuali akun orang lain dan pengeluaran gaji
create policy staff_read on kv for select to authenticated
  using (is_staff() and (col <> 'accounts' or id = auth.uid()::text) and (col <> 'expenses' or data->>'kategori' <> 'Gaji'));

-- Staf: boleh menambah transaksi, pengeluaran (Barang/Jasa), dan sesi Open/Close Service miliknya
create policy staff_insert on kv for insert to authenticated
  with check (is_staff() and (
    col = 'sales'
    or (col = 'expenses' and data->>'kategori' in ('Barang', 'Jasa'))
    or (col = 'shifts' and right(id, 36) = auth.uid()::text)
  ));

-- Staf: boleh mengubah status reservasi dan menutup sesi service
create policy staff_update on kv for update to authenticated
  using (is_staff() and col in ('bookings', 'shifts'))
  with check (is_staff() and col in ('bookings', 'shifts'));

-- Staf: boleh membebaskan jam saat reservasi dibatalkan
create policy staff_delete on kv for delete to authenticated
  using (is_staff() and col = 'slots');

-- Owner: boleh semuanya
create policy owner_all on kv for all to authenticated
  using (is_owner()) with check (is_owner());

-- 4. Reservasi dari pelanggan (dicek di server: jam, batas 3 jam, bentrok capster)
create or replace function buat_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tgl date;
  v_jam text := p->>'jam';
  v_min int;
  v_ts timestamptz;
  v_kapid text := p->>'kapId';
  v_kap jsonb;
  v_items jsonb := '[]'::jsonb;
  v_total int := 0;
  v_names text := '';
  v_sid text;
  v_row jsonb;
  v_id text := gen_random_uuid()::text;
  v_n int;
  v_today text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD');
  v_nama text := left(trim(coalesce(p->>'nama', '')), 60);
  v_wa text := regexp_replace(coalesce(p->>'wa', ''), '\D', '', 'g');
  v_book jsonb;
begin
  if v_nama = '' then raise exception 'Nama wajib diisi.'; end if;
  if v_wa !~ '^62[0-9]{8,13}$' then raise exception 'Nomor WhatsApp tidak valid.'; end if;
  if coalesce(v_jam, '') !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'Format jam salah.'; end if;
  begin
    v_tgl := (p->>'tanggal')::date;
  exception when others then
    raise exception 'Tanggal tidak valid.';
  end;
  v_min := split_part(v_jam, ':', 1)::int * 60 + split_part(v_jam, ':', 2)::int;
  if v_min < 600 or v_min > 1230 then raise exception 'Jam layanan 10:00 sampai 20:30.'; end if;
  v_ts := (v_tgl::text || ' ' || v_jam || ':00+07')::timestamptz;
  if v_ts < now() + interval '3 hours' then raise exception 'Waktu ini sudah lewat batas booking. Pilih waktu lain.'; end if;

  select data into v_kap from kv where col = 'kapsters' and id = v_kapid;
  if v_kap is null then raise exception 'Capster tidak ditemukan.'; end if;

  for v_sid in select jsonb_array_elements_text(coalesce(p->'svcIds', '[]'::jsonb)) loop
    select data into v_row from kv where col = 'services' and id = v_sid;
    if v_row is not null then
      v_items := v_items || jsonb_build_array(jsonb_build_object('nama', v_row->>'nama', 'harga', (v_row->>'harga')::int));
      v_total := v_total + (v_row->>'harga')::int;
      v_names := v_names || case when v_names = '' then '' else ', ' end || (v_row->>'nama');
    end if;
  end loop;
  if v_names = '' then raise exception 'Pilih minimal satu layanan.'; end if;

  perform pg_advisory_xact_lock(hashtext('rove_booking'));
  if exists (
    select 1 from kv
    where col = 'slots' and data->>'kapId' = v_kapid and data->>'tanggal' = v_tgl::text
      and abs((split_part(data->>'jam', ':', 1)::int * 60 + split_part(data->>'jam', ':', 2)::int) - v_min) < 30
  ) then
    raise exception 'Capster sudah dipesan di waktu ini. Pilih yang lain.';
  end if;

  select count(*) + 1 into v_n from kv where col = 'bookings' and data->>'tglBuat' = v_today;
  v_book := jsonb_build_object(
    'nomor', 'BK-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || lpad(v_n::text, 3, '0'),
    'createdTs', (extract(epoch from now()) * 1000)::bigint,
    'tglBuat', v_today,
    'items', v_items, 'svcNama', v_names, 'harga', v_total,
    'tanggal', v_tgl::text, 'jam', v_jam,
    'kapId', v_kapid, 'kapNama', v_kap->>'nama',
    'nama', v_nama, 'wa', v_wa, 'status', 'Baru'
  );
  insert into kv(col, id, data) values ('bookings', v_id, v_book);
  insert into kv(col, id, data) values ('slots', v_id, jsonb_build_object('kapId', v_kapid, 'tanggal', v_tgl::text, 'jam', v_jam));
  return v_book;
end;
$$;
revoke all on function buat_booking(jsonb) from public;
grant execute on function buat_booking(jsonb) to anon, authenticated;

-- 5. Data langsung muncul tanpa muat ulang
do $$ begin
  alter publication supabase_realtime add table kv;
exception when duplicate_object then null;
end $$;

-- 6. AKUN OWNER PERTAMA (lihat PANDUAN, Langkah 5)
-- Buat dulu pengguna di Supabase > Authentication > Users > Add user:
--   email: admin@rove.app , isi password, centang "Auto Confirm User".
-- Lalu jalankan perintah di bawah ini SENDIRIAN di query baru:
--
-- insert into kv(col, id, data)
-- select 'accounts', id::text, jsonb_build_object('name', 'Owner Rove', 'role', 'owner', 'username', 'admin')
-- from auth.users where email = 'admin@rove.app'
-- on conflict (col, id) do nothing;

-- 7. OPSIONAL: tutup Open Service otomatis pukul 23:59 WIB walau aplikasi tidak dibuka
-- a) Supabase > Database > Extensions > cari "pg_cron" > aktifkan.
-- b) Jalankan perintah ini di query baru:
--
-- select cron.schedule('rove-auto-close', '59 16 * * *', $$
--   update kv set data = data || jsonb_build_object('status', 'closed', 'closeTs', (extract(epoch from now()) * 1000)::bigint, 'auto', true)
--   where col = 'shifts' and data->>'status' = 'open'
-- $$);
