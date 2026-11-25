-- ROVE BARBERSHOP - Skema Database Relasional (PostgreSQL / Supabase)
-- Jalankan seluruh isi file ini di Supabase > SQL Editor > New Query > Run

-- 1. TABEL UTAMA
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text unique not null,
  role text not null check (role in ('owner', 'kasir', 'capster')),
  wa text,
  photo_url text default '',
  gp int not null default 0,
  bonus int not null default 0,
  sg text not null default 'Bulan',
  libur int not null default 0,
  prot int not null default 0,
  p_hc int not null default 0,
  p_ex int not null default 0,
  p_pr int not null default 0,
  t_hc int not null default 0,
  t_ex int not null default 0,
  t_pr int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  harga int not null check (harga >= 0),
  kat text not null default 'Hair Cut' check (kat in ('Hair Cut', 'Extra Service', 'Produk')),
  created_at timestamptz not null default now()
);

create table if not exists promos (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  tipe text not null check (tipe in ('persen', 'rupiah')),
  nilai int not null check (nilai > 0),
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  nomor text unique not null,
  tgl_buat date not null default ((now() at time zone 'Asia/Jakarta')::date),
  items jsonb not null default '[]'::jsonb,
  svc_nama text not null,
  harga int not null default 0,
  tanggal date not null,
  jam text not null,
  kap_id uuid references profiles(id) on delete set null,
  kap_nama text not null,
  nama text not null,
  wa text not null,
  status text not null default 'Baru' check (status in ('Baru', 'Hadir', 'Selesai', 'Batal')),
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  nomor text unique not null,
  ts timestamptz not null default now(),
  kasir_id uuid references profiles(id) on delete set null,
  kasir_nama text not null,
  capster_id uuid references profiles(id) on delete set null,
  capster_nama text not null,
  jenis text not null check (jenis in ('baru', 'lama', 'reservasi')),
  booking_id uuid references bookings(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  subtotal int not null default 0,
  diskon int not null default 0,
  promo text default '',
  total int not null default 0,
  metode text not null check (metode in ('Tunai', 'QRIS')),
  pelanggan text not null,
  wa text not null,
  diterima int not null default 0,
  kembali int not null default 0,
  edit_ts timestamptz,
  edit_oleh text
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  tanggal date not null,
  kategori text not null check (kategori in ('Barang', 'Jasa', 'Gaji')),
  nama text not null,
  biaya int not null check (biaya > 0),
  oleh_id uuid references profiles(id) on delete set null,
  oleh_nama text not null
);

create table if not exists shifts (
  id text primary key,
  tanggal date not null,
  uid uuid references profiles(id) on delete cascade,
  nama text not null,
  role text not null,
  open_ts timestamptz not null default now(),
  close_ts timestamptz,
  status text not null default 'open' check (status in ('open', 'closed'))
);

create table if not exists settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. INDEX UNTUK PERFORMA LAPORAN & CEK JADWAL
create index if not exists idx_bookings_tanggal on bookings(tanggal);
create index if not exists idx_bookings_kap_tgl on bookings(kap_id, tanggal);
create index if not exists idx_sales_ts on sales(ts);
create index if not exists idx_expenses_tanggal on expenses(tanggal);

-- 3. PUBLIC VIEWS (Agar publik tidak bisa membaca data pribadi/WA di tabel bookings & profiles)
create or replace view public_capsters as
  select id, name, photo_url from profiles where role = 'capster';

create or replace view public_booked_slots as
  select id, kap_id, tanggal, jam from bookings where status in ('Baru', 'Hadir');

grant select on public_capsters to anon, authenticated;
grant select on public_booked_slots to anon, authenticated;

-- 4. FUNGSI PEMBANTU PERAN (RLS)
create or replace function is_staff() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid())
$$;

create or replace function is_owner() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner')
$$;

-- 5. AKTIFKAN ROW LEVEL SECURITY (RLS)
alter table profiles enable row level security;
alter table services enable row level security;
alter table promos enable row level security;
alter table bookings enable row level security;
alter table sales enable row level security;
alter table expenses enable row level security;
alter table shifts enable row level security;
alter table settings enable row level security;

-- Kebijakan Publik (Tanpa Login)
drop policy if exists "pub_read_services" on services;
create policy "pub_read_services" on services for select to anon, authenticated using (true);

