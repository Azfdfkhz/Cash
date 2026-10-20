-- Tanggal pengajuan Cash Advance selesai (status -> closed), dipakai sebagai
-- tanggal "Realisasi" di laporan penutupan. Pengajuan yang sudah closed
-- sebelum migration ini dibiarkan null (laporan memakai tanggal aktivitas
-- terakhir sebagai gantinya).

alter table public.cash_advances
  add column if not exists closed_at timestamptz;

create or replace function public.set_cash_advance_closed_at()
returns trigger as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at := now();
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists on_cash_advance_closed on public.cash_advances;
create trigger on_cash_advance_closed
  before update of status on public.cash_advances
  for each row execute procedure public.set_cash_advance_closed_at();

revoke execute on function public.set_cash_advance_closed_at() from public, anon, authenticated;
