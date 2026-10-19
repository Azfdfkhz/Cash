-- RAB (Rencana Anggaran Biaya) per pengajuan Cash Advance, disimpan per
-- baris/field -- bukan cuma link spreadsheet (rab_url tetap dipertahankan
-- sebagai sumber import, kalau ada). Bentuk kolomnya mengikuti template
-- spreadsheet RAB: No, Uraian, Jumlah + satuan, Frekuensi, Harga Satuan,
-- Total. Realisasi & Sisa tidak disimpan di sini -- dihitung dari kwitansi
-- yang ditandai ke pos RAB tersebut (receipts.rab_item_id).

create table if not exists public.rab_items (
  id uuid primary key default uuid_generate_v4(),
  cash_advance_id uuid not null references public.cash_advances(id) on delete cascade,
  position integer not null default 0,
  description text not null check (length(trim(description)) > 0),
  quantity numeric(14, 2) not null default 1 check (quantity > 0),
  unit text,
  frequency numeric(14, 2) not null default 1 check (frequency > 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  total numeric(14, 2) generated always as (round(quantity * frequency * unit_price, 2)) stored,
  created_at timestamptz not null default now()
);

alter table public.rab_items enable row level security;

create policy "rab_items_select" on public.rab_items
  for select using (
    exists (
      select 1 from public.cash_advances ca
      where ca.id = rab_items.cash_advance_id
        and (
          ca.requester_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
        )
    )
  );

-- RAB hanya bisa diubah selama pengajuan masih pending (sebelum disetujui),
-- oleh pemilik pengajuan atau Tim Operasional.
create policy "rab_items_write" on public.rab_items
  for all using (
    exists (
      select 1 from public.cash_advances ca
      where ca.id = rab_items.cash_advance_id
        and ca.status = 'pending'
        and (
          ca.requester_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
        )
    )
  )
  with check (
    exists (
      select 1 from public.cash_advances ca
      where ca.id = rab_items.cash_advance_id
        and ca.status = 'pending'
        and (
          ca.requester_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
        )
    )
  );

create index if not exists idx_rab_items_cash_advance on public.rab_items(cash_advance_id, position);

-- ============ TRIGGER: nominal diajukan = total RAB ============
-- Selama pending, amount_requested selalu mengikuti total RAB. Kalau RAB
-- dikosongkan (total 0) nominal yang terakhir dibiarkan apa adanya, karena
-- amount_requested wajib > 0.
create or replace function public.sync_ca_amount_from_rab()
returns trigger as $$
declare
  v_id uuid := coalesce(new.cash_advance_id, old.cash_advance_id);
  v_total numeric;
begin
  select coalesce(sum(total), 0) into v_total
  from public.rab_items where cash_advance_id = v_id;

  if v_total > 0 then
    update public.cash_advances
    set amount_requested = v_total
    where id = v_id and status = 'pending' and amount_requested is distinct from v_total;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_rab_items_change on public.rab_items;
create trigger on_rab_items_change
  after insert or update or delete on public.rab_items
  for each row execute procedure public.sync_ca_amount_from_rab();

revoke execute on function public.sync_ca_amount_from_rab() from public, anon, authenticated;

-- ============ RECEIPTS: tandai kwitansi ke pos RAB ============
alter table public.receipts
  add column if not exists rab_item_id uuid references public.rab_items(id) on delete set null;

create index if not exists idx_receipts_rab_item on public.receipts(rab_item_id);
