-- Rekening perusahaan yang dipilih requester saat mengembalikan sisa saldo,
-- supaya Tim Operasional tahu rekening mana yang harus dicek mutasinya.
alter table public.cash_advance_returns
  add column if not exists dest_bank text,
  add column if not exists dest_account_number text;
