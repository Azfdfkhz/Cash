-- Tanggal pengembalian sisa saldo (diisi requester di form "Kembalikan Sisa Saldo").
-- Data lama otomatis terisi tanggal hari migrasi; tampilan tetap memakai created_at bila kosong.
alter table public.cash_advance_returns
  add column if not exists return_date date default current_date;

update public.cash_advance_returns
  set return_date = created_at::date
  where return_date is not null;
