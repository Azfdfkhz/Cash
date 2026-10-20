-- `cash_advance_balances` sebelumnya menghitung ulang SUM(receipts) /
-- SUM(returns) / SUM(reimbursements) lewat subquery ter-korelasi untuk
-- SETIAP baris cash_advances, setiap kali view ini dibaca -- termasuk oleh
-- cash_advance_dashboard_stats() yang jalan di setiap buka dashboard, untuk
-- setiap user. Sekarang totalnya disimpan di kolom cash_advances dan dijaga
-- oleh trigger saat receipts/returns/reimbursements berubah, jadi membaca
-- saldo tinggal baca kolom yang sudah dihitung, bukan agregat ulang seluruh
-- tabel.
--
-- Bentuk view & RPC di bawah SENGAJA dibuat identik dengan sebelumnya, jadi
-- tidak ada perubahan kode aplikasi yang dibutuhkan.

alter table public.cash_advances
  add column if not exists total_spent numeric(14, 2) not null default 0,
  add column if not exists total_returned numeric(14, 2) not null default 0,
  add column if not exists total_reimbursed numeric(14, 2) not null default 0;

-- Isi nilai awal dari data yang sudah ada, sebelum trigger mengambil alih.
update public.cash_advances ca set
  total_spent = coalesce(
    (select sum(r.amount) from public.receipts r where r.cash_advance_id = ca.id), 0
  ),
  total_returned = coalesce(
    (select sum(cr.amount) from public.cash_advance_returns cr
      where cr.cash_advance_id = ca.id and cr.confirmed_at is not null), 0
  ),
  total_reimbursed = coalesce(
    (select sum(cri.amount) from public.cash_advance_reimbursements cri
      where cri.cash_advance_id = ca.id), 0
  );

-- ============ TRIGGER: total_spent dari receipts ============
-- Insert/delete receipts (tidak ada policy update) tetap ditangani semua
-- (insert/update/delete) untuk jaga-jaga kalau ada koreksi lewat service role.
create or replace function public.recompute_ca_total_spent()
returns trigger as $$
declare
  v_id uuid := coalesce(new.cash_advance_id, old.cash_advance_id);
begin
  update public.cash_advances
  set total_spent = coalesce((select sum(amount) from public.receipts where cash_advance_id = v_id), 0)
  where id = v_id;
  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_receipts_change on public.receipts;
create trigger on_receipts_change
  after insert or update or delete on public.receipts
  for each row execute procedure public.recompute_ca_total_spent();

-- ============ TRIGGER: total_returned + auto-close (gabung jadi satu,
-- supaya tidak ada masalah urutan trigger vs total_returned yang baru
-- ditulis oleh trigger lain di tabel yang sama) ============
create or replace function public.maybe_close_cash_advance()
returns trigger as $$
declare
  v_amount_requested numeric;
  v_total_spent numeric;
  v_total_returned numeric;
  v_balance numeric;
begin
  select amount_requested, total_spent into v_amount_requested, v_total_spent
  from public.cash_advances where id = new.cash_advance_id;

  select coalesce(sum(amount), 0) into v_total_returned
  from public.cash_advance_returns
  where cash_advance_id = new.cash_advance_id and confirmed_at is not null;

  update public.cash_advances
  set total_returned = v_total_returned
  where id = new.cash_advance_id;

  v_balance := v_amount_requested - v_total_spent;

  if v_balance > 0 and v_total_returned >= v_balance then
    update public.cash_advances
    set status = 'closed'
    where id = new.cash_advance_id and status = 'approved';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
-- Trigger on_return_confirmed sudah ada (hanya jalan saat confirmed_at
-- terisi) dan tetap dipertahankan apa adanya; returns yang belum
-- dikonfirmasi tidak masuk total_returned, dan return yang sudah
-- dikonfirmasi tidak bisa dihapus (lihat policy returns_delete_unconfirmed),
-- jadi insert/update ini sudah mencakup semua kasus yang mengubah total.

-- ============ TRIGGER: total_reimbursed + auto-close (insert) ============
create or replace function public.maybe_close_cash_advance_reimbursement()
returns trigger as $$
declare
  v_amount_requested numeric;
  v_total_spent numeric;
  v_total_reimbursed numeric;
  v_balance numeric;
begin
  select amount_requested, total_spent into v_amount_requested, v_total_spent
  from public.cash_advances where id = new.cash_advance_id;

  select coalesce(sum(amount), 0) into v_total_reimbursed
  from public.cash_advance_reimbursements
  where cash_advance_id = new.cash_advance_id;

  update public.cash_advances
  set total_reimbursed = v_total_reimbursed
  where id = new.cash_advance_id;

  v_balance := v_amount_requested - v_total_spent;

  if v_balance < 0 and v_total_reimbursed >= abs(v_balance) then
    update public.cash_advances
    set status = 'closed'
    where id = new.cash_advance_id and status = 'approved';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
-- Trigger on_reimbursement_added sudah ada (after insert) dan tetap
-- dipertahankan apa adanya.

-- reimbursement bisa dihapus oleh tim operasional (policy
-- reimbursements_delete), jadi total_reimbursed butuh trigger delete
-- terpisah supaya tidak jadi basi. Tidak ada logika buka-kembali status di
-- sini -- itu bukan perilaku yang ada sekarang, cuma menjaga kolom total
-- tetap akurat.
create or replace function public.recompute_ca_total_reimbursed_on_delete()
returns trigger as $$
begin
  update public.cash_advances
  set total_reimbursed = coalesce(
    (select sum(amount) from public.cash_advance_reimbursements where cash_advance_id = old.cash_advance_id),
    0
  )
  where id = old.cash_advance_id;
  return old;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_reimbursement_deleted on public.cash_advance_reimbursements;
create trigger on_reimbursement_deleted
  after delete on public.cash_advance_reimbursements
  for each row execute procedure public.recompute_ca_total_reimbursed_on_delete();

-- ============ VIEW: sekarang baca langsung dari kolom tersimpan, tanpa
-- subquery ter-korelasi ============
-- drop dulu, bukan create or replace: tipe kolom total_spent berubah dari
-- `numeric` polos (hasil SUM di view lama) jadi `numeric(14,2)` (kolom asli
-- di cash_advances), dan Postgres menolak create-or-replace yang mengubah
-- tipe kolom view yang sudah ada.
drop view if exists public.cash_advance_balances;
create view public.cash_advance_balances
with (security_invoker = true) as
select
  ca.id as cash_advance_id,
  ca.amount_requested,
  ca.total_spent,
  ca.amount_requested - ca.total_spent as balance,
  ca.total_returned,
  ca.total_reimbursed
from public.cash_advances ca;

-- ============ RPC: baca langsung dari cash_advances, tanpa join ============
create or replace function public.cash_advance_dashboard_stats()
returns table (pending_count bigint, total_outstanding numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*) filter (where status = 'pending'),
    coalesce(sum(amount_requested - total_spent) filter (where status = 'approved'), 0)
  from public.cash_advances;
$$;
