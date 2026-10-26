-- Info & dampak "Batalkan Selesai" (lanjutan 0036).
--  * Alasan wajib diisi supaya requester tahu apa yang harus diperbaiki.
--  * Disimpan di pengajuan (reopened_at/by, reopen_note) untuk ditampilkan
--    sebagai banner ke requester & Ops; dikosongkan saat pengajuan ditutup lagi.
--  * Kwitansi pengajuan yang sedang tinjau ulang tidak muncul di Laporan.

alter table public.cash_advances
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid references public.profiles(id),
  add column if not exists reopen_note text;

-- Saat ditutup lagi: tanda tinjau ulang dihapus.
create or replace function public.set_cash_advance_closed_at()
returns trigger as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at := now();
    new.reopened_at := null;
    new.reopened_by := null;
    new.reopen_note := null;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

create or replace function public.reopen_cash_advance(target_id uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ca public.cash_advances%rowtype;
  v_reason text := left(trim(coalesce(reason, '')), 1000);
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

  if length(v_reason) < 3 then
    raise exception 'Tulis alasan tinjau ulang supaya pemohon tahu apa yang harus diperbaiki.';
  end if;

  update public.cash_advance_returns
  set confirmed_by = null, confirmed_at = null
  where cash_advance_id = target_id and confirmed_at is not null;

  update public.cash_advances
  set status = 'approved',
      closed_at = null,
      report_drive_file_id = null,
      report_drive_url = null,
      total_returned = 0,
      reopened_at = now(),
      reopened_by = auth.uid(),
      reopen_note = v_reason
  where id = target_id;

  insert into public.cash_advance_events (cash_advance_id, actor_id, action, note)
  values (target_id, auth.uid(), 'reopened', v_reason);
end;
$$;

revoke execute on function public.reopen_cash_advance(uuid, text) from public, anon;
grant execute on function public.reopen_cash_advance(uuid, text) to authenticated;

-- Laporan kwitansi: sembunyikan pengajuan yang sedang tinjau ulang.
create or replace function public.report_receipts(
  p_query text default null,
  p_date date default null,
  p_kind text default null,
  p_limit integer default 6,
  p_offset integer default 0
)
returns table (
  id uuid,
  receipt_date date,
  requester_name text,
  purpose text,
  kind text,
  category text,
  vendor text,
  amount numeric,
  notes text,
  drive_view_url text,
  total_count bigint,
  total_amount numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select case
      when nullif(trim(p_query), '') is null then null
      else '%' || replace(replace(replace(lower(trim(p_query)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    end as pat
  ),
  base as (
    select
      r.id,
      r.receipt_date,
      p.full_name as requester_name,
      ca.purpose,
      ca.kind,
      coalesce(
        (
          select string_agg(
                   coalesce(l.category, case when l.outside_rab then 'Di luar RAB' else ri.description end),
                   ', ' order by l.position
                 )
          from public.receipt_lines l
          left join public.rab_items ri on ri.id = l.rab_item_id
          where l.receipt_id = r.id
        ),
        ''
      ) as category,
      r.vendor,
      r.amount,
      r.notes,
      r.drive_view_url,
      r.created_at
    from public.receipts r
    join public.cash_advances ca on ca.id = r.cash_advance_id
    left join public.profiles p on p.id = ca.requester_id
    where (p_kind is null or ca.kind = p_kind)
      -- Pengajuan yang dibatalkan "Selesai"-nya (tinjau ulang) keluar dari Laporan
      -- sampai ditutup lagi.
      and ca.reopened_at is null
      and (p_date is null or r.receipt_date = p_date)
  ),
  filtered as (
    select b.*
    from base b, q
    where q.pat is null
       or lower(coalesce(b.requester_name, '')) like q.pat escape '\'
       or lower(coalesce(b.vendor, '')) like q.pat escape '\'
       or lower(coalesce(b.purpose, '')) like q.pat escape '\'
       or lower(coalesce(b.category, '')) like q.pat escape '\'
       or lower(case b.kind when 'reimbursement' then 'reimbursement' else 'cash advance' end) like q.pat escape '\'
  )
  select
    f.id,
    f.receipt_date,
    f.requester_name,
    f.purpose,
    f.kind,
    f.category,
    f.vendor,
    f.amount,
    f.notes,
    f.drive_view_url,
    count(*) over () as total_count,
    coalesce(sum(f.amount) over (), 0) as total_amount
  from filtered f
  order by f.created_at desc, f.id
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.report_receipts(text, date, text, integer, integer) to authenticated;


grant execute on function public.report_receipts(text, date, text, integer, integer) to authenticated;
