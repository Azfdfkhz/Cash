-- Batalkan "Selesai" (tinjau ulang). Tim Operasional bisa membuka kembali
-- pengajuan yang sudah closed jika ternyata perlu dicek ulang.
--
-- Yang dilakukan:
--   * status closed -> approved
--   * laporan penutupan dibuang dari database (report_drive_*; file PDF di
--     Drive dihapus oleh API sebelum RPC ini dipanggil) dan closed_at dikosongkan
--   * pengembalian yang sudah dikonfirmasi dikembalikan ke "menunggu konfirmasi"
--     supaya bisa dikoreksi (dibatalkan/diunggah ulang) lalu dikonfirmasi lagi
--   * total_returned dihitung ulang
--   * dicatat di riwayat (cash_advance_events, action 'reopened')
-- Kwitansi, bukti transfer, dan RAB TIDAK dihapus; requester dan Ops
-- memperbaikinya, lalu pengajuan ditutup lagi seperti biasa.

alter table public.cash_advance_events
  drop constraint if exists cash_advance_events_action_check;
alter table public.cash_advance_events
  add constraint cash_advance_events_action_check
  check (action in ('approved', 'rejected', 'resubmitted', 'disbursed', 'reopened'));

create or replace function public.reopen_cash_advance(target_id uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ca public.cash_advances%rowtype;
begin
  select * into v_ca from public.cash_advances where id = target_id for update;

  if not found then
    raise exception 'Pengajuan tidak ditemukan.';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational'
  ) then
    raise exception 'Hanya Tim Operasional yang bisa membatalkan status selesai.';
  end if;

  if v_ca.requester_id = auth.uid() then
    raise exception 'Anda tidak bisa membuka kembali pengajuan Anda sendiri.';
  end if;

  if v_ca.status <> 'closed' then
    raise exception 'Hanya pengajuan yang sudah selesai yang bisa dibuka kembali.';
  end if;

  -- Pengembalian terkonfirmasi -> menunggu konfirmasi lagi. Trigger
  -- on_return_confirmed hanya jalan saat confirmed_at terisi, jadi tidak
  -- menutup ulang pengajuan di sini.
  update public.cash_advance_returns
  set confirmed_by = null, confirmed_at = null
  where cash_advance_id = target_id and confirmed_at is not null;

  update public.cash_advances
  set status = 'approved',
      closed_at = null,
      report_drive_file_id = null,
      report_drive_url = null,
      total_returned = 0
  where id = target_id;

  insert into public.cash_advance_events (cash_advance_id, actor_id, action, note)
  values (target_id, auth.uid(), 'reopened', nullif(left(trim(coalesce(reason, '')), 1000), ''));
end;
$$;

revoke execute on function public.reopen_cash_advance(uuid, text) from public, anon;
grant execute on function public.reopen_cash_advance(uuid, text) to authenticated;
