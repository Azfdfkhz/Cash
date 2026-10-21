-- Satu struk bisa berisi banyak item untuk pos RAB / kategori berbeda.
-- Kwitansi (receipts) tetap satu baris per file bukti dengan nominal total;
-- pembagiannya disimpan di receipt_lines (min. 1 baris per kwitansi).
-- Total baris rincian WAJIB sama dengan nominal kwitansi.
--
-- Mulai migration ini, alokasi (pos RAB / di luar RAB / kategori / volume)
-- dibaca dari receipt_lines. Kolom lama di receipts (rab_item_id,
-- outside_rab, category, quantity) tidak dipakai lagi oleh aplikasi; nilainya
-- dipindah ke receipt_lines di bawah dan dibiarkan apa adanya.
-- Butuh 0022 & 0023.

create table if not exists public.receipt_lines (
  id uuid primary key default uuid_generate_v4(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  position integer not null default 0,
  rab_item_id uuid references public.rab_items(id) on delete set null,
  outside_rab boolean not null default false,
  category text,
  amount numeric(14, 2) not null check (amount >= 0),
  quantity numeric(14, 2) not null default 1 check (quantity > 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint receipt_lines_outside_valid check (
    not outside_rab
    or (rab_item_id is null and length(trim(coalesce(notes, ''))) > 0)
  )
);

create index if not exists idx_receipt_lines_receipt on public.receipt_lines(receipt_id, position);
create index if not exists idx_receipt_lines_rab_item on public.receipt_lines(rab_item_id);

alter table public.receipt_lines enable row level security;

-- Hanya bisa dibaca (mengikuti akses kwitansinya); ditulis lewat RPC
-- save_receipt / create_reimbursement.
create policy "receipt_lines_select" on public.receipt_lines
  for select using (
    exists (
      select 1
      from public.receipts r
      join public.cash_advances ca on ca.id = r.cash_advance_id
      where r.id = receipt_lines.receipt_id
        and (
          ca.requester_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
        )
    )
  );

-- ============ Pindahkan alokasi kwitansi lama: 1 baris per kwitansi ============
insert into public.receipt_lines (
  receipt_id, position, rab_item_id, outside_rab, category, amount, quantity, notes
)
select
  r.id,
  0,
  r.rab_item_id,
  r.outside_rab,
  r.category,
  r.amount,
  r.quantity,
  case when r.outside_rab or r.category is not null then r.notes end
from public.receipts r
where not exists (select 1 from public.receipt_lines l where l.receipt_id = r.id);

-- ============ Total rincian = nominal kwitansi ============
-- Dicek di akhir transaksi (deferred) supaya kwitansi & rinciannya bisa
-- ditulis berurutan dalam satu transaksi (RPC).
create or replace function public.check_receipt_lines_total()
returns trigger as $$
declare
  v_receipt uuid;
  v_amount numeric;
  v_lines numeric;
  v_count int;
begin
  -- IF terpisah (bukan CASE): kolom new/old hanya dibaca untuk tabel &
  -- operasi yang sesuai.
  if tg_table_name = 'receipts' then
    v_receipt := new.id;
  elsif tg_op = 'DELETE' then
    v_receipt := old.receipt_id;
  else
    v_receipt := new.receipt_id;
  end if;

  select amount into v_amount from public.receipts where id = v_receipt;
  if not found then
    return null; -- kwitansi sudah dihapus (rincian ikut terhapus)
  end if;

  select coalesce(sum(amount), 0), count(*) into v_lines, v_count
  from public.receipt_lines where receipt_id = v_receipt;

  if v_count = 0 then
    raise exception 'Kwitansi wajib punya minimal satu rincian pos/kategori.';
  end if;
  if v_lines <> v_amount then
    raise exception 'Jumlah rincian (%) harus sama dengan nominal kwitansi (%).',
      trim_scale(v_lines), trim_scale(v_amount);
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_receipt_lines_total on public.receipt_lines;
create constraint trigger on_receipt_lines_total
  after insert or update or delete on public.receipt_lines
  deferrable initially deferred
  for each row execute procedure public.check_receipt_lines_total();

drop trigger if exists on_receipt_amount_lines_total on public.receipts;
create constraint trigger on_receipt_amount_lines_total
  after insert or update of amount on public.receipts
  deferrable initially deferred
  for each row execute procedure public.check_receipt_lines_total();

revoke execute on function public.check_receipt_lines_total() from public, anon, authenticated;

-- ============ Validasi rincian (dipakai kedua RPC) ============
create or replace function public.validate_receipt_lines(
  p_ca_id uuid,
  p_kind text,
  p_lines jsonb,
  p_total numeric
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_line jsonb;
  v_sum numeric := 0;
  v_has_rab boolean;
begin
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Isi minimal satu rincian pos/kategori.';
  end if;

  select exists (select 1 from public.rab_items where cash_advance_id = p_ca_id)
  into v_has_rab;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    if coalesce((v_line->>'amount')::numeric, 0) <= 0 then
      raise exception 'Nominal setiap rincian harus lebih dari 0.';
    end if;
    if coalesce((v_line->>'quantity')::numeric, 1) <= 0 then
      raise exception 'Volume setiap rincian harus lebih dari 0.';
    end if;
    v_sum := v_sum + (v_line->>'amount')::numeric;

    if p_kind = 'reimbursement' then
      if length(trim(coalesce(v_line->>'category', ''))) = 0 then
        raise exception 'Pilih kategori untuk setiap rincian.';
      end if;
      if length(trim(coalesce(v_line->>'notes', ''))) = 0 then
        raise exception 'Isi catatan untuk setiap rincian.';
      end if;
    elsif coalesce((v_line->>'outside_rab')::boolean, false) then
      if length(trim(coalesce(v_line->>'notes', ''))) = 0 then
        raise exception 'Isi alasan untuk rincian di luar RAB.';
      end if;
    elsif nullif(v_line->>'rab_item_id', '') is not null then
      if not exists (
        select 1 from public.rab_items
        where id = (v_line->>'rab_item_id')::uuid and cash_advance_id = p_ca_id
      ) then
        raise exception 'Pos RAB tidak sesuai dengan pengajuan ini.';
      end if;
    elsif v_has_rab then
      raise exception 'Pilih pos RAB (atau Di luar RAB) untuk setiap rincian.';
    end if;
  end loop;

  if v_sum <> p_total then
    raise exception 'Jumlah rincian (%) harus sama dengan nominal kwitansi (%).',
      trim_scale(v_sum), trim_scale(p_total);
  end if;
end;
$$;

revoke execute on function public.validate_receipt_lines(uuid, text, jsonb, numeric) from public, anon, authenticated;

create or replace function public.insert_receipt_lines(p_receipt_id uuid, p_kind text, p_lines jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.receipt_lines (
    receipt_id, position, rab_item_id, outside_rab, category, amount, quantity, notes
  )
  select
    p_receipt_id,
    (l.ord - 1)::int,
    case
      when p_kind = 'reimbursement' or coalesce((l.item->>'outside_rab')::boolean, false) then null
      else nullif(l.item->>'rab_item_id', '')::uuid
    end,
    p_kind <> 'reimbursement' and coalesce((l.item->>'outside_rab')::boolean, false),
    case when p_kind = 'reimbursement' then trim(l.item->>'category') end,
    (l.item->>'amount')::numeric,
    coalesce((l.item->>'quantity')::numeric, 1),
    nullif(trim(l.item->>'notes'), '')
  from jsonb_array_elements(p_lines) with ordinality as l(item, ord);
$$;

revoke execute on function public.insert_receipt_lines(uuid, text, jsonb) from public, anon, authenticated;

-- ============ RPC: simpan kwitansi (baru / edit) + rinciannya ============
-- target_id null = kwitansi baru (file bukti sudah diunggah ke Drive).
create or replace function public.save_receipt(
  target_id uuid,
  ca_id uuid,
  receipt jsonb,
  lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_id uuid := target_id;
  v_amount numeric := coalesce((receipt->>'amount')::numeric, 0);
begin
  if auth.uid() is null then
    raise exception 'Sesi Anda sudah berakhir. Silakan masuk ulang.';
  end if;
  if v_amount <= 0 then
    raise exception 'Nominal kwitansi harus lebih dari 0.';
  end if;

  select kind into v_kind from public.cash_advances where id = ca_id;
  if v_kind is null then
    raise exception 'Pengajuan tidak ditemukan.';
  end if;

  if v_id is null then
    -- Sama dengan policy receipts_insert (0023).
    if not exists (
      select 1 from public.cash_advances ca
      where ca.id = ca_id
        and ca.requester_id = auth.uid()
        and (
          (ca.kind = 'cash_advance' and ca.status = 'approved')
          or (ca.kind = 'reimbursement' and ca.status = 'rejected')
        )
    ) then
      raise exception 'Kwitansi tidak bisa ditambahkan ke pengajuan ini.';
    end if;
    if coalesce(receipt->>'drive_file_id', '') = '' then
      raise exception 'File bukti kwitansi wajib diunggah.';
    end if;
  elsif not exists (
    select 1 from public.receipts r
    where r.id = v_id
      and r.cash_advance_id = ca_id
      and public.can_modify_receipt(r.cash_advance_id, r.created_by)
  ) then
    raise exception 'Kwitansi tidak bisa diubah (pengajuan sudah selesai, sedang ditinjau, atau ada pengembalian yang menunggu konfirmasi).';
  end if;

  perform public.validate_receipt_lines(ca_id, v_kind, lines, v_amount);

  if v_id is null then
    insert into public.receipts (
      cash_advance_id, created_by, amount, vendor, receipt_date, notes,
      drive_file_id, drive_view_url, ocr_raw_text
    ) values (
      ca_id,
      auth.uid(),
      v_amount,
      nullif(trim(receipt->>'vendor'), ''),
      nullif(receipt->>'receipt_date', '')::date,
      nullif(trim(receipt->>'notes'), ''),
      receipt->>'drive_file_id',
      receipt->>'drive_view_url',
      nullif(receipt->>'ocr_raw_text', '')
    )
    returning id into v_id;
  else
    update public.receipts
    set amount = v_amount,
        vendor = nullif(trim(receipt->>'vendor'), ''),
        receipt_date = nullif(receipt->>'receipt_date', '')::date,
        notes = nullif(trim(receipt->>'notes'), '')
    where id = v_id;
    delete from public.receipt_lines where receipt_id = v_id;
  end if;

  perform public.insert_receipt_lines(v_id, v_kind, lines);
  return v_id;
end;
$$;

revoke execute on function public.save_receipt(uuid, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_receipt(uuid, uuid, jsonb, jsonb) to authenticated;

-- ============ create_reimbursement (0023) versi rincian ============
-- Tiap kwitansi: { amount, vendor, receipt_date, notes, drive_file_id,
-- drive_view_url, ocr_raw_text, lines: [{ category, amount, notes }] }.
create or replace function public.create_reimbursement(target_id uuid, ca jsonb, receipts jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_receipt jsonb;
  v_receipt_id uuid;
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
      or coalesce(r->>'drive_file_id', '') = ''
  ) then
    raise exception 'Setiap kwitansi wajib punya file bukti dan nominal.';
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

  for v_receipt in select * from jsonb_array_elements(receipts) loop
    perform public.validate_receipt_lines(
      target_id, 'reimbursement', v_receipt->'lines', (v_receipt->>'amount')::numeric
    );

    insert into public.receipts (
      cash_advance_id, created_by, amount, vendor, receipt_date, notes,
      drive_file_id, drive_view_url, ocr_raw_text
    ) values (
      target_id,
      auth.uid(),
      (v_receipt->>'amount')::numeric,
      nullif(trim(v_receipt->>'vendor'), ''),
      nullif(v_receipt->>'receipt_date', '')::date,
      nullif(trim(v_receipt->>'notes'), ''),
      v_receipt->>'drive_file_id',
      v_receipt->>'drive_view_url',
      nullif(v_receipt->>'ocr_raw_text', '')
    )
    returning id into v_receipt_id;

    perform public.insert_receipt_lines(v_receipt_id, 'reimbursement', v_receipt->'lines');
  end loop;

  return target_id;
end;
$$;
