# Panduan: menimpa cash-advance-app dengan Cash-main

Database cash-advance-app saat ini berhenti di migrasi **0025_reopen_cash_advance**
(versi lama). File itu sengaja tidak ada di folder ini: fungsinya sudah digantikan
oleh 0036-0038.

## 1. Sebelum apa pun
- Backup database Supabase (Database > Backups, atau `pg_dump`).
- Kalau database yang sama dipakai versi produksi (`main`), baca catatan 0035 di bawah.

## 2. Menyalin kode (jangan overlay)
```bash
cd cash-advance-app
git checkout main && git pull origin main
git checkout -b devUI
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r /path/ke/Cash-main/. .
git status    # file lama (icon.png, apple-icon.png, 0025_reopen...) harus tampil "deleted"
```

## 3. Menjalankan migrasi (SQL Editor Supabase)
JANGAN pakai `supabase db push` (nomor 0025 bentrok dengan riwayat lama).
Jalankan satu per satu, berurutan, cek hasil tiap file sebelum lanjut:

| Urutan | File |
|---|---|
| 1 | 0025_dashboard_stats_extended.sql |
| 2 | 0026_profile_onboarding.sql |
| 3 | 0027_return_date.sql |
| 4 | 0028_outstanding_after_returns.sql |
| 5 | 0029_report_receipts_page.sql |
| 6 | 0030_security_hardening.sql |
| 7 | 0031_signup_domain_policy.sql (boleh dilewati, tapi lewati bersama 0039) |
| 8 | 0032_realtime_and_username_format.sql |
| 9 | 0033_no_self_confirm_return.sql |
| 10 | 0034_username_allow_uppercase.sql |
| 11 | 0035_disbursement_proof_dedup.sql |
| 12 | 0036_reopen_closed_cash_advance.sql |
| 13 | 0037_reopen_notify_and_reports.sql |
| 14 | 0038_reopen_selective_unconfirm.sql |
| 15 | 0039_remove_signup_domain_policy.sql |

Migrasi dulu, baru deploy kode devUI.

## 4. Catatan
- **0035**: fungsi `mark_cash_advance_disbursed` sekarang wajib menerima `proof_sha256`.
  Kode lama tidak mengirimnya, jadi "Cairkan dana" di versi lama akan error setelah
  migrasi ini. Kalau produksi memakai database yang sama, tunda 0035 sampai devUI
  di-merge ke main, atau pakai project Supabase terpisah untuk uji.
- **0030**: batas 20 pengajuan pending dan 40 per 24 jam per user; role anon tidak
  bisa membaca tabel.
- **Env baru**: `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`; Google Drive OAuth opsional
  (kalau kosong, memakai service account lama).
- **next.config.mjs** kini memasang CSP ketat: uji upload Drive, scan kwitansi, dan
  pratinjau file di preview sebelum merge.
- Sebelum merge: `npm ci && npm run build`.
