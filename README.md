# Rove Barbershop

Aplikasi **Single Page Application (SPA)** full-stack untuk sistem **Reservasi Publik** dan **Kasir POS (Point of Sale)** milik **Rove Barbershop**. Dibangun dengan **React 18**, **Vite**, dan **Supabase** (PostgreSQL, Row Level Security, Realtime, RPC Functions) — tanpa backend server terpisah.

---

## ✨ Fitur Utama

### 📅 Reservasi Publik (4 Langkah)
- Pemilihan layanan (multi-select), tanggal & jam (slot 30 menit, 10:00–20:30 WIB), capster, dan data pemesan.
- Validasi server-side via RPC `buat_booking`: minimal 3 jam sebelum layanan, anti-bentrok jadwal capster (< 30 menit), lock transaksi dengan `pg_advisory_xact_lock`.
- Kode booking unik (`BK-YYMMDD-NNN`) dikirim ke WhatsApp pelanggan.

### 💳 POS Kasir Multi-Kategori
- Kategori layanan: **Hair Cut**, **Extra Service**, **Produk**.
- Tipe pelanggan: **Baru**, **Lama** (riwayat WA), **Reservasi** (auto-isian dari booking aktif).
- Diskon fleksibel: **Persen (%)** atau **Nominal (Rp)**, dibatasi maksimal subtotal.
- Pembayaran: **Tunai** (hitung kembalian otomatis) & **QRIS**.
- Cetak ulang nota termal 58mm kapan saja.

### 🧾 Nota Thermal 58mm Otomatis
- Render di browser, cetak via `window.print()` dengan `@media print` & `@page { size: 58mm auto }`.
- Algoritma **Floyd-Steinberg dithering** konversi logo & gambar promo ke hitam-putih tajam untuk printer termal.
- Pesan penutup dinamis: beda untuk pelanggan baru/reservasi vs lama (konfigurasi Owner).

### 💸 Manajemen Pengeluaran Operasional
- Kategori: **Barang**, **Jasa**, **Gaji** (hanya Owner yang bisa akses kategori Gaji — dikunci RLS).
- Filter tanggal, total otomatis, hapus catatan (Owner only).

### 📊 Laporan Keuangan Komprehensif
- Periode: **Harian**, **Mingguan**, **Bulanan**, **Custom** (maks 31 hari).
- Ringkasan: Omset Kotor, Tunai vs QRIS, Total Diskon, Pengeluaran, **Laba Bersih**.
- Grafik batang tren harian (Tunai biru, QRIS hijau) & performa capster (progress bar).
- Edit & hapus transaksi (Owner only), ekspor CSV, kirim ringkasan ke email.

### 👥 Manajemen Staf & Capster (Owner Only)
- CRUD akun staf via Supabase Auth + tabel `profiles` (role: `owner` | `kasir` | `capster`).
- Skema gaji lengkap: Gaji Pokok (Bulanan/Mingguan/Harian), Bonus, Jatah Libur, Potongan Keterlambatan.
- Target & Komisi per kategori: Hair Cut, Extra Service, Produk.
- Foto profil capster (crop persegi, compress JPEG, tampil di halaman booking).

### 🎨 Kustomisasi Tema Dinamis (Owner Only)
- Warna: Background, Outline/Garis, Teks Utama — **Live Preview** tanpa reload.
- Upload logo warna → auto-generate logo BW untuk nota termal.
- Booking Policy, Kontak (WA, IG, TikTok, FB, Email, Maps), Pesan Nota, Gambar QR Promo di footer nota.

---

## 🛠 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18, Vite 5, CSS Murni (Custom Properties, CSS Grid, Flexbox) |
| **Backend / DB** | Supabase (PostgreSQL 15+, Row Level Security, Realtime, Edge Functions) |
| **Auth** | Supabase Auth (email/password, custom username via `@rove.app` domain) |
| **Realtime** | Supabase Realtime (Postgres Changes) + Polling fallback 20s |
| **RPC** | `buat_booking` (PL/pgSQL, security definer) — validasi server-side atomik |
| **Print** | Thermal 58mm via `@media print`, Floyd-Steinberg dithering (canvas) |
| **Deploy** | Static hosting (Vercel / Cloudflare Pages / Netlify) + Supabase project |

---

## 🚀 Panduan Instalasi & Setup

### 1. Klon Repositori
```bash
git clone https://github.com/<username>/Rove-Barbershop.git
cd Rove-Barbershop
```

### 2. Install Dependency
```bash
npm install
```

### 3. Konfigurasi Environment
Salin file contoh dan isi kredensial Supabase:
```bash
cp .env.example .env
```
Edit `.env`:
```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

### 4. Jalankan Migrasi Database (Supabase SQL Editor)
Buka **Supabase Dashboard → SQL Editor → New Query**, tempel **seluruh isi** `supabase/migration.sql`, lalu **Run**.  
Ini akan membuat:
- 8 tabel utama (`profiles`, `services`, `promos`, `bookings`, `sales`, `expenses`, `shifts`, `settings`)
- 2 view publik (`public_capsters`, `public_booked_slots`)
- RLS policies per role (`owner`, `kasir`, `capster`, `anon`)
- RPC function `buat_booking(jsonb)` dengan validasi ketat
- Realtime publication untuk semua tabel

### 5. Buat User Owner Pertama
Di **Supabase Dashboard → Authentication → Add User**, buat user dengan email `admin@rove.app` (password bebas).  
Lalu jalankan SQL ini (sudah ada di bagian akhir `migration.sql`):
```sql
insert into profiles (id, name, username, role)
select id, 'Owner Rove', 'admin', 'owner'
from auth.users where email = 'admin@rove.app'
on conflict (id) do nothing;
```

### 6. Jalankan Development Server
```bash
npm run dev
```
Akses di `http://localhost:5173`.

---

## 📂 Struktur Proyek

```
Rove-Barbershop/
├── public/                 # Aset statis (icon, manifest)
├── src/
│   ├── components/         # Receipt58mm.jsx, TopBar.jsx
│   ├── context/            # AppContext.jsx (state global, realtime, auth)
│   ├── lib/                # supabase.js (client + secondary client)
│   ├── pages/              # 11 halaman (Booking, Login, Cashier, dll)
│   ├── utils/              # format.js, media.js, defaults.js
│   ├── App.jsx             # Router berbasis role & view
│   ├── main.jsx            # Entry point
│   └── index.css           # Design system + thermal print CSS
├── supabase/
│   └── migration.sql       # Skema DB lengkap + RLS + RPC
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
└── README.md
```

---

## 🔐 Keamanan & RLS Ringkas

| Tabel | Policy Utama |
|-------|--------------|
| `profiles` | Staff baca diri sendiri + capster; Owner full CRUD |
| `services` / `promos` | Owner full CRUD; Staff read-only |
| `bookings` | Staff read + update status; Owner delete; Public insert via RPC only |
| `sales` | Staff insert (kasir); Owner update/delete |
| `expenses` | Staff insert (Barang/Jasa); Owner full (termasuk Gaji) |
| `shifts` | Staff CRUD milik sendiri; Owner full |
| `settings` | Owner full CRUD |

---

## 📜 Lisensi
Proyek internal Rove Barbershop. Hak cipta dilindungi.