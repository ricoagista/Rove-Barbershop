# Panduan Rove Barbershop: Jadi Website, Lalu Jadi APK

Semua gratis. Cukup klik, salin, dan tempel. Tidak perlu menulis kode.
Waktu: sekitar 1 jam. Kerjakan berurutan. Pakai laptop kalau bisa.

## Isi paket ini
- Folder **rove-barbershop**: ini yang nanti diunggah jadi website. Jangan ubah nama file di dalamnya.
- **supabase-setup.sql**: tulisan untuk disalin ke Supabase. (Tidak ikut diunggah ke website.)
- **PANDUAN.md**: panduan ini.

## Yang perlu disiapkan
- Laptop dengan internet
- Satu akun Gmail
- Notepad (sudah ada di Windows)
- Buku catatan untuk mencatat semua password

## Gambaran singkat
1. **Supabase** = lemari tempat data disimpan (layanan, transaksi, reservasi).
2. **Netlify** = tempat website tayang di internet.
3. **PWABuilder** = mesin pengubah website jadi file APK.

---

## BAGIAN 1. Siapkan lemari data (Supabase)

**Langkah 1. Buat proyek**
1. Buka **supabase.com**, klik **Start your project**, masuk dengan Google.
2. Klik **New project**. Isi Name `rove-barbershop`, buat Database Password (catat di buku), Region **Southeast Asia (Singapore)**.
3. Klik **Create new project**. Tunggu 1-2 menit.

**Langkah 2. Matikan konfirmasi email**
1. Menu kiri: **Authentication**, lalu **Sign In / Providers**, klik **Email**.
2. Matikan **Confirm email**, klik **Save**.

**Langkah 3. Pasang tabel**
1. Menu kiri: **SQL Editor**, lalu **New query**.
2. Buka `supabase-setup.sql` dengan Notepad, tekan **Ctrl+A** lalu **Ctrl+C**.
3. Tempel di Supabase (**Ctrl+V**), klik **Run**. Harus muncul **Success**.
   Kalau merah: foto layarnya dan kirim ke saya.

**Langkah 4. Buat akun Owner (pemilik)**
1. **Authentication**, **Users**, **Add user**, **Create new user**.
2. Email: `admin@rove.app`. Buat password (catat di buku). Centang **Auto Confirm User**.
3. Klik **Create user**.

**Langkah 5. Jadikan akun itu Owner**
1. **SQL Editor**, **New query** (kotak kosong).
2. Tempel tulisan ini, lalu **Run**:

```
insert into kv(col, id, data)
select 'accounts', id::text, jsonb_build_object('name', 'Owner Rove', 'role', 'owner', 'username', 'admin')
from auth.users where email = 'admin@rove.app'
on conflict (col, id) do nothing;
```
3. Nanti masuk ke aplikasi dengan username **admin** dan password dari Langkah 4.

**Langkah 6. Ambil dua kode**
1. Klik roda gigi **Project Settings**, lalu **API**.
2. Salin **Project URL** (bentuknya `https://abcdefgh.supabase.co`).
3. Salin kunci **anon public** (panjang, diawali `eyJ`). **Jangan** salin `service_role`.
4. Buka `rove-barbershop/config.js` dengan Notepad. Ganti:
   - `ISI_ALAMAT_PROJECT_SUPABASE` dengan Project URL
   - `ISI_KUNCI_ANON_PUBLIC` dengan kunci anon
   Tanda kutip `'` jangan dihapus. Lalu **File, Save**.

---

## BAGIAN 2. Tayangkan website (Netlify)

**Langkah 7. Unggah folder**
1. Buka **netlify.com**, **Sign up**, masuk dengan Google.
2. Pilih **Add new site**, lalu **Deploy manually** (atau Drag and drop).
3. Ekstrak zip dulu. Seret folder **rove-barbershop** ke kotak yang tersedia.
4. Tunggu sampai muncul alamat seperti `https://nama-acak.netlify.app`.

**Langkah 8. Beri nama bagus (boleh dilewati)**
**Site configuration**, **Change site name**, isi `rove-barbershop`.

