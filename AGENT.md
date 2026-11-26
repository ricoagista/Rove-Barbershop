# Agent notes

- Jangan menjalankan SQL ke database produksi.
- Untuk perubahan reservasi, gunakan WIB (`Asia/Jakarta`) dan advisory lock per tanggal.
- Jalankan lint dan build sebelum commit.
- Gunakan `public/logo.jpeg`; jangan menambahkan logo tertanam, upload logo, atau tema dinamis.
- `DESIGN.md` adalah satu-satunya acuan tampilan: tema gelap navy, `--accent` hanya untuk isi/garis, sedangkan teks, ikon aktif, dan fokus memakai `--accent-text`. Tidak ada emas atau mode terang.
- `supabase/migration_reservation_operations.sql` lalu `supabase/migration_reservation_fixes.sql` dijalankan setelah backup dan diuji di staging. Jangan mengubah migrasi operasi yang mungkin sudah pernah dijalankan.
- `supabase/revoke_public_settings.sql` dijalankan terakhir setelah frontend baru live.
- Halaman booking tidak menampilkan kontak; data kontak lama tidak dihapus. WhatsApp/email tetap dipertahankan bila dipakai nota atau laporan staf.
- Booking Policy menjadi bagian terakhir halaman booking; pengaturan yang dipertahankan hanya policy, jam operasional, pesan nota, dan QR promo.
