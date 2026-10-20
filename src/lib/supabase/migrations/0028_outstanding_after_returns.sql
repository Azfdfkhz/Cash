-- Perbaikan "Sisa saldo aktif" (Beranda): sebelumnya hanya amount_requested -
-- total_spent, jadi pengembalian sisa saldo yang sudah dikonfirmasi tidak
-- mengurangi angkanya (mis. 500.000 dikembalikan 200.000 tetap tampil 500.000).
-- Sekarang total_returned (hanya yang sudah dikonfirmasi tim operasional)
-- ikut dikurangkan, sama seperti saldo bersih di pop up detail.
-- Bentuk kolom keluaran tidak berubah, jadi kode aplikasi tidak perlu diubah.
create or replace function public.cash_advance_dashboard_stats()
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
  select
    count(*) filter (where status = 'pending'),
    coalesce(sum(amount_requested - total_spent - total_returned)
      filter (where status = 'approved' and kind = 'cash_advance'), 0),
    count(*) filter (where status = 'approved' and kind = 'cash_advance'),
    coalesce(sum(total_returned) filter (where kind = 'cash_advance'), 0),
    count(*) filter (
      where status = 'approved' and kind = 'cash_advance' and total_spent = 0
    )
  from public.cash_advances;
$$;

grant execute on function public.cash_advance_dashboard_stats() to authenticated;
