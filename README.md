# Rove Barbershop

Aplikasi reservasi dan operasional Rove Barbershop.

## Reservasi

- Slot dimulai setiap 30 menit dari jam buka.
- Reservasi harus dibuat minimal 60 menit sebelum layanan; tepat 60 menit diperbolehkan.
- Slot terakhir adalah nilai paling awal antara batas reservasi terakhir dan jam tutup dikurangi 60 menit.
- Default jam buka 13:00, tutup 21:00, batas reservasi terakhir 19:00.
- Slot dikunci per capster. Pelanggan melihat `Penuh` jika semua capster penuh atau ditutup.
- Owner dan kasir dapat menutup slot untuk satu capster atau semua capster.

## Pengembangan

```bash
npm install
npm run lint
npm run build
```

Logo toko berada di `public/logo.jpeg`. Ikon PWA tidak diubah.

## Migrasi database

Jalankan berurutan di staging/produksi oleh operator database, bukan dari frontend:

1. Backup database.
2. Jalankan `supabase/migration_reservation_operations.sql`.
3. Deploy frontend baru.
4. Setelah view publik teruji, jalankan `supabase/revoke_public_settings.sql`.
5. Untuk instalasi baru, gunakan `supabase/migration.sql` lalu migrasi operasi.

Rollback: pulihkan backup untuk rollback penuh. Untuk rollback transisi, kembalikan frontend lama sebelum mencabut akses publik; jangan mencabut objek baru yang mungkin sudah dipakai frontend baru tanpa rencana SQL terbalik dan pengujian staging.

Selama transisi, frontend lama harus tetap membaca `settings` sampai SQL pencabutan akses publik dijalankan. Frontend baru membaca `public_booking_settings`.
