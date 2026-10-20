-- (Dinomori ulang 0015 -> 0025 saat penggabungan dengan versi fitur; butuh
-- kolom `kind` dari migrasi 0023.)
-- Statistik dashboard diperluas untuk desain baru (kartu ringkasan Beranda):
--   active_count      -> jumlah CA berstatus approved (sedang berjalan)
--   total_returned    -> total pengembalian sisa saldo (seluruh CA yang terlihat)
--   needs_spj_count   -> CA approved yang belum punya kuitansi sama sekali
--                        (total_spent = 0), alias "Perlu SPJ / Laporan"
-- Kolom lama (pending_count, total_outstanding) tidak berubah, jadi kode lama
-- tetap jalan. security invoker: RLS tetap berlaku (requester hanya melihat
-- miliknya, Tim Operasional melihat semuanya).
drop function if exists public.cash_advance_dashboard_stats();
create function public.cash_advance_dashboard_stats()
returns table (
  pending_count bigint,
  total_outstanding numeric,
  active_count bigint,
  total_returned numeric,
  needs_spj_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  -- pending_count mencakup semua jenis (antrean persetujuan). Angka saldo &
  -- CA berjalan hanya untuk Cash Advance: Reimbursement tidak punya saldo
  -- berjalan (selesai begitu ditransfer).
  select
    count(*) filter (where status = 'pending'),
    coalesce(sum(amount_requested - total_spent)
      filter (where status = 'approved' and kind = 'cash_advance'), 0),
    count(*) filter (where status = 'approved' and kind = 'cash_advance'),
    coalesce(sum(total_returned) filter (where kind = 'cash_advance'), 0),
    count(*) filter (
      where status = 'approved' and kind = 'cash_advance' and total_spent = 0
    )
  from public.cash_advances;
$$;

grant execute on function public.cash_advance_dashboard_stats() to authenticated;
