-- Cegah Tim Operasional mengonfirmasi pengembalian sisa saldo atas
-- pengajuannya sendiri (gap yang sama dengan 0003_no_self_approve.sql,
-- tapi untuk cash_advance_returns). Lihat PRODUCTION_CHECKLIST.md:
-- "Ops bisa mengonfirmasi pengembalian atas pengajuannya sendiri."
drop policy if exists "returns_confirm" on public.cash_advance_returns;

create policy "returns_confirm" on public.cash_advance_returns
  for update to authenticated
  using (
    exists (
      select 1
      from public.cash_advances ca
      join public.profiles p on p.id = auth.uid()
      where ca.id = cash_advance_returns.cash_advance_id
        and p.role = 'operational'
        and ca.requester_id <> auth.uid()
    )
  );
