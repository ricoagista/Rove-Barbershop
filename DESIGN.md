# DESIGN.md — Rove Barbershop (Warna & Layout)

Fokus dokumen ini hanya **tampilan aplikasi**: warna dan layout. Tidak membahas logika sistem, alur data, atau fitur.

---

## 1. Warna

### 1.1 Palet inti

| Token | Hex | Fungsi |
|---|---|---|
| `--bg` | `#121212` | Latar halaman |
| `--surface` | `#1E1E1E` | Kartu, panel, bottom sheet |
| `--surface-2` | `#262626` | Kartu di dalam kartu, input |
| `--border` | `#2E2E2E` | Garis pemisah, outline kartu |
| `--text` | `#F4EFE6` | Teks utama |
| `--text-muted` | `#A8A196` | Teks sekunder, label, placeholder |
| `--accent` | `#C29B5A` | Tombol utama, ikon aktif, highlight |
| `--accent-hover` | `#D4AE6E` | Hover / fokus tombol utama |
| `--accent-pressed` | `#9C7A40` | Saat ditekan |
| `--on-accent` | `#121212` | Teks/ikon di atas warna aksen |

### 1.2 Warna status

| Token | Hex | Fungsi |
|---|---|---|
| `--success` | `#4C9A6A` | Berhasil, tersedia |
| `--warning` | `#D9A441` | Perhatian |
| `--danger` | `#C0483A` | Error, penuh |
| `--info` | `#5B8DB8` | Informasi netral |

### 1.3 Aturan pemakaian

- Komposisi: **±70% latar/netral, ±25% surface, ≤5% aksen**.
- Aksen hanya untuk elemen yang harus menarik perhatian: tombol utama, tab aktif, ikon aktif, badge penting.
- Satu elemen aksen dominan per layar.
- Status tidak boleh mengandalkan warna saja; sertakan ikon atau teks.
- Kontras teks minimal **4.5:1** (teks besar 3:1).

### 1.4 Mode terang (opsional)

| Token | Hex |
|---|---|
| `--bg` | `#F4EFE6` |
| `--surface` | `#FFFFFF` |
| `--surface-2` | `#EDE6D9` |
| `--border` | `#D9CFBF` |
| `--text` | `#121212` |
| `--text-muted` | `#6B655B` |
| `--accent` | `#9C7A40` |
| `--accent-hover` | `#85662F` |
| `--on-accent` | `#FFFFFF` |

### 1.5 CSS siap salin

```css
:root {
  --bg: #121212;
  --surface: #1E1E1E;
  --surface-2: #262626;
  --border: #2E2E2E;
  --text: #F4EFE6;
  --text-muted: #A8A196;
  --accent: #C29B5A;
  --accent-hover: #D4AE6E;
  --accent-pressed: #9C7A40;
  --on-accent: #121212;
  --success: #4C9A6A;
  --warning: #D9A441;
  --danger: #C0483A;
  --info: #5B8DB8;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #F4EFE6;
    --surface: #FFFFFF;
    --surface-2: #EDE6D9;
    --border: #D9CFBF;
    --text: #121212;
    --text-muted: #6B655B;
    --accent: #9C7A40;
    --accent-hover: #85662F;
    --on-accent: #FFFFFF;
  }
}
```

---

## 2. Layout

### 2.1 Prinsip

- **Mobile-first.** Rancang di lebar 390px dulu, lalu perluas.
- Satu kolom di mobile, maksimal dua kolom di tablet, tiga di desktop.
- Konten penting (aksi utama) berada di jangkauan ibu jari: bagian bawah layar.

### 2.2 Breakpoint & kontainer

| Nama | Lebar | Kolom | Margin sisi | Gutter | Lebar maks. konten |
|---|---|---|---|---|---|
| Mobile | < 640px | 4 | 16px | 16px | 100% |
| Tablet | 640–1023px | 8 | 24px | 24px | 720px |
| Desktop | ≥ 1024px | 12 | 32px | 24px | 1120px |

### 2.3 Skala spacing (basis 4px)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`

| Pemakaian | Nilai |
|---|---|
| Jarak ikon ke teks | 8px |
| Padding dalam kartu | 16px (mobile), 24px (desktop) |
| Jarak antar kartu | 12px |
| Jarak antar section | 32px (mobile), 64px (desktop) |
| Padding vertikal halaman | 24px atas, 32px bawah |

### 2.4 Radius & elevasi

| Elemen | Radius |
|---|---|
| Input, chip | 8px |
| Kartu, panel | 12px |
| Bottom sheet / modal | 20px (sudut atas) |
| Tombol | 10px (konsisten di seluruh aplikasi) |
| Avatar, badge bulat | 999px |

- Tema gelap: pakai **border 1px `--border`** untuk memisahkan layer, bukan shadow.
- Tema terang: shadow lembut `0 1px 3px rgba(0,0,0,.08)`.

### 2.5 Tipografi (hanya untuk menunjang layout)

| Level | Ukuran | Berat | Line-height |
|---|---|---|---|
| Judul layar | 24px | 700 | 1.2 |
| Judul section | 18px | 600 | 1.3 |
| Body | 16px | 400 | 1.5 |
| Label / caption | 13px | 500 | 1.4 |

Font disarankan: **Oswald** untuk judul (uppercase), **Inter** untuk isi.

---

## 3. Struktur Layar

### 3.1 Kerangka dasar (mobile)

