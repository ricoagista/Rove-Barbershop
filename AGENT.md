# Agent notes

- Jangan menjalankan SQL ke database produksi.
- Untuk perubahan reservasi, gunakan WIB (`Asia/Jakarta`) dan advisory lock per tanggal.
- Jalankan lint dan build sebelum commit.
- Gunakan `public/logo.jpeg`; jangan menambahkan logo tertanam, upload logo, atau tema dinamis.
- `supabase/migration_reservation_operations.sql` dijalankan setelah backup dan diuji di staging.
- `supabase/revoke_public_settings.sql` dijalankan terakhir setelah frontend baru live.
