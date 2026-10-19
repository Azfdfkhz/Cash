-- Penggantian kelebihan belanja: kalau total kwitansi > nominal diajukan
-- (requester talangi pakai uang pribadi), perusahaan yang mengganti selisihnya.
-- Kebalikan arah dari cash_advance_returns (requester -> perusahaan).
create table if not exists public.cash_advance_reimbursements (
  id uuid primary key default uuid_generate_v4(),
  cash_advance_id uuid not null references public.cash_advances(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  amount numeric(14, 2) not null check (amount > 0),
  proof_drive_file_id text,
  proof_drive_view_url text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.cash_advance_reimbursements enable row level security;

create policy "reimbursements_select" on public.cash_advance_reimbursements
  for select using (
    exists (
      select 1 from public.cash_advances ca
      where ca.id = cash_advance_reimbursements.cash_advance_id
        and (
          ca.requester_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
        )
    )
  );

create policy "reimbursements_insert" on public.cash_advance_reimbursements
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
    and exists (
      select 1 from public.cash_advances ca
      where ca.id = cash_advance_reimbursements.cash_advance_id
        and ca.status = 'approved'
    )
  );

create policy "reimbursements_delete" on public.cash_advance_reimbursements
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
  );

create index if not exists idx_reimbursements_cash_advance on public.cash_advance_reimbursements(cash_advance_id);

-- ============ BALANCE VIEW (tambah total_reimbursed) ============
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
  ) as total_returned,
  coalesce(
    (select sum(cri.amount) from public.cash_advance_reimbursements cri
      where cri.cash_advance_id = ca.id),
    0
  ) as total_reimbursed
from public.cash_advances ca;

-- ============ AUTO-CLOSE SAAT KEKURANGAN SUDAH DIGANTI PENUH ============
create or replace function public.maybe_close_cash_advance_reimbursement()
returns trigger as $$
declare
  v_balance numeric;
  v_reimbursed numeric;
begin
  select b.balance, b.total_reimbursed into v_balance, v_reimbursed
  from public.cash_advance_balances b
  where b.cash_advance_id = new.cash_advance_id;

  if v_balance < 0 and v_reimbursed >= abs(v_balance) then
    update public.cash_advances
    set status = 'closed'
    where id = new.cash_advance_id and status = 'approved';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_reimbursement_added on public.cash_advance_reimbursements;
create trigger on_reimbursement_added
  after insert on public.cash_advance_reimbursements
  for each row
  execute procedure public.maybe_close_cash_advance_reimbursement();
