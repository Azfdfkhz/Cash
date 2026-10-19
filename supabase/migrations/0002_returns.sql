-- Pengembalian sisa saldo Cash Advance (kelebihan dana yang dikembalikan requester)
create table if not exists public.cash_advance_returns (
  id uuid primary key default uuid_generate_v4(),
  cash_advance_id uuid not null references public.cash_advances(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  amount numeric(14, 2) not null check (amount > 0),
  proof_drive_file_id text,
  proof_drive_view_url text,
  note text,
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.cash_advance_returns enable row level security;

create policy "returns_select" on public.cash_advance_returns
  for select using (
    exists (
      select 1 from public.cash_advances ca
      where ca.id = cash_advance_returns.cash_advance_id
        and (
          ca.requester_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
        )
    )
  );

create policy "returns_insert" on public.cash_advance_returns
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.cash_advances ca
      where ca.id = cash_advance_returns.cash_advance_id
        and ca.requester_id = auth.uid()
        and ca.status = 'approved'
    )
  );

create policy "returns_confirm" on public.cash_advance_returns
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
  );

create policy "returns_delete_unconfirmed" on public.cash_advance_returns
  for delete using (
    confirmed_at is null
    and (
      created_by = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
    )
  );

create index if not exists idx_returns_cash_advance on public.cash_advance_returns(cash_advance_id);

-- ============ BALANCE VIEW (tambah total_returned) ============
create or replace view public.cash_advance_balances
with (security_invoker = true) as
select
  ca.id as cash_advance_id,
  ca.amount_requested,
  coalesce((select sum(r.amount) from public.receipts r where r.cash_advance_id = ca.id), 0) as total_spent,
  ca.amount_requested - coalesce((select sum(r.amount) from public.receipts r where r.cash_advance_id = ca.id), 0) as balance,
  coalesce(
    (select sum(cr.amount) from public.cash_advance_returns cr
      where cr.cash_advance_id = ca.id and cr.confirmed_at is not null),
    0
  ) as total_returned
from public.cash_advances ca;

-- ============ AUTO-CLOSE SAAT SISA SALDO SUDAH DIKEMBALIKAN PENUH ============
create or replace function public.maybe_close_cash_advance()
returns trigger as $$
declare
  v_balance numeric;
  v_returned numeric;
begin
  select b.balance, b.total_returned into v_balance, v_returned
  from public.cash_advance_balances b
  where b.cash_advance_id = new.cash_advance_id;

  if v_balance > 0 and v_returned >= v_balance then
    update public.cash_advances
    set status = 'closed'
    where id = new.cash_advance_id and status = 'approved';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_return_confirmed on public.cash_advance_returns;
create trigger on_return_confirmed
  after insert or update on public.cash_advance_returns
  for each row
  when (new.confirmed_at is not null)
  execute procedure public.maybe_close_cash_advance();
