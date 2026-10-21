-- Laporan kwitansi per halaman.
-- Sebelumnya halaman Laporan menarik sampai 10.000 kwitansi sekaligus lalu
-- mencari/memfilter di browser. Fungsi ini memfilter, mengurutkan, dan
-- memotong per halaman DI DATABASE, jadi satu kunjungan hanya membawa
-- p_limit baris (+ total jumlah & total nominal untuk ringkasan).
--
-- security invoker: RLS tetap berlaku (operasional membaca semua kwitansi).
-- Mengembalikan 0 baris kalau offset melewati data -- aplikasi lalu mundur
-- ke halaman 1.

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

-- Indeks pendukung urutan terbaru & filter tanggal.
create index if not exists idx_receipts_created_at on public.receipts (created_at desc);
create index if not exists idx_receipts_receipt_date on public.receipts (receipt_date);
