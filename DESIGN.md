# DESIGN.md — Rove Barbershop (Tampilan)

Dokumen ini hanya mengatur **tampilan**: warna, huruf, bentuk, komponen, dan aturan visual. Logika, fitur, teks aplikasi, dan susunan halaman tidak diatur di sini.

Acuan visual: [Linktree Rove Barbershop](https://linktr.ee/rove_barbershop).

---

## 1. Karakter Visual

- Gelap bernuansa **navy**, dengan **biru Rove** sebagai identitas.
- Bersih, lembut, dan modern. Bentuk membulat, garis tipis, tanpa bayangan tebal.
- Warna selain biru dibuat kalem. Tidak ada emas, neon, atau warna mencolok.
- Tanpa stiker atau hiasan tambahan.

Berlaku untuk **seluruh aplikasi**, **tema gelap saja**. Nota thermal tetap hitam putih.

---

## 2. Warna

Kolom "Asal": **Foto** berarti sampel piksel dari acuan, **Turunan** berarti disusun agar serasi dan terbaca.

### 2.1 Inti

| Token | Hex | Fungsi | Asal |
|---|---|---|---|
| `--bg` | `#050F27` | Latar halaman | Foto |
| `--bg-deep` | `#030D23` | Ujung bawah gradasi | Foto |
| `--bg-glow` | `#34373B` | Cahaya lembut di tengah latar | Foto |
| `--surface` | `#161D2E` | Kartu, tombol tautan, panel | Foto |
| `--surface-2` | `#1F273A` | Input, elemen di dalam kartu | Turunan |
| `--border` | `#27324A` | Pemisah dan garis netral | Turunan |
| `--text` | `#FFFFFF` | Teks utama | Foto |
| `--text-muted` | `#A8A9AC` | Teks sekunder, label | Foto |
| `--accent` | `#093596` | Isi tombol utama, garis tombol dan kartu | Foto |
| `--accent-hover` | `#0D42B5` | Hover | Turunan |
| `--accent-pressed` | `#072A78` | Saat ditekan | Turunan |
| `--accent-text` | `#A1B8E3` | Judul merek, tautan, ikon aktif, fokus | Foto |
| `--on-accent` | `#FFFFFF` | Teks di atas `--accent` | Turunan |

### 2.2 Status (kalem)

| Token | Hex | Fungsi |
|---|---|---|
| `--success` | `#83B7A0` | Berhasil, tersedia |
| `--warning` | `#CDB482` | Perhatian |
| `--danger` | `#D6969C` | Teks dan garis error |
| `--danger-fill` | `#8A3F4B` | Isi tombol hapus (teks putih) |
| `--info` | `#A1B8E3` | Informasi netral |
| `--unavailable-bg` | `#2B2F37` | Slot penuh atau tidak tersedia (abu-abu) |
| `--unavailable-text` | `#A8A9AC` | Teks pada elemen tidak tersedia |

### 2.3 Aturan pemakaian

- `--accent` **tidak boleh** menjadi warna teks atau ikon di latar gelap (kontras hanya sekitar 1.8:1). Gunakan `--accent-text`.
- Garis `--accent` hanya hiasan. Status terpilih atau fokus harus memakai `--accent-text`.
- Teks minimal berkontras **4.5:1**; teks besar dan penanda komponen minimal 3:1.
- Status tidak boleh dibedakan lewat warna saja. Sertakan teks atau ikon.
- Badge status diletakkan di atas `--bg` atau `--surface`, tidak langsung di atas cahaya latar.
- Jangan menambah warna di luar token.

### 2.4 Latar

- Halaman pelanggan: gradasi vertikal `--bg` ke `--bg-deep`, dengan cahaya radial lembut `--bg-glow` di bagian tengah. Tekstur bintik sangat halus boleh dipakai.
- Halaman kasir dan Owner: `--bg` polos, tanpa cahaya dan tekstur.

---

## 3. Huruf

Satu keluarga huruf: **Inter**, cadangan `system-ui, sans-serif`. Huruf dipilih karena mirip dengan acuan.

| Level | Ukuran | Berat | Line-height | Warna |
|---|---|---|---|---|
| Nama merek | 24px | 700 | 1.2 | `--accent-text` |
| Judul layar | 24px | 700 | 1.2 | `--text` |
| Judul section | 18px | 600 | 1.3 | `--text` |
| Body | 16px | 400 | 1.5 | `--text` |
| Label tombol | 16px | 600 | 1.3 | sesuai tombol |
| Keterangan | 13px | 500 | 1.4 | `--text-muted` |

Judul tidak memakai huruf kapital semua.

---

## 4. Spacing, Bentuk, dan Ukuran

- Skala spacing: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`.
- Padding kartu: 16px (mobile), 24px (desktop).
- Jarak antar kartu atau tombol tumpuk: 12px.

| Elemen | Radius |
|---|---|
| Tombol, chip, badge, avatar | 999px (kapsul atau bulat) |
| Kartu, panel | 20px |
| Bottom sheet, modal | 24px |
| Input, tombol ikon, gambar dalam kartu | 12px |

Pemisah antar lapisan memakai garis 1px, bukan bayangan.

---

## 5. Komponen

### 5.1 Tombol

| Varian | Latar | Teks | Garis 1px |
|---|---|---|---|
| Utama | `--accent` | `--on-accent` | `--accent` |
| Sekunder | `--surface` | `--text` | `--accent` |
| Ghost | transparan | `--accent-text` | tidak ada |
| Hapus | `--danger-fill` | `#FFFFFF` | tidak ada |

- Tinggi 48px (standar) atau 44px (ringkas), padding horizontal 24px.
- Hover: utama memakai `--accent-hover`; lainnya bergaris `--accent-text`.
- Ditekan: `--accent-pressed`.
- Nonaktif: latar `--unavailable-bg`, teks `--unavailable-text`, garis `--bg-glow`.
- Fokus keyboard: outline 2px `--accent-text`, offset 2px.

### 5.2 Tombol tautan (ciri khas)

- Untuk pilihan besar di halaman pelanggan.
- Kapsul, tinggi minimal 64px, lebar penuh, latar `--surface` sedikit transparan, garis `--accent`.
- Ikon di kiri, label di tengah, keterangan kecil di bawah label bila ada.

### 5.3 Kartu

- Latar `--surface`, garis 1px `--accent`, radius 20px.
- Bisa diklik: garis berubah `--accent-text` saat hover atau fokus.
- Di kasir dan Owner, garis kartu memakai `--border` agar tidak ramai.

### 5.4 Input

- Latar `--surface-2`, garis 1px `--border`, radius 12px, tinggi 48px, padding 0 16px.
- Fokus: garis `--accent-text`.
- Error: garis `--danger`, teks bantu 13px `--danger`.
- Label 13px `--text-muted` di atas input.

### 5.5 Chip slot dan capster

| Keadaan | Latar | Teks | Penanda |
|---|---|---|---|
| Tersedia | `--surface` | `--text` | garis `--accent` |
| Terpilih | `--accent` | `--on-accent` | garis 2px `--accent-text` + ikon centang |
| Tidak tersedia | `--unavailable-bg` | `--unavailable-text` | teks keterangan, tidak bisa diklik |

Tinggi minimal 44px.

### 5.6 Badge status

Latar warna status dengan opasitas 16%, teks warna status penuh, radius 999px.

### 5.7 Navigasi, daftar, modal

- App bar: latar `--bg`, garis bawah `--border`, tinggi 56px.
- Navigasi: latar `--surface`; aktif `--accent-text`, tidak aktif `--text-muted`.
- Baris daftar: tinggi minimal 56px, padding 12px 16px, pemisah `--border`.
- Modal: latar `--surface`, overlay `rgba(0,0,0,.6)`.

---

## 6. Logo, Gambar, dan Ikon

- Logo: `public/logo.jpeg`, dipotong bulat. Ukuran 96px di bagian kepala halaman pelanggan, 40px di app bar. Jangan diwarnai ulang atau diregangkan.
- Foto toko diambil dari folder `public`, sudut 12px.
- Ikon garis 1.5px (Lucide atau Phosphor), 20px di dalam teks dan 24px di tombol serta navigasi.

---

## 7. Responsif dan Aksesibilitas

| Nama | Lebar | Margin sisi | Lebar maks. konten |
|---|---|---|---|
| Mobile | < 640px | 16px | 100% |
| Tablet | 640–1023px | 24px | 720px |
| Desktop | ≥ 1024px | 32px | 1120px |

- Rancang mobile-first.
- Target sentuh minimal 44×44px.
- Dukung safe area.

---

## 8. Checklist

- [ ] Hanya memakai token warna.
- [ ] Tidak ada teks atau ikon berwarna `--accent` di latar gelap.
- [ ] Spacing kelipatan 4px dan radius sesuai tabel.
- [ ] Kontras teks lulus 4.5:1.
- [ ] Slot tidak tersedia punya teks keterangan.
- [ ] Kasir dan Owner memakai versi polos.
- [ ] Tidak ada mode terang dan stiker.
- [ ] Diuji di 360px, 390px, 768px, dan 1280px.
