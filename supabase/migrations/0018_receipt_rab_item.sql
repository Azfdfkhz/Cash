-- Perbandingan bukti (kwitansi) vs RAB: setiap kwitansi ditandai ke satu pos
-- RAB, supaya realisasi & sisa per pos bisa dihitung.

-- ============ Validasi: pos RAB harus milik pengajuan yang sama ============
create or replace function public.check_receipt_rab_item()
returns trigger as $$
begin
  if new.rab_item_id is not null and not exists (
    select 1 from public.rab_items
    where id = new.rab_item_id and cash_advance_id = new.cash_advance_id
  ) then
    raise exception 'Pos RAB tidak sesuai dengan pengajuan kwitansi ini.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_receipt_rab_item_check on public.receipts;
create trigger on_receipt_rab_item_check
  before insert or update of rab_item_id on public.receipts
  for each row execute procedure public.check_receipt_rab_item();

revoke execute on function public.check_receipt_rab_item() from public, anon, authenticated;

-- ============ RPC: tandai / pindahkan kwitansi ke pos RAB ============
-- Receipts tidak punya policy UPDATE (nominal dll. tidak boleh diubah), jadi
-- penandaan pos lewat RPC yang cuma menyentuh kolom rab_item_id.
-- Requester: selama pengajuan approved. Tim Operasional: approved / closed.
create or replace function public.set_receipt_rab_item(target_id uuid, rab_item uuid)
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

  update public.receipts set rab_item_id = rab_item where id = target_id;
end;
$$;

revoke execute on function public.set_receipt_rab_item(uuid, uuid) from public, anon;
grant execute on function public.set_receipt_rab_item(uuid, uuid) to authenticated;
