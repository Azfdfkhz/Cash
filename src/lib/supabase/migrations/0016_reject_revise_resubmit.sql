-- Alur negosiasi: pengajuan ditolak -> requester merevisi RAB -> ajukan
-- ulang (status kembali 'pending'). Setiap keputusan & pengajuan ulang
-- dicatat di cash_advance_events, supaya catatan penolakan sebelumnya tidak
-- hilang saat review_note dikosongkan untuk putaran berikutnya.

-- ============ RIWAYAT ============
create table if not exists public.cash_advance_events (
  id uuid primary key default uuid_generate_v4(),
  cash_advance_id uuid not null references public.cash_advances(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null check (action in ('approved', 'rejected', 'resubmitted')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.cash_advance_events enable row level security;

-- Hanya bisa dibaca; baris ditulis oleh trigger / RPC (security definer).
create policy "cash_advance_events_select" on public.cash_advance_events
  for select using (
    exists (
      select 1 from public.cash_advances ca
      where ca.id = cash_advance_events.cash_advance_id
        and (
          ca.requester_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
        )
    )
  );

create index if not exists idx_cash_advance_events_ca
  on public.cash_advance_events(cash_advance_id, created_at);

-- Isi riwayat dari keputusan yang sudah ada.
insert into public.cash_advance_events (cash_advance_id, actor_id, action, note, created_at)
select id, reviewed_by, status, review_note, reviewed_at
from public.cash_advances
where status in ('approved', 'rejected') and reviewed_at is not null
  and not exists (
    select 1 from public.cash_advance_events e where e.cash_advance_id = cash_advances.id
  );

-- Catat otomatis saat Tim Operasional menyetujui / menolak.
create or replace function public.log_cash_advance_decision()
returns trigger as $$
begin
  if new.status in ('approved', 'rejected') and old.status = 'pending' then
    insert into public.cash_advance_events (cash_advance_id, actor_id, action, note)
    values (new.id, coalesce(new.reviewed_by, auth.uid()), new.status, new.review_note);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_cash_advance_decision on public.cash_advances;
create trigger on_cash_advance_decision
  after update of status on public.cash_advances
  for each row execute procedure public.log_cash_advance_decision();

revoke execute on function public.log_cash_advance_decision() from public, anon, authenticated;

-- ============ RAB boleh direvisi pemilik saat ditolak ============
drop policy if exists "rab_items_write" on public.rab_items;

create policy "rab_items_write" on public.rab_items
  for all using (
    exists (
      select 1 from public.cash_advances ca
      where ca.id = rab_items.cash_advance_id
        and (
          (ca.requester_id = auth.uid() and ca.status in ('pending', 'rejected'))
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
          (ca.requester_id = auth.uid() and ca.status in ('pending', 'rejected'))
          or (
            ca.status = 'pending'
            and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
          )
        )
    )
  );

-- Nominal diajukan juga ikut total RAB saat sedang direvisi (ditolak).
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
    where id = v_id
      and status in ('pending', 'rejected')
      and amount_requested is distinct from v_total;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

-- ============ RPC: ajukan ulang ============
-- Lewat RPC (bukan UPDATE langsung) supaya requester cuma bisa memindahkan
-- status rejected -> pending, bukan mengubah status sembarangan.
create or replace function public.resubmit_cash_advance(target_id uuid, note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.cash_advances
    where id = target_id and requester_id = auth.uid() and status = 'rejected'
  ) then
    raise exception 'Hanya pengajuan Anda yang ditolak yang bisa diajukan ulang.';
  end if;

  if not exists (select 1 from public.rab_items where cash_advance_id = target_id) then
    raise exception 'RAB wajib diisi sebelum diajukan ulang.';
  end if;

  update public.cash_advances
  set status = 'pending', reviewed_by = null, reviewed_at = null, review_note = null
  where id = target_id;

  insert into public.cash_advance_events (cash_advance_id, actor_id, action, note)
  values (target_id, auth.uid(), 'resubmitted', nullif(trim(note), ''));
end;
$$;

revoke execute on function public.resubmit_cash_advance(uuid, text) from public, anon;
grant execute on function public.resubmit_cash_advance(uuid, text) to authenticated;
