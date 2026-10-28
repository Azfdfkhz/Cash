-- Reopen mengikuti cash-advance-app (0025_reopen_cash_advance.sql).
--
-- Perubahan dari 0036/0037:
--   * Tim Operasional MEMILIH pengembalian mana yang konfirmasinya dibatalkan
--     (unconfirm_return_ids). Pengembalian lain tetap terkonfirmasi, tidak lagi
--     dibatalkan semuanya.
--   * total_returned dihitung ulang dari pengembalian yang masih terkonfirmasi
--     (bukan di-nol-kan).
--   * Kalau saldo masih lunas setelah pembatalan, reopen ditolak: pengajuan
--     tidak akan bisa selesai lagi lewat konfirmasi.
--   * Hanya kind = 'cash_advance'; reimbursement tidak bisa dibuka kembali.
--   * Parameter RPC: (target_id, note, unconfirm_return_ids), sama seperti
--     cash-advance-app.
-- Tetap dipertahankan khas Cash: reopened_at/by/note (banner), alasan minimal
-- 3 karakter, dan penyembunyian kwitansi dari Laporan (0037).

-- Versi lama (target_id, reason) dibuang supaya tidak ada dua overload.
drop function if exists public.reopen_cash_advance(uuid, text);
drop function if exists public.reopen_cash_advance(uuid, text, uuid[]);

create or replace function public.reopen_cash_advance(
  target_id uuid,
  note text,
  unconfirm_return_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ca public.cash_advances%rowtype;
  v_balance numeric;
  v_total_returned numeric;
  v_note text := left(trim(coalesce(note, '')), 1000);
begin
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational'
  ) then
    raise exception 'Hanya Tim Operasional yang bisa membuka kembali pengajuan.';
  end if;

  select * into v_ca from public.cash_advances where id = target_id for update;
  if not found then
    raise exception 'Pengajuan tidak ditemukan.';
  end if;

  -- Sama seperti persetujuan & pencairan: bukan untuk pengajuan sendiri.
  if v_ca.status <> 'closed'
     or v_ca.kind <> 'cash_advance'
     or v_ca.requester_id = auth.uid() then
    raise exception 'Pengajuan tidak bisa dibuka kembali (belum selesai, reimbursement, atau milik Anda sendiri).';
  end if;

  if length(v_note) < 3 then
    raise exception 'Tulis alasan tinjau ulang supaya pemohon tahu apa yang harus diperbaiki.';
  end if;

  v_balance := v_ca.amount_requested - v_ca.total_spent;

  update public.cash_advance_returns
  set confirmed_at = null, confirmed_by = null
  where cash_advance_id = target_id
    and confirmed_at is not null
    and id = any(coalesce(unconfirm_return_ids, '{}'));

  -- Trigger on_return_confirmed hanya jalan saat confirmed_at terisi, jadi
  -- total_returned dihitung ulang di sini.
  select coalesce(sum(amount), 0) into v_total_returned
  from public.cash_advance_returns
  where cash_advance_id = target_id and confirmed_at is not null;

  -- Kalau masih lunas, pengajuan tidak akan pernah selesai lagi lewat
  -- konfirmasi: minimal satu pengembalian harus dibatalkan.
  if v_balance > 0 and v_total_returned >= v_balance then
    raise exception 'Pilih pengembalian yang dananya belum masuk untuk dibatalkan konfirmasinya.';
  end if;

  update public.cash_advances
  set status = 'approved',
      closed_at = null,
      total_returned = v_total_returned,
      report_drive_file_id = null,
      report_drive_url = null,
      reopened_at = now(),
      reopened_by = auth.uid(),
      reopen_note = v_note
  where id = target_id;

  insert into public.cash_advance_events (cash_advance_id, actor_id, action, note)
  values (target_id, auth.uid(), 'reopened', v_note);
end;
$$;

revoke execute on function public.reopen_cash_advance(uuid, text, uuid[]) from public, anon;
grant execute on function public.reopen_cash_advance(uuid, text, uuid[]) to authenticated;
