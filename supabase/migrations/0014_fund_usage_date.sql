-- Tanggal rencana dana mulai digunakan, diisi saat pengajuan Cash Advance.
alter table public.cash_advances
  add column if not exists fund_usage_date date;
