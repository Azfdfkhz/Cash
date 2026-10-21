-- Reimbursement: requester memakai uang pribadi dulu, lalu mengajukan klaim
-- penggantian dengan kwitansi. Disimpan di tabel cash_advances yang sama
-- (kind = 'reimbursement') supaya persetujuan, tolak/revisi, pencairan,
-- riwayat, notifikasi & laporan bisa dipakai ulang.
--
-- Bedanya dengan Cash Advance:
--   - tidak ada RAB; tiap kwitansi punya kategori + catatan wajib
--   - kwitansi dilampirkan saat pengajuan; nominal = total kwitansi
--   - revisi kwitansi hanya saat ditolak (oleh requester)
--   - setelah Tim Operasional mentransfer penggantian (pencairan), langsung
--     selesai (closed)
-- Butuh 0022.

alter table public.cash_advances
  add column if not exists kind text not null default 'cash_advance';

alter table public.cash_advances
  drop constraint if exists cash_advances_kind_check;
alter table public.cash_advances
  add constraint cash_advances_kind_check check (kind in ('cash_advance', 'reimbursement'));

alter table public.receipts
  add column if not exists category text;

-- ============ Siapa boleh mengubah kwitansi ============
-- Cash Advance: seperti 0022 (approved, tanpa pengembalian menunggu).
-- Reimbursement: hanya requester pembuatnya, saat ditolak (revisi).
create or replace function public.can_modify_receipt(target_ca uuid, receipt_creator uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cash_advances ca
    where ca.id = target_ca
      and (
        (
          ca.kind = 'cash_advance'
          and ca.status = 'approved'
          and (
            receipt_creator = auth.uid()
            or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
          )
          and not exists (
            select 1 from public.cash_advance_returns cr
            where cr.cash_advance_id = target_ca and cr.confirmed_at is null
          )
        )
        or (
          ca.kind = 'reimbursement'
          and ca.status = 'rejected'
          and receipt_creator = auth.uid()
        )
      )
  );
$$;

drop policy if exists "receipts_insert" on public.receipts;
create policy "receipts_insert" on public.receipts
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.cash_advances ca
      where ca.id = receipts.cash_advance_id
        and ca.requester_id = auth.uid()
        and (
          (ca.kind = 'cash_advance' and ca.status = 'approved')
          or (ca.kind = 'reimbursement' and ca.status = 'rejected')
        )
    )
  );

-- ============ Nominal reimbursement = total kwitansi ============
create or replace function public.sync_reimbursement_amount()
returns trigger as $$
declare
  v_id uuid := coalesce(new.cash_advance_id, old.cash_advance_id);
  v_total numeric;
begin
  select coalesce(sum(amount), 0) into v_total
  from public.receipts where cash_advance_id = v_id;

  if v_total > 0 then
    update public.cash_advances
    set amount_requested = v_total
    where id = v_id
      and kind = 'reimbursement'
      and status in ('pending', 'rejected')
      and amount_requested is distinct from v_total;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_receipts_sync_reimbursement on public.receipts;
create trigger on_receipts_sync_reimbursement
  after insert or update or delete on public.receipts
  for each row execute procedure public.sync_reimbursement_amount();

revoke execute on function public.sync_reimbursement_amount() from public, anon, authenticated;

-- ============ RPC: buat reimbursement + kwitansi sekaligus ============
-- `target_id` dibuat di client supaya file bukti bisa diunggah ke folder
-- Drive pengajuan sebelum barisnya ada.
create or replace function public.create_reimbursement(target_id uuid, ca jsonb, receipts jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
begin
  if auth.uid() is null then
    raise exception 'Sesi Anda sudah berakhir. Silakan masuk ulang.';
  end if;

  if jsonb_typeof(receipts) is distinct from 'array' or jsonb_array_length(receipts) = 0 then
    raise exception 'Lampirkan minimal satu kwitansi.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(receipts) r
    where coalesce((r->>'amount')::numeric, 0) <= 0
      or length(trim(coalesce(r->>'category', ''))) = 0
      or length(trim(coalesce(r->>'notes', ''))) = 0
      or coalesce(r->>'drive_file_id', '') = ''
  ) then
    raise exception 'Setiap kwitansi wajib punya file bukti, nominal, kategori, dan catatan.';
  end if;

  select sum((r->>'amount')::numeric) into v_total
  from jsonb_array_elements(receipts) r;

  insert into public.cash_advances (
    id, kind, requester_id, purpose, funding_source, program_ref, objective,
    amount_requested, bank_name, bank_account_number, bank_account_holder
  ) values (
    target_id,
    'reimbursement',
    auth.uid(),
    ca->>'purpose',
    ca->>'funding_source',
    ca->>'program_ref',
    ca->>'objective',
    round(v_total, 2),
    ca->>'bank_name',
    ca->>'bank_account_number',
    nullif(trim(ca->>'bank_account_holder'), '')
  );

  insert into public.receipts (
    cash_advance_id, created_by, amount, vendor, receipt_date, notes,
    category, drive_file_id, drive_view_url, ocr_raw_text
  )
  select
    target_id,
    auth.uid(),
    (r->>'amount')::numeric,
    nullif(trim(r->>'vendor'), ''),
    nullif(r->>'receipt_date', '')::date,
    trim(r->>'notes'),
    trim(r->>'category'),
    r->>'drive_file_id',
    r->>'drive_view_url',
    nullif(r->>'ocr_raw_text', '')
  from jsonb_array_elements(receipts) r;

  return target_id;
end;
$$;

revoke execute on function public.create_reimbursement(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_reimbursement(uuid, jsonb, jsonb) to authenticated;

-- ============ Ajukan ulang: syaratnya tergantung jenis ============
create or replace function public.resubmit_cash_advance(target_id uuid, note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
begin
  select kind into v_kind from public.cash_advances
  where id = target_id and requester_id = auth.uid() and status = 'rejected';

  if v_kind is null then
    raise exception 'Hanya pengajuan Anda yang ditolak yang bisa diajukan ulang.';
  end if;

  if v_kind = 'cash_advance'
    and not exists (select 1 from public.rab_items where cash_advance_id = target_id) then
    raise exception 'RAB wajib diisi sebelum diajukan ulang.';
  end if;

  if v_kind = 'reimbursement'
    and not exists (select 1 from public.receipts where cash_advance_id = target_id) then
    raise exception 'Lampirkan minimal satu kwitansi sebelum diajukan ulang.';
  end if;

  update public.cash_advances
  set status = 'pending', reviewed_by = null, reviewed_at = null, review_note = null
  where id = target_id;

  insert into public.cash_advance_events (cash_advance_id, actor_id, action, note)
  values (target_id, auth.uid(), 'resubmitted', nullif(trim(note), ''));
end;
$$;

-- ============ Pencairan: reimbursement langsung selesai ============
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
      disbursement_note = nullif(trim(note), ''),
      -- Reimbursement: kwitansi sudah lengkap & nominal = total kwitansi,
      -- jadi setelah ditransfer tidak ada lagi yang perlu dibereskan.
      status = case when kind = 'reimbursement' then 'closed' else status end
  where id = target_id;

  insert into public.cash_advance_events (cash_advance_id, actor_id, action, note)
  values (target_id, auth.uid(), 'disbursed', nullif(trim(note), ''));
end;
$$;
