-- Rekening tujuan transfer default milik user, diisi di halaman Profil supaya
-- form pengajuan Cash Advance bisa terisi otomatis dan tidak perlu diketik ulang.
alter table public.profiles
  add column if not exists bank_name text,
  add column if not exists bank_account_number text;
