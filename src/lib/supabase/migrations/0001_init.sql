-- Cash Advance app schema
create extension if not exists "uuid-ossp";

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'requester' check (role in ('requester', 'operational')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ CASH ADVANCES ============
create table if not exists public.cash_advances (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references public.profiles(id),
  purpose text not null,
  amount_requested numeric(14, 2) not null check (amount_requested > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'closed')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

alter table public.cash_advances enable row level security;

create policy "cash_advances_select" on public.cash_advances
  for select using (
    requester_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
  );

create policy "cash_advances_insert_own" on public.cash_advances
  for insert with check (requester_id = auth.uid());

create policy "cash_advances_update" on public.cash_advances
  for update using (
    (requester_id = auth.uid() and status = 'pending')
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
  );

-- ============ RECEIPTS ============
create table if not exists public.receipts (
  id uuid primary key default uuid_generate_v4(),
  cash_advance_id uuid not null references public.cash_advances(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  amount numeric(14, 2) not null check (amount >= 0),
  vendor text,
  receipt_date date,
  notes text,
  drive_file_id text,
  drive_view_url text,
  ocr_raw_text text,
  created_at timestamptz not null default now()
);

alter table public.receipts enable row level security;

create policy "receipts_select" on public.receipts
  for select using (
    exists (
      select 1 from public.cash_advances ca
      where ca.id = receipts.cash_advance_id
        and (
          ca.requester_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
        )
    )
  );

create policy "receipts_insert" on public.receipts
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.cash_advances ca
      where ca.id = receipts.cash_advance_id
        and ca.requester_id = auth.uid()
        and ca.status = 'approved'
    )
  );

create policy "receipts_delete" on public.receipts
  for delete using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
  );

-- ============ BALANCE VIEW ============
create or replace view public.cash_advance_balances
with (security_invoker = true) as
select
  ca.id as cash_advance_id,
  ca.amount_requested,
  coalesce(sum(r.amount), 0) as total_spent,
  ca.amount_requested - coalesce(sum(r.amount), 0) as balance
from public.cash_advances ca
left join public.receipts r on r.cash_advance_id = ca.id
group by ca.id, ca.amount_requested;

-- ============ INDEXES ============
create index if not exists idx_cash_advances_requester on public.cash_advances(requester_id);
create index if not exists idx_cash_advances_status on public.cash_advances(status);
create index if not exists idx_receipts_cash_advance on public.receipts(cash_advance_id);

-- ============ PROMOTE A USER TO OPERATIONAL (run manually after they sign up) ============
-- update public.profiles set role = 'operational' where email = 'ops@example.com';
