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
4. Jalankan `supabase/migration_2026_11_reservation_fixes.sql`.
5. Deploy frontend baru.
5. Uji staging.
6. Jalankan `supabase/revoke_public_settings.sql` paling terakhir.

### Database existing

1. Backup database.
2. Jangan jalankan ulang `supabase/migration.sql`.
3. Jalankan hanya file migrasi yang belum pernah dijalankan: `supabase/migration_reservation_operations.sql`, lalu `supabase/migration_2026_11_reservation_fixes.sql`.
4. Deploy frontend baru.
5. Uji staging.
6. Jalankan `supabase/revoke_public_settings.sql` paling terakhir.

Rollback: pulihkan backup untuk rollback penuh. Untuk rollback transisi, kembalikan frontend lama sebelum mencabut akses publik; jangan mencabut objek baru yang mungkin sudah dipakai frontend baru tanpa rencana SQL terbalik dan pengujian staging.

Selama transisi, frontend lama harus tetap membaca `settings` sampai SQL pencabutan akses publik dijalankan. Frontend baru membaca `public_booking_settings`.

### Catatan praktis

- `migration.sql` hanya untuk setup database baru dari awal. Jangan jalankan ulang pada database existing.
- `migration_reservation_operations.sql` adalah migrasi operasi yang saat ini dipakai untuk database baru maupun existing yang belum memiliki fitur operasi terbaru.
- Jika aplikasi sudah berjalan dan ada fitur database baru setelah migrasi operasi pernah dijalankan, buat file migrasi baru, misalnya `supabase/migration_2026_11_nama_fitur.sql`. Jalankan hanya file baru tersebut, jangan menimpa atau mengulang file migrasi lama.
- `revoke_public_settings.sql` bukan migrasi fitur. Jalankan hanya satu kali pada tahap public setelah frontend baru live dan `public_booking_settings` sudah diuji.
- Semua SQL dijalankan oleh operator di staging terlebih dahulu, bukan dari frontend atau agent.
