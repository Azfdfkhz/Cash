# Changelog

## 1.2.0
### Tipografi & keterbacaan
- Teks minimal 11 px di semua layar. Penyebab teks 10,5 px: `text-xs` berbasis rem sementara
  root desktop 14 px; sekarang `--text-xs: max(0.75rem, 11px)` (globals.css). Semua `text-[10px]`,
  `text-[9px]`, dan `text-[8.5px]` dinaikkan ke 11 px.
- Kontras: `text-slate-400` (2,6:1) diganti `text-slate-500` (4,8:1) untuk teks dan placeholder
  di latar terang (panel gelap halaman masuk tidak diubah). Pusat Bantuan memakai slate-600/700.
- Pusat Bantuan & Glosarium: setiap paragraf/unit penjelasan maksimal 80 karakter (bukan ukuran
  font). Isi dipecah jadi poin (`common`, `details`, langkah per peran) dan dijaga oleh
  `tests/help.test.mjs`. Teks panduan per topik memakai `text-base`.
- Hapus card di dalam card: kotak tenggat LPJ, baris file bukti pengembalian, kotak rekening
  pencairan, ikon spreadsheet, dan form Catat Kwitansi di dalam pop up.
- Identitas desain CashGue (warna, bentuk, hierarki) tidak diubah.

### Modal & alur tindakan
- State modal terpusat: `lib/modalState.js` + `lib/useModalState.js`. Hanya SATU modal aktif
  (detail, catat kwitansi, kembalikan sisa, konfirmasi keputusan); membuka yang baru otomatis
  menggantikan yang lama, menggantikan boolean `detailOpen/scanOpen/returnOpen/result` terpisah
  di `CashAdvanceReviewModal`, `ApprovalsWorkspace`, dan `CashAdvanceDetailPopup`.
- Catat kwitansi punya tombol Kembalikan Sisa dan Lihat Detail (konfirmasi bila ada isian
  belum tersimpan). Dialog persetujuan punya tombol Lihat Detail. Menutup Detail kembali ke
  halaman sebelumnya tanpa membuka modal lain.
- Escape menutup modal teratas saja (sebelumnya menutup seluruh panel tinjau).
- Hasil aksi tampil jelas: `ActionToast` (berhasil/gagal) dan pesan galat berperan `alert`.
- Tes baru: `tests/modal.test.mjs`.

### Perbaikan
- **DB (0033)**: Tim Operasional tidak bisa lagi mengonfirmasi pengembalian sisa saldo atas
  pengajuannya sendiri (policy `returns_confirm`), menyamakan aturan dengan
  persetujuan/pencairan (`0003_no_self_approve.sql`). Tombol "Konfirmasi" di `ReturnsSection`
  juga disembunyikan untuk pemilik pengajuan, dengan guard tambahan di `handleConfirm`.
- Folder `supabase/migrations/` disamakan dengan `src/lib/supabase/migrations/` (sebelumnya
  hilang `0030_security_hardening.sql` dan `0031_signup_domain_policy.sql`), supaya setup
  mengikuti README/PRODUCTION_CHECKLIST benar-benar menjalankan semua hardening keamanan.

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
