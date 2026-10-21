-- Pengeluaran tak terduga di luar RAB: kwitansi ditandai outside_rab (bukan
-- dibiarkan tanpa pos), dengan alasan wajib di kolom notes. Jadi "lupa
-- ditandai" (rab_item_id null, outside_rab false) bisa dibedakan dari
-- "memang di luar rencana".

alter table public.receipts
  add column if not exists outside_rab boolean not null default false;

alter table public.receipts
  drop constraint if exists receipts_outside_rab_valid;

alter table public.receipts
  add constraint receipts_outside_rab_valid
  check (
    not outside_rab
    or (rab_item_id is null and length(trim(coalesce(notes, ''))) > 0)
  );

-- ============ RPC: tandai kwitansi ke pos RAB / di luar RAB ============
-- Signature berubah (tambah outside & reason), jadi versi lama di-drop dulu
-- supaya tidak jadi overload ganda.
drop function if exists public.set_receipt_rab_item(uuid, uuid);

create or replace function public.set_receipt_rab_item(
  target_id uuid,
  rab_item uuid default null,
  outside boolean default false,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.receipts r
    join public.cash_advances ca on ca.id = r.cash_advance_id
    where r.id = target_id
      and (
        (ca.requester_id = auth.uid() and ca.status = 'approved')
        or (
          ca.status in ('approved', 'closed')
          and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
        )
      )
  ) then
    raise exception 'Anda tidak bisa mengubah pos RAB kwitansi ini.';
  end if;

  if outside then
    if length(trim(coalesce(reason, ''))) = 0 then
      raise exception 'Alasan pengeluaran di luar RAB wajib diisi.';
    end if;
    update public.receipts
    set rab_item_id = null, outside_rab = true, notes = trim(reason)
    where id = target_id;
  else
    update public.receipts
    set rab_item_id = rab_item, outside_rab = false
    where id = target_id;
  end if;
end;
$$;

revoke execute on function public.set_receipt_rab_item(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.set_receipt_rab_item(uuid, uuid, boolean, text) to authenticated;