drop policy if exists "pub_read_settings" on settings;
-- Public settings are exposed only through public_booking_settings in the operations migration.
-- Do not grant anon SELECT on the base settings table.

-- Kebijakan Profiles
drop policy if exists "staff_read_profiles" on profiles;
create policy "staff_read_profiles" on profiles for select to authenticated
  using (is_staff() and (id = auth.uid() or role = 'capster' or is_owner()));

drop policy if exists "owner_all_profiles" on profiles;
create policy "owner_all_profiles" on profiles for all to authenticated
  using (is_owner()) with check (is_owner());

-- Kebijakan Services & Promos
drop policy if exists "owner_all_services" on services;
create policy "owner_all_services" on services for all to authenticated
  using (is_owner()) with check (is_owner());

drop policy if exists "staff_read_promos" on promos;
create policy "staff_read_promos" on promos for select to authenticated
  using (is_staff());

drop policy if exists "owner_all_promos" on promos;
create policy "owner_all_promos" on promos for all to authenticated
  using (is_owner()) with check (is_owner());

-- Kebijakan Bookings
drop policy if exists "staff_read_bookings" on bookings;
create policy "staff_read_bookings" on bookings for select to authenticated
  using (is_staff());

drop policy if exists "staff_update_bookings" on bookings;
create policy "staff_update_bookings" on bookings for update to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists "owner_delete_bookings" on bookings;
create policy "owner_delete_bookings" on bookings for delete to authenticated
  using (is_owner());

-- Kebijakan Sales
drop policy if exists "staff_read_sales" on sales;
create policy "staff_read_sales" on sales for select to authenticated
  using (is_staff());

drop policy if exists "staff_insert_sales" on sales;
create policy "staff_insert_sales" on sales for insert to authenticated
  with check (is_staff());

drop policy if exists "owner_update_del_sales" on sales;
create policy "owner_update_del_sales" on sales for update to authenticated
  using (is_owner()) with check (is_owner());

drop policy if exists "owner_del_sales" on sales;
create policy "owner_del_sales" on sales for delete to authenticated
  using (is_owner());

-- Kebijakan Expenses (Staf tidak bisa melihat & menambah Gaji)
drop policy if exists "staff_read_expenses" on expenses;
create policy "staff_read_expenses" on expenses for select to authenticated
  using (is_staff() and (kategori <> 'Gaji' or is_owner()));

drop policy if exists "staff_insert_expenses" on expenses;
create policy "staff_insert_expenses" on expenses for insert to authenticated
  with check (is_staff() and (kategori in ('Barang', 'Jasa') or is_owner()));

drop policy if exists "owner_all_expenses" on expenses;
create policy "owner_all_expenses" on expenses for all to authenticated
  using (is_owner()) with check (is_owner());

-- Kebijakan Shifts
drop policy if exists "staff_read_shifts" on shifts;
create policy "staff_read_shifts" on shifts for select to authenticated
  using (is_staff());

drop policy if exists "staff_insert_shifts" on shifts;
create policy "staff_insert_shifts" on shifts for insert to authenticated
  with check (is_staff() and uid = auth.uid());

drop policy if exists "staff_update_shifts" on shifts;
create policy "staff_update_shifts" on shifts for update to authenticated
  using (is_staff() and (uid = auth.uid() or is_owner()));

drop policy if exists "owner_all_shifts" on shifts;
create policy "owner_all_shifts" on shifts for all to authenticated
  using (is_owner()) with check (is_owner());

-- Kebijakan Settings: staf terdaftar dapat membaca, hanya Owner dapat menulis.
drop policy if exists "staff_read_settings" on settings;
create policy "staff_read_settings" on settings for select to authenticated using (is_staff());
drop policy if exists "owner_all_settings" on settings;
create policy "owner_all_settings" on settings for all to authenticated
  using (is_owner()) with check (is_owner());

-- 6. RPC RESERVASI PUBLIK (6 parameter langsung cocok dengan BookingPage.jsx, anti bentrok 30 menit + advisory lock)
drop function if exists public.buat_booking(jsonb);

