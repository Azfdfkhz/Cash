-- 1) Volume (jumlah) per kwitansi: wajib, default 1. Boleh melebihi volume
--    RAB pos tsb (jumlah x frekuensi) karena realisasi bisa bertambah --
--    kelebihannya cuma ditandai di aplikasi, tidak diblokir.
-- 2) Pencairan dana: Tim Operasional mengunggah bukti transfer ke rekening
--    requester setelah pengajuan disetujui; dicatat di riwayat.

-- ============ VOLUME KWITANSI ============
alter table public.receipts
  add column if not exists quantity numeric(14, 2) not null default 1;

alter table public.receipts
  drop constraint if exists receipts_quantity_positive;
alter table public.receipts
  add constraint receipts_quantity_positive check (quantity > 0);

-- ============ PENCAIRAN DANA ============
alter table public.cash_advances
  add column if not exists disbursed_at timestamptz,
  add column if not exists disbursed_by uuid references public.profiles(id),
  add column if not exists disbursement_proof_drive_file_id text,
  add column if not exists disbursement_proof_url text,
  add column if not exists disbursement_note text;

alter table public.cash_advance_events
  drop constraint if exists cash_advance_events_action_check;
alter table public.cash_advance_events
  add constraint cash_advance_events_action_check
  check (action in ('approved', 'rejected', 'resubmitted', 'disbursed'));

-- Sama seperti persetujuan: Tim Operasional tidak boleh mencairkan
-- pengajuan miliknya sendiri.
create or replace function public.mark_cash_advance_disbursed(
  target_id uuid,
  file_id text,
  view_url text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'operational'
  ) then
    raise exception 'Hanya Tim Operasional yang bisa mencairkan dana.';
  end if;

  if not exists (
    select 1 from public.cash_advances
    where id = target_id
      and status = 'approved'
      and disbursed_at is null
      and requester_id <> auth.uid()
  ) then
    raise exception 'Pengajuan tidak bisa dicairkan (belum disetujui, sudah dicairkan, atau milik Anda sendiri).';
  end if;

  if file_id is null or view_url is null then
    raise exception 'Bukti transfer pencairan wajib diunggah.';
  end if;

  update public.cash_advances
  set disbursed_at = now(),
      disbursed_by = auth.uid(),
      disbursement_proof_drive_file_id = file_id,
      disbursement_proof_url = view_url,
      disbursement_note = nullif(trim(note), '')
  where id = target_id;

  insert into public.cash_advance_events (cash_advance_id, actor_id, action, note)
  values (target_id, auth.uid(), 'disbursed', nullif(trim(note), ''));
end;
$$;

revoke execute on function public.mark_cash_advance_disbursed(uuid, text, text, text) from public, anon;
grant execute on function public.mark_cash_advance_disbursed(uuid, text, text, text) to authenticated;

create index if not exists idx_cash_advances_awaiting_disbursement
  on public.cash_advances(created_at)
  where status = 'approved' and disbursed_at is null;

-- ============ EDIT / HAPUS KWITANSI ============
-- Kwitansi boleh diedit atau dihapus oleh pembuatnya (requester) atau Tim
-- Operasional selama pengajuan masih 'approved' DAN tidak ada pengembalian
-- yang menunggu konfirmasi (nominal pengembalian dihitung dari saldo saat
-- diajukan; kalau kwitansi berubah, pengembalian itu harus dibatalkan dulu).
-- Setelah 'closed' kwitansi terkunci sepenuhnya, termasuk hapus (sebelumnya
-- policy hapus tidak mengecek status sama sekali).
create or replace function public.can_modify_receipt(target_ca uuid, receipt_creator uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      receipt_creator = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
    )
    and exists (
      select 1 from public.cash_advances ca
      where ca.id = target_ca and ca.status = 'approved'
    )
    and not exists (
      select 1 from public.cash_advance_returns cr
      where cr.cash_advance_id = target_ca and cr.confirmed_at is null
    );
$$;

revoke execute on function public.can_modify_receipt(uuid, uuid) from public, anon;
grant execute on function public.can_modify_receipt(uuid, uuid) to authenticated;

