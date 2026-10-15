-- Statistik dashboard dihitung lintas SELURUH pengajuan yang boleh dilihat user
-- (bukan hanya sebagian yang tampil di layar), supaya angkanya tetap benar
-- setelah daftar pengajuan dipaginasi.
--
-- security invoker: RLS `cash_advances` tetap berlaku, jadi:
--  - Tim Operasional  -> hitungan mencakup semua pengajuan
--  - Requester         -> hitungan hanya pengajuan miliknya sendiri
create or replace function public.cash_advance_dashboard_stats()
returns table (pending_count bigint, total_outstanding numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*) filter (where ca.status = 'pending'),
    coalesce(sum(b.balance) filter (where ca.status = 'approved'), 0)
  from public.cash_advances ca
  left join public.cash_advance_balances b on b.cash_advance_id = ca.id;
$$;
