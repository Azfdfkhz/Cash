# Checklist Produksi — v1.1.6

## A. Wajib SEBELUM go-live (tidak bisa dilakukan lewat kode)

1. **Rotasi semua kredensial.** Zip yang diterima berisi `google-service-account.json`
   (private key asli), `credentials.json` dan `google-service-account1.json` (OAuth client
   secret). Anggap semuanya bocor: hapus key di Google Cloud Console → IAM → Service
   Accounts → Keys, buat client secret baru, ganti env di Vercel. Cek riwayat Git
   (`git log --all -- credentials.json`); bila pernah ter-commit, bersihkan riwayat
   (git filter-repo) dan rotasi juga token Telegram & refresh token Drive.
2. **Jalankan migrasi `supabase/migrations/0030_security_hardening.sql`, `0031_signup_domain_policy.sql`,
   `0032_realtime_and_username_format.sql`, dan `0033_no_self_confirm_return.sql`** di SQL Editor
   secara berurutan (semua idempoten, tidak menghapus data). Sebelumnya 0030 & 0031 hanya ada di
   `src/lib/supabase/migrations/` (tidak tersinkron ke folder ini); sudah disamakan. Tanpa 0030,
   siapa pun yang punya akun bisa menjadikan dirinya Tim Operasional, dan pengunjung anonim bisa
   membaca semua rekening bank. Kode aplikasi tetap jalan tanpa migrasi (pembatas laju fail-open),
   tetapi celahnya tetap terbuka.
3. **Supabase → Authentication**: aktifkan konfirmasi email, naikkan minimum panjang
   password (≥ 10), aktifkan *leaked password protection*, aktifkan CAPTCHA
   (Turnstile/hCaptcha) untuk sign-up & login, cek rate limit Auth, dan isi *Site URL* /
   *Redirect URLs* hanya dengan domain produksi.
4. **Batasi pendaftaran ke email organisasi** (bagian 10 di 0030, saat ini dikomentari).
   Halaman daftar menulis "email perusahaan" tetapi tidak ada yang memaksakannya.
5. **Supabase**: aktifkan backup harian/PITR dan pantau Security Advisor.
6. **Vercel**: aktifkan Firewall / Attack Challenge Mode untuk `/api/*` bila diserang.

## B. Keputusan yang perlu Anda ambil

- **Foto & PDF di Drive dibuat "siapa saja dengan link"** (`src/lib/google/drive.js`).
  Aplikasi sudah menyajikan file lewat `/api/files/*` (dijaga login + RLS), jadi izin
  publik hanya dibutuhkan tautan Telegram, kolom "Link Foto" di CSV, dan iframe di
  halaman Laporan. Bukti transfer/kwitansi adalah data keuangan: sebaiknya izin dibatasi
  dan tautan dialihkan ke `/api/files/<id>`. Tidak saya ubah karena memutus fitur tsb.
- **Profil staf Operasional terbaca oleh semua user yang login** (dibutuhkan agar requester
  melihat nama approver). Email/rekening/Telegram ID staf Ops ikut terbaca. Opsi lanjutan:
  pisahkan field sensitif ke tabel lain atau buat RPC khusus nama.
- Scope service account terlalu lebar (`drive` penuh + `cloud-platform`). Bila Drive memakai
  OAuth, hapus fallback service account.
- ID file Drive pada kwitansi tidak divalidasi saat disimpan (risiko rendah; butuh tahu id
  file orang lain).
- Batas body fungsi Vercel 4,5 MB: PDF lebih besar gagal dengan 413 dari platform.
- 2 error lint lama (`set-state-in-effect`) di halaman pengajuan baru; tidak memengaruhi build.

## C. Sudah diperbaiki (riwayat)

- ~~Ops bisa mengonfirmasi pengembalian atas pengajuannya sendiri~~ — ditutup di
  `ReturnsSection.js` (tombol "Konfirmasi" disembunyikan + guard di `handleConfirm`) dan di
  DB lewat migrasi `0033_no_self_confirm_return.sql` (policy `returns_confirm` kini menolak
  `ca.requester_id = auth.uid()`, sama seperti aturan "tidak boleh menyetujui milik sendiri"
  pada persetujuan/pencairan di `0003_no_self_approve.sql`).
- ~~`supabase/migrations/` tidak lengkap (hilang 0030 & 0031)~~ — disamakan dengan
  `src/lib/supabase/migrations/`.
