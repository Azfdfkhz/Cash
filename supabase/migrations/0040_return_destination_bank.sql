-- v1.2.9 -- Kolom rekening tujuan pada pengembalian sisa saldo.
--
-- Requester wajib memilih rekening perusahaan tujuan transfer saat
-- mengisi formulir "Kembalikan Sisa". Kolom ini mencatat bank dan
-- nomor rekening tujuan agar Tim Operasional bisa memverifikasi
-- mutasi masuk ke rekening yang benar.
--
-- Aman dijalankan ulang (idempoten). Jalankan SETELAH migrasi 0039.

alter table public.cash_advance_returns
  add column if not exists dest_bank          text,
  add column if not exists dest_account_number text;

-- Kolom bersifat opsional (nullable) agar baris lama yang sudah ada
-- sebelum migrasi ini tetap valid tanpa perlu backfill.
-- Kode aplikasi sudah menangani database lama (kolom belum ada) dengan
-- fallback ke catatan teks (kode error 42703 / PGRST204).
