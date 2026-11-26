# Rove Barbershop

Aplikasi reservasi dan operasional Rove Barbershop.

## Reservasi

- Slot dimulai setiap 30 menit dari jam buka.
- Reservasi harus dibuat minimal 60 menit sebelum layanan; tepat 60 menit diperbolehkan.
- Slot terakhir adalah nilai paling awal antara batas reservasi terakhir dan jam tutup dikurangi 60 menit.
- Default jam buka 13:00, tutup 21:00, batas reservasi terakhir 19:00.
- Slot dikunci per capster. Pelanggan melihat `Penuh` jika semua capster penuh atau ditutup.
- Owner dan kasir dapat menutup slot untuk satu capster atau semua capster.
- Capster tidak dapat menutup slot atau mengubah status reservasi.

## Pengembangan

```bash
npm install
npm run lint
npm run build
```

Logo toko berada di `public/logo.jpeg`. Ikon PWA tidak diubah. Halaman booking berakhir pada Booking Policy; bagian kontak publik dan pengaturan kontak tidak digunakan lagi. Data kontak lama tidak dihapus dari database. Kontak WhatsApp tetap digunakan untuk laporan staf dan hotline pada nota.

## Migrasi database

Jalankan berurutan di staging/produksi oleh operator database, bukan dari frontend. Untuk database existing, jangan jalankan ulang `migration.sql`; jalankan hanya file migrasi tambahan yang belum pernah dijalankan:

### Instalasi baru

1. Backup database jika diperlukan.
2. Jalankan `supabase/migration.sql`.
3. Jalankan `supabase/migration_reservation_operations.sql`.
4. Deploy frontend baru.
5. Uji staging.
6. Jalankan `supabase/revoke_public_settings.sql` paling terakhir.

### Database existing

1. Backup database.
2. Jangan jalankan ulang `supabase/migration.sql`.
3. Jalankan `supabase/migration_reservation_operations.sql` versi terbaru.
4. Deploy frontend baru.
5. Uji staging.
6. Jalankan `supabase/revoke_public_settings.sql` paling terakhir.

Rollback: pulihkan backup untuk rollback penuh. Untuk rollback transisi, kembalikan frontend lama sebelum mencabut akses publik; jangan mencabut objek baru yang mungkin sudah dipakai frontend baru tanpa rencana SQL terbalik dan pengujian staging.

Selama transisi, frontend lama harus tetap membaca `settings` sampai SQL pencabutan akses publik dijalankan. Frontend baru membaca `public_booking_settings`.