**Langkah 9. Coba**
1. Buka alamatnya di HP. Harus muncul halaman **Reservasi Rove Barbershop**.
2. Tekan tulisan **Login** kecil di kanan atas, masuk dengan `admin` dan password Owner.
3. Isi dulu: **Pengaturan**, **Layanan**, **Promo**, **Akun** (buat capster dan kasir).
4. **Keluar**, lalu coba reservasi sebagai pelanggan. Pesanannya harus muncul di tab **Reservasi** saat login lagi.

Kalau halaman putih atau tertulis "Belum dihubungkan": `config.js` belum benar. Cek Langkah 6, simpan, lalu unggah ulang folder.

**Cara paling mudah tanpa APK:** buka website di Chrome HP, tekan titik tiga, pilih **Tambahkan ke layar utama** / **Instal aplikasi**.

---

## BAGIAN 3. Ubah jadi APK

**Langkah 10. Buat APK**
1. Buka **pwabuilder.com**, tempel alamat Netlify Anda, klik **Start**.
2. Tunggu selesai. Nilai merah/kuning kecil boleh diabaikan.
3. Klik **Package for stores**, pilih **Android**.
4. Isi: Package ID `com.rove.barbershop`, App name `Rove Barbershop`, signing key **Create new**.
5. Klik **Generate**, lalu **Download** (dapat file zip).
6. **Simpan baik-baik** file `signing.keystore` dan passwordnya. Kalau hilang, aplikasi tidak bisa diperbarui.

**Langkah 11. Pasang di HP Android**
1. Ekstrak zip, cari file berakhiran **.apk**.
2. Kirim ke HP (WhatsApp ke diri sendiri atau Google Drive).
3. Buka file .apk, izinkan **Instal dari sumber tidak dikenal** kalau diminta.
4. Aplikasi **Rove Barbershop** muncul di layar HP.

**Langkah 12 (opsional). Hilangkan garis alamat di atas aplikasi**
Garis itu normal pada APK gratis. Cara menghilangkannya:
1. Di zip dari PWABuilder, buka file **assetlinks.json** dengan Notepad.
2. Di folder `rove-barbershop` buat folder baru bernama `well-known` (tanpa titik di depan).
3. Taruh file `assetlinks.json` di dalam folder `well-known`.
4. Unggah ulang folder `rove-barbershop` ke Netlify (Deploys, seret folder lagi).
5. Hapus aplikasi lama di HP, pasang APK lagi.
Kalau gagal, hubungi saya.

**Play Store (tidak wajib):** ada biaya daftar developer Google sekali bayar. Pakai file **.aab** dari zip yang sama.

---

## Mencetak nota 58mm
1. Pair printer Bluetooth di pengaturan Bluetooth HP.
2. Di aplikasi tekan **Cetak nota**, pilih printer. Di Android biasanya perlu aplikasi layanan cetak dari pembuat printer, atau aplikasi seperti RawBT.
3. Hasil bisa beda tiap HP. Coba satu nota dulu.

## Memperbarui aplikasi
Kalau saya beri file baru: ganti file lama di folder `rove-barbershop` (jangan timpa `config.js` Anda), lalu di Netlify buka **Deploys** dan seret folder lagi. APK **tidak perlu dibuat ulang**. Cukup tutup dan buka lagi aplikasinya.

## Hal yang perlu diketahui
- **Gratis ada batasnya.** Supabase gratis bisa dijeda kalau lama tidak dipakai: buka dashboard, klik Restore.
- **Lupa password staf:** Supabase, **Authentication, Users**, titik tiga di akun itu, ubah password.
- **Hapus akun di aplikasi** hanya mencabut akses. Hapus total lewat Supabase, **Authentication, Users**.
- **Cadangan data:** Supabase, **Table Editor**, tabel `kv`, unduh berkala.
- **Jangan bagikan** password Owner dan kunci `service_role`.
- **Belum ada:** email/WhatsApp otomatis saat ada reservasi, dan Close Service otomatis 23:59 saat aplikasi tidak dibuka (opsional, petunjuk di bawah `supabase-setup.sql`).

## Kalau tersangkut
Foto layar bagian yang bermasalah (termasuk tulisan error), kirim ke saya, dan sebutkan Anda di Langkah nomor berapa.
