# Rove Barbershop - Agent.md

## Aplikasi Ini
Aplikasi **SPA (Single Page Application)** full-stack untuk sistem **Reservasi Publik** dan **Kasir POS (Point of Sale)** milik **Rove Barbershop**. Dibangun dengan **React 18**, **Vite**, dan **Supabase** (PostgreSQL, Row Level Security, Realtime, RPC Functions) — tanpa backend server terpisah.

## Fitur Utama
- **Reservasi Publik**: 4 langkah (pilih layanan, tanggal/jam, capster, konfirmasi) dengan validasi server-side via RPC `buat_booking`.
- **POS Kasir**: Kelola layanan (Hair Cut, Extra Service, Produk), pembayaran tunai/QRIS, cetak nota thermal 58mm otomatis.
- **Manajemen Pengeluaran**: Kategori (Barang, Jasa, Gaji), filter tanggal, total otomatis, ekspor CSV.
- **Laporan Keuangan**: Ringkasan omset, laba bersih, grafik batang harian, export CSV, kirim ringkasan ke email.
- **Manajemen Staf**: CRUD akun staf (role: owner, kasir, capster), skema gaji lengkap, target komisi per kategori.
- **Kustomisasi Tema**: Warna latar, teks, outline, logo, kontak, pesan nota, QR promo — live preview tanpa reload.

## Teknologi & Struktur
- **Frontend**: React 18, Vite 5, CSS Murni (Custom Properties, CSS Grid, Flexbox).
- **Backend/DB**: Supabase (PostgreSQL 15+, RLS policies, Realtime, Edge Functions).
- **Auth**: Supabase Auth (email/password, domain `@rove.app`).
- **Realtime**: Supabase Realtime + polling fallback 20 detik.
- **RPC**: Fungsi `buat_booking` (PL/pgSQL, security definer) untuk validasi transaksi.
- **Deploy**: Static hosting (Vercel/Cloudflare/Netlify) + Supabase project.

## Struktur Proyek
```
src/
├── components/        # Receipt58mm, TopBar
├── context/           # AppContext (state global, realtime, auth)
├── lib/               # supabase.js (client + secondary client)
├── pages/             # 11 halaman (Booking, Login, Cashier, dll)
├── utils/             # format.js, media.js, defaults.js
└── App.jsx            # Router berbasis role & view
```

## Keamanan & RLS Ringkas
- `profiles`: Staff baca diri sendiri + capster; Owner full CRUD.
- `services`/`promos`: Owner full CRUD; Staff read-only.
- `bookings`: Staff read + update status; Owner delete; Public insert via RPC.
- `sales`: Staff insert (kasir); Owner update/delete.
- `expenses`: Staff insert (Barang/Jasa); Owner full (termasuk Gaji).
- `shifts`: Staff CRUD milik sendiri; Owner full.
- `settings`: Owner full CRUD.

## Cara Instalasi
1. `git clone` repositori
2. `npm install`
3. `cp .env.example .env` → isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
4. Jalankan migrasi di Supabase SQL Editor (file `supabase/migration.sql`)
5. Buat user owner pertama di Supabase → jalankan SQL pendukung
6. `npm run dev` → akses di `http://localhost:5173`

## Catatan Penting
- Hanya gunakan warna dari token (`--bg`, `--surface`, `--text`, `--accent`).
- Aksen ≤ 5% dari layar, satu fokus utama per layar.
- Spacing kelipatan 4px, radius kartu 12px, tombol 10px tinggi.
- Kontras teks minimal 4.5:1.
- Mobile-first, breakpoint: Mobile <640px, Tablet 640-1023px, Desktop ≥1024px.