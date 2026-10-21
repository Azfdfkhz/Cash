# Changelog

## Unreleased
### Fitur
- **Tur interaktif (Product Tour)**: menggantikan panduan modal lama. Tur menyorot elemen UI
  nyata (atribut `data-tour`), meredupkan sisa halaman, menampilkan tooltip dengan progres
  "Langkah n dari N", dan berpindah halaman otomatis. Requester: Beranda, Ajukan (Cash
  Advance + kwitansi Reimbursement), Profil. Operasional: Beranda, Persetujuan/Pencairan,
  Laporan, Profil (termasuk Kelola Pengguna).
- Muncul sekali setelah login pertama (Mulai Tur / Lewati); status belum mulai / berlangsung /
  selesai / dilewati disimpan di `user_metadata.tour` (tanpa migrasi DB, tanpa localStorage).
  Tur yang terhenti ditawarkan lanjut. Ulang lewat Pusat Bantuan atau Profil > Panduan interaktif.
  Pengguna yang sudah melihat panduan lama tidak dipaksa menonton ulang.
- Tur tidak pernah mengklik tombol atas nama pengguna: sorotan hanya bisa diklik pada langkah
  pengisian formulir, tombol Kirim/Setujui/Tolak tidak pernah dijalankan; tur jeda saat ada pop up
  aplikasi, mendukung keyboard (Esc, panah, Tab terkunci), dan `prefers-reduced-motion`.

## 1.1.6
### Keamanan
- **DB (0030)**: `profiles` tidak bisa lagi diubah kolom `role`/`email` oleh user (eskalasi
  jadi Operasional) dan tidak bisa dibaca anonim; grant kolom pada `cash_advances` &
  `cash_advance_returns`; requester tidak bisa "mengonfirmasi" pengembaliannya sendiri; Ops
  tidak bisa menurunkan dirinya sendiri; batas panjang teks & jumlah baris; maks 20 pengajuan
  menunggu / 40 per hari per akun; `anon` dicabut dari semua tabel.
- Open redirect pada `?next=` (login & `/auth/callback`) ditutup.
- Upload Drive: validasi isi file (JPG/PNG/WebP/HEIC/PDF), maks 8 MB, batas piksel, UUID wajib.
- OCR: batas ukuran, validasi format, rate limit (biaya Google Vision).
- Rate limit per user (di DB, lintas instance serverless): OCR, upload, tampil file, import
  RAB, laporan PDF/CSV, dan semua notifikasi Telegram (+ batas per pengajuan).
- CSV injection pada ekspor laporan dinetralkan.
- Header keamanan: CSP, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy.
- Timeout pada Telegram & fetch spreadsheet; ukuran CSV impor dibatasi.
- File kredensial & folder migrasi usang dihapus dari paket.
### Performa
- Middleware & `getUserProfile` memakai `getClaims()` (verifikasi JWT lokal): satu
  round-trip jaringan lebih sedikit tiap navigasi. Halaman Profil memuat paralel.
### UI
- Skeleton saat pindah tab Persetujuan/Pencairan, filter Semua/Menunggu, paginasi, filter
  jenis (termasuk tabel desktop), Laporan, dan isi pop up detail. Placeholder bottom-nav.
