-- Info rekening tujuan transfer Cash Advance, diisi requester saat mengajukan.
alter table public.cash_advances
  add column if not exists bank_name text,
  add column if not exists bank_account_number text;
