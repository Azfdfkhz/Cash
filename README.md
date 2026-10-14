# Cash Advance App

Aplikasi pencatatan Cash Advance: pengajuan ke Tim Operasional, upload &
scan kwitansi (OCR otomatis), foto tersimpan ke folder shared Google Drive,
dan pemantauan sisa saldo — mobile-friendly, dibangun dengan Next.js +
Supabase, siap deploy ke Vercel.

## Fitur

- **Auth & role**: Requester (mengajukan CA & upload kwitansi) dan Tim
  Operasional (menyetujui/menolak, melihat laporan semua data).
- **Pengajuan Cash Advance**: requester mengajukan nominal & keperluan,
  status `pending` → `approved`/`rejected` oleh tim operasional.
- **Scan kwitansi otomatis**: ambil foto lewat kamera HP, teks kwitansi
  dibaca otomatis (Google Cloud Vision OCR) untuk mengisi nominal, vendor,
  dan tanggal — user tinggal konfirmasi sebelum simpan.
- **Foto ke shared Drive**: setiap foto kwitansi diunggah ke folder Google
  Drive yang sudah di-share ke tim, linknya disimpan di database.
- **Sisa saldo real-time**: total diajukan dikurangi total kwitansi
  terealisasi, per pengajuan maupun total keseluruhan.
- **Laporan/spreadsheet**: tabel semua kwitansi (filter pencarian + export
  CSV) untuk Tim Operasional.

## Tech stack

- Next.js 16 (App Router, JavaScript)
- Tailwind CSS v4 (mobile-first)
- Supabase (Postgres + Auth + Row Level Security)
- Google Drive API + Google Cloud Vision API (`googleapis`)
- Deploy: Vercel

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan isi file
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   Ini akan membuat tabel `profiles`, `cash_advances`, `receipts`, view saldo,
   dan seluruh RLS policy.
3. Ambil **Project URL** dan **anon public key** dari
   *Project Settings → API*, isi ke `.env.local`.
4. Setiap user yang mendaftar otomatis masuk sebagai role `requester`. Untuk
   menjadikan seseorang **Tim Operasional**, jalankan di SQL Editor:
   ```sql
   update public.profiles set role = 'operational' where email = 'ops@perusahaan.com';
   ```

## 2. Setup Google Drive & Vision (shared drive + OCR)

1. Buat project di [Google Cloud Console](https://console.cloud.google.com),
   aktifkan **Google Drive API** dan **Cloud Vision API**.
2. Buat **Service Account**, generate key JSON.
3. Buat folder di Google Drive yang akan jadi "shared drive" kwitansi, lalu
   **share folder tersebut ke email service account** (role: Editor).
4. Salin `client_email` dan `private_key` dari file JSON ke `.env.local`
   (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`), dan ID folder
   (bagian akhir URL folder Drive) ke `GOOGLE_DRIVE_FOLDER_ID`.

## 3. Setup Notifikasi Telegram (opsional)

Requester dapat notifikasi Telegram otomatis saat pengajuannya disetujui.

1. Chat **@BotFather** di Telegram, kirim `/newbot`, ikuti instruksinya untuk
   membuat bot baru. Salin **token** yang diberikan ke `.env.local`
   (`TELEGRAM_BOT_TOKEN`).
2. Setiap requester yang mau dapat notifikasi harus: (a) chat bot tersebut
   dan tekan **/start** minimal sekali (wajib, bot tidak bisa kirim pesan ke
   user yang belum pernah start), dan (b) isi **Telegram Chat ID** mereka di
   halaman **Profil** di app ini (ikon gerigi di header). Chat ID bisa
   didapat dengan chat ke **@userinfobot**.

Kalau tidak diisi, fitur ini otomatis dilewati (approval tetap jalan normal
tanpa notifikasi).

## 4. Environment variables

Salin `.env.local.example` ke `.env.local` dan isi semua nilainya:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_DRIVE_FOLDER_ID=
TELEGRAM_BOT_TOKEN=
```

## 5. Jalankan lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Daftar akun baru →
jadikan operational lewat SQL (langkah 1.4) untuk mencoba alur persetujuan.

## 6. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import project di [vercel.com](https://vercel.com/new).
3. Tambahkan environment variables yang sama seperti `.env.local` di
   *Project Settings → Environment Variables*.
4. Deploy. Update juga *Site URL* & *Redirect URLs* di Supabase Auth
   settings dengan domain Vercel Anda.

## Struktur data

- `profiles` — data user & role (`requester` / `operational`), termasuk
  `telegram_chat_id` untuk notifikasi.
- `cash_advances` — pengajuan Cash Advance (`pending`, `approved`,
  `rejected`, `closed`), termasuk rekening tujuan transfer (`bank_name`,
  `bank_account_number`).
- `receipts` — kwitansi realisasi per Cash Advance (nominal, vendor,
  tanggal, link foto Drive, teks OCR mentah).
- `cash_advance_returns` — pengembalian sisa saldo ke perusahaan kalau
  kwitansi < nominal diajukan (nominal, bukti transfer, konfirmasi Tim
  Operasional).
- `cash_advance_reimbursements` — penggantian ke requester kalau kwitansi
  > nominal diajukan (requester talangi pakai uang pribadi, perusahaan
  ganti selisihnya).
- `cash_advance_balances` — view: saldo sisa = nominal diajukan − total
  kwitansi, plus total yang sudah dikembalikan/diganti.