```
┌──────────────────────────┐
│ Status bar (safe area)   │
├──────────────────────────┤
│ App bar          (56px)  │  logo / judul · aksi ikon
├──────────────────────────┤
│                          │
│ Konten (scroll)          │  margin sisi 16px
│  ├ Hero / ringkasan      │
│  ├ Section 1             │
│  ├ Section 2             │
│  └ ...                   │
│                          │
├──────────────────────────┤
│ Tombol aksi sticky (72px)│  opsional, 1 tombol utama
├──────────────────────────┤
│ Bottom nav       (64px)  │  3–5 tab
│ Home indicator (safe)    │
└──────────────────────────┘
```

### 3.2 Kerangka desktop

```
┌────────┬───────────────────────────────┐
│ Sidebar│ Top bar (64px)                │
│ 240px  ├───────────────────────────────┤
│        │ Konten (maks. 1120px, tengah) │
│        │  grid 12 kolom                │
└────────┴───────────────────────────────┘
```

Sidebar bisa diciutkan menjadi 72px (ikon saja) di bawah 1280px.

### 3.3 Pola layar umum

| Layar | Susunan |
|---|---|
| **Beranda** | Hero (gambar + judul) → grid aksi cepat 2×2 → daftar horizontal (scroll) → daftar vertikal |
| **Daftar** | Search bar → chip filter (scroll horizontal) → kartu vertikal |
| **Detail** | Gambar atas (rasio 16:9) → judul + meta → deskripsi → tombol aksi sticky |
| **Formulir** | Satu kolom, label di atas input, jarak antar field 16px, tombol utama lebar penuh di bawah |
| **Profil / Pengaturan** | Header avatar → grup daftar bergaris dengan ikon + chevron |

---

## 4. Komponen (visual saja)

### Tombol
| Varian | Bg | Teks | Border |
|---|---|---|---|
| Primary | `--accent` | `--on-accent` | — |
| Secondary | transparan | `--accent` | 1px `--accent` |
| Ghost | transparan | `--text` | — |
| Destructive | `--danger` | `#FFFFFF` | — |

- Tinggi 48px (besar) / 40px (kecil), padding horizontal 24px.
- Hover: `--accent-hover`. Pressed: `--accent-pressed`. Disabled: opasitas 40%.
- Tombol utama lebar penuh di mobile.
- Fokus keyboard: `outline: 2px solid var(--accent); outline-offset: 2px`.

### Kartu
- Bg `--surface`, border 1px `--border`, radius 12px, padding 16px.
- Kartu yang bisa diklik: border berubah ke `--accent` saat hover/fokus.
- Gambar di kartu: rasio 4:3 atau 16:9, radius atas ikut kartu.

### Input
- Bg `--surface-2`, border 1px `--border`, radius 8px, tinggi 48px, padding 0 16px.
- Fokus: border `--accent`. Error: border `--danger` + teks bantu 13px `--danger`.
- Label 13px `--text-muted` di atas input.

### Chip / Badge
- Chip: tinggi 32px, radius 999px, bg `--surface-2`; aktif = bg `--accent`, teks `--on-accent`.
- Badge status: bg warna status dengan opasitas 16%, teks warna status penuh.

### App bar & Bottom nav
- App bar: bg `--bg`, border bawah 1px `--border`, tinggi 56px.
- Bottom nav: bg `--surface`, border atas 1px `--border`, tinggi 64px; tab aktif ikon + label `--accent`, tidak aktif `--text-muted`.

### Daftar (list item)
- Tinggi minimal 56px, padding 12px 16px, pemisah 1px `--border`.
- Susunan: ikon/avatar kiri (40px) → teks (judul 16px + sub 13px muted) → aksi/chevron kanan.

### Modal & Bottom sheet
- Bg `--surface`, overlay `rgba(0,0,0,.6)`.
- Handle sheet: 40×4px, `--border`, di tengah atas.

---

## 5. Gambar & Ikon

- Ikon garis 1.5px (Lucide / Phosphor), ukuran 20px (inline) dan 24px (navigasi).
- Foto: close-up bertone hangat, kontras tinggi. Beri gradient bawah `rgba(0,0,0,0)` → `rgba(0,0,0,.7)` bila ada teks di atas foto.
- Ilustrasi/pola dekor: garis tipis, warna `--border` atau `--accent` opasitas rendah.

---

## 6. Checklist Konsistensi

- [ ] Hanya memakai warna dari token, tanpa hex baru.
- [ ] Aksen ≤ 5% dari layar, satu fokus utama.
- [ ] Spacing kelipatan 4px.
- [ ] Radius konsisten per jenis elemen.
- [ ] Target sentuh ≥ 44×44px.
- [ ] Kontras teks lulus 4.5:1.
- [ ] Diuji di 360px, 390px, 768px, dan 1280px.
- [ ] Mendukung safe area (notch & home indicator).

---

## 7. Prompt Singkat untuk AI / Desainer

```
Ikuti DESIGN.md Rove Barbershop (hanya styling).
Tema gelap: bg #121212, surface #1E1E1E, teks #F4EFE6, aksen #C29B5A (maks. 5%).
Mobile-first, spacing kelipatan 4px, radius kartu 12px, tombol 10px, tombol utama tinggi 48px.
Pisahkan layer dengan border 1px #2E2E2E, tanpa shadow. Font: Oswald (judul), Inter (isi).
Jangan menambahkan warna di luar token.
```

---