create or replace function public.buat_booking(
  "svcIds" uuid[],
  tanggal date,
  jam text,
  "kapId" uuid,
  nama text,
  wa text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tgl date := tanggal;
  v_jam text := jam;
  v_min int;
  v_ts timestamptz;
  v_kapid uuid := "kapId";
  v_kap_nama text;
  v_items jsonb := '[]'::jsonb;
  v_total int := 0;
  v_names text := '';
  v_sid uuid;
  v_row record;
  v_n int;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_nama text := left(trim(coalesce(nama, '')), 60);
  v_wa text := regexp_replace(coalesce(wa, ''), '\D', '', 'g');
  v_nomor text;
  v_inserted bookings%rowtype;
begin
  if v_nama = '' then raise exception 'Nama wajib diisi.'; end if;
  if v_wa !~ '^62[0-9]{8,13}$' then raise exception 'Nomor WhatsApp tidak valid.'; end if;
  if coalesce(v_jam, '') !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'Format jam salah.'; end if;
  if v_tgl is null then raise exception 'Tanggal tidak valid.'; end if;

  v_min := split_part(v_jam, ':', 1)::int * 60 + split_part(v_jam, ':', 2)::int;
  if v_min < 600 or v_min > 1230 then raise exception 'Jam layanan 10:00 sampai 20:30.'; end if;

  v_ts := (v_tgl::text || ' ' || v_jam || ':00+07')::timestamptz;
  if v_ts < now() + interval '3 hours' then
    raise exception 'Waktu ini sudah lewat batas booking (minimal 3 jam sebelum layanan).';
  end if;

  if v_kapid is null then raise exception 'Capster tidak valid.'; end if;
  select name into v_kap_nama from profiles where id = v_kapid and role = 'capster';
  if v_kap_nama is null then raise exception 'Capster tidak ditemukan.'; end if;

  if "svcIds" is null or array_length("svcIds", 1) is null then
    raise exception 'Pilih minimal satu layanan.';
  end if;

  foreach v_sid in array "svcIds" loop
    select id, nama, harga into v_row from services where id = v_sid;
    if found then
      v_items := v_items || jsonb_build_array(jsonb_build_object('id', v_row.id, 'nama', v_row.nama, 'harga', v_row.harga));
      v_total := v_total + v_row.harga;
      v_names := v_names || case when v_names = '' then '' else ', ' end || v_row.nama;
    end if;
  end loop;

  if v_names = '' then raise exception 'Pilih minimal satu layanan.'; end if;

  -- Kunci transaksi agar tidak ada double booking di detik yang sama
  perform pg_advisory_xact_lock(hashtext('rove_booking_' || v_kapid::text || '_' || v_tgl::text));

  if exists (
    select 1 from bookings b
    where b.kap_id = v_kapid
      and b.tanggal = v_tgl
      and b.status in ('Baru', 'Hadir')
      and abs((split_part(b.jam, ':', 1)::int * 60 + split_part(b.jam, ':', 2)::int) - v_min) < 30
  ) then
    raise exception 'Capster sudah dipesan di waktu ini. Pilih jam atau capster lain.';
  end if;

  select count(*) + 1 into v_n from bookings where tgl_buat = v_today;
  v_nomor := 'BK-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || lpad(v_n::text, 3, '0');

  insert into bookings (nomor, tgl_buat, items, svc_nama, harga, tanggal, jam, kap_id, kap_nama, nama, wa, status)
  values (v_nomor, v_today, v_items, v_names, v_total, v_tgl, v_jam, v_kapid, v_kap_nama, v_nama, v_wa, 'Baru')
  returning * into v_inserted;

  return to_jsonb(v_inserted);
end;
$$;

revoke all on function public.buat_booking(uuid[], date, text, uuid, text, text) from public;
grant execute on function public.buat_booking(uuid[], date, text, uuid, text, text) to anon, authenticated;

-- 7. AKTIFKAN REALTIME UNTUK SEMUA TABEL
do $$ begin
  alter publication supabase_realtime add table profiles, services, promos, bookings, sales, expenses, shifts, settings;
exception when duplicate_object then null;
end $$;

-- 8. REFRESH SCHEMA CACHE POSTGREST
notify pgrst, 'reload schema';

-- 9. SETUP OWNER PERTAMA (Jalankan terpisah setelah membuat user admin@rove.app di menu Authentication)
-- insert into profiles (id, name, username, role)
-- select id, 'Owner Rove', 'admin', 'owner'
-- from auth.users where email = 'admin@rove.app'
-- on conflict (id) do nothing;