drop policy if exists "receipts_delete" on public.receipts;
create policy "receipts_delete" on public.receipts
  for delete using (public.can_modify_receipt(cash_advance_id, created_by));

drop policy if exists "receipts_update" on public.receipts;
create policy "receipts_update" on public.receipts
  for update using (public.can_modify_receipt(cash_advance_id, created_by))
  with check (public.can_modify_receipt(cash_advance_id, created_by));

-- Kolom identitas & file bukti tidak boleh diubah lewat edit (foto salah ->
-- hapus lalu scan ulang).
create or replace function public.guard_receipt_update()
returns trigger as $$
begin
  if new.cash_advance_id is distinct from old.cash_advance_id
    or new.created_by is distinct from old.created_by
    or new.drive_file_id is distinct from old.drive_file_id
    or new.drive_view_url is distinct from old.drive_view_url
    or new.ocr_raw_text is distinct from old.ocr_raw_text
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Kolom ini tidak bisa diubah. Hapus kwitansi lalu scan ulang.';
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists on_receipt_update_guard on public.receipts;
create trigger on_receipt_update_guard
  before update on public.receipts
  for each row execute procedure public.guard_receipt_update();

revoke execute on function public.guard_receipt_update() from public, anon, authenticated;

-- Penandaan pos RAB lewat RPC (0019) ikut aturan yang sama: terkunci setelah
-- closed (sebelumnya Tim Operasional masih bisa saat closed).
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
    select 1 from public.receipts r
    where r.id = target_id
      and public.can_modify_receipt(r.cash_advance_id, r.created_by)
  ) then
    raise exception 'Kwitansi tidak bisa diubah (pengajuan sudah selesai atau ada pengembalian yang menunggu konfirmasi).';
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

-- ============ ATAS NAMA REKENING (terpisah dari nama bank) ============
-- Sebelumnya "atas nama" diketik menyatu di bank_name. Data lama dibiarkan
-- apa adanya (bank_account_holder null) karena tidak bisa dipisah dengan
-- andal; aplikasi menampilkan bank_name lama apa adanya.
alter table public.profiles
  add column if not exists bank_account_holder text;

alter table public.cash_advances
  add column if not exists bank_account_holder text;

-- create_cash_advance (0017) ikut menyimpan atas nama rekening.
create or replace function public.create_cash_advance(ca jsonb, rab jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_total numeric;
begin
  if auth.uid() is null then
    raise exception 'Sesi Anda sudah berakhir. Silakan masuk ulang.';
  end if;

  if jsonb_typeof(rab) is distinct from 'array' or jsonb_array_length(rab) = 0 then
    raise exception 'RAB wajib diisi minimal satu baris.';
  end if;

  select coalesce(sum(
    coalesce((r->>'quantity')::numeric, 1)
    * coalesce((r->>'frequency')::numeric, 1)
    * coalesce((r->>'unit_price')::numeric, 0)
  ), 0) into v_total
  from jsonb_array_elements(rab) r;

  if v_total <= 0 then
    raise exception 'Total RAB harus lebih dari 0.';
  end if;

  insert into public.cash_advances (
    requester_id, purpose, fund_usage_date, funding_source, program_ref,
    objective, rab_url, amount_requested, bank_name, bank_account_number,
    bank_account_holder
  ) values (
    auth.uid(),
    ca->>'purpose',
    (ca->>'fund_usage_date')::date,
    ca->>'funding_source',
    ca->>'program_ref',
    ca->>'objective',
    ca->>'rab_url',
    round(v_total, 2),
    ca->>'bank_name',
    ca->>'bank_account_number',
    nullif(trim(ca->>'bank_account_holder'), '')
  )
  returning id into v_id;

  insert into public.rab_items (
    cash_advance_id, position, description, quantity, unit, frequency, unit_price
  )
  select
    v_id,
    (r.ord - 1)::int,
    r.item->>'description',
    coalesce((r.item->>'quantity')::numeric, 1),
    nullif(trim(r.item->>'unit'), ''),
    coalesce((r.item->>'frequency')::numeric, 1),
    coalesce((r.item->>'unit_price')::numeric, 0)
  from jsonb_array_elements(rab) with ordinality as r(item, ord);

  return v_id;
end;
$$;
