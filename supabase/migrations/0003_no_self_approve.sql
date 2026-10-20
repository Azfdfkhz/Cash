-- Cegah Tim Operasional menyetujui/menolak pengajuan Cash Advance miliknya sendiri.
-- Pengajuan sendiri tetap hanya bisa diedit selagi status 'pending' (hak yang sama
-- dengan requester biasa); persetujuan/penolakan harus dilakukan oleh admin lain.
drop policy if exists "cash_advances_update" on public.cash_advances;

create policy "cash_advances_update" on public.cash_advances
  for update using (
    (requester_id = auth.uid() and status = 'pending')
    or (
      requester_id <> auth.uid()
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
    )
  );
