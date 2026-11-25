-- Jalankan setelah frontend baru sudah live dan public_booking_settings sudah teruji.
-- Backup database terlebih dahulu. Ini menghapus akses anon ke tabel settings.
drop policy if exists "pub_read_settings" on public.settings;
revoke all on table public.settings from anon;
-- Akses staf tetap berasal dari policy staff_read_settings/owner_all_settings.
notify pgrst, 'reload schema';
