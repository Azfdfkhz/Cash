-- Selama pending (sedang ditinjau), requester tidak bisa mengubah pengajuan
-- maupun RAB-nya -- perubahan cuma boleh lewat alur tolak -> revisi -> ajukan
-- ulang. Tim Operasional tetap bisa mengubah RAB saat pending.
--
-- Karena RAB sekarang tidak bisa ditulis requester saat pending, pengajuan
-- baru + RAB-nya dibuat sekaligus lewat RPC create_cash_advance (atomik:
-- tidak ada lagi pengajuan yang tersimpan tanpa RAB).

-- ============ RAB: requester hanya saat ditolak ============
drop policy if exists "rab_items_write" on public.rab_items;

create policy "rab_items_write" on public.rab_items
  for all using (
    exists (
      select 1 from public.cash_advances ca
      where ca.id = rab_items.cash_advance_id
        and (
          (ca.requester_id = auth.uid() and ca.status = 'rejected')
          or (
            ca.status = 'pending'
            and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.cash_advances ca
      where ca.id = rab_items.cash_advance_id
        and (
          (ca.requester_id = auth.uid() and ca.status = 'rejected')
          or (
            ca.status = 'pending'
            and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
          )
        )
    )
  );

-- ============ cash_advances: requester hanya saat ditolak ============
-- Tanpa WITH CHECK, USING juga dipakai untuk baris hasil update, jadi
-- requester tetap tidak bisa memindahkan status sendiri (harus tetap
-- 'rejected'; pindah ke 'pending' lewat resubmit_cash_advance).
drop policy if exists "cash_advances_update" on public.cash_advances;

create policy "cash_advances_update" on public.cash_advances
  for update using (
    (requester_id = auth.uid() and status = 'rejected')
    or (
      requester_id <> auth.uid()
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
    )
  );

-- ============ RPC: buat pengajuan + RAB sekaligus ============
-- Insert langsung ke cash_advances dimatikan supaya tidak ada pengajuan
-- tanpa RAB; satu-satunya jalan membuat pengajuan adalah RPC ini.
drop policy if exists "cash_advances_insert_own" on public.cash_advances;

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
    objective, rab_url, amount_requested, bank_name, bank_account_number
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
    ca->>'bank_account_number'
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

revoke execute on function public.create_cash_advance(jsonb, jsonb) from public, anon;
grant execute on function public.create_cash_advance(jsonb, jsonb) to authenticated;
