-- Laporan penutupan (PDF) yang disimpan ke folder Drive pengajuan saat
-- Cash Advance selesai.

alter table public.cash_advances
  add column if not exists report_drive_file_id text,
  add column if not exists report_drive_url text;

-- Lewat RPC karena pengajuan yang sudah closed tidak bisa di-UPDATE requester,
-- dan Tim Operasional tidak bisa meng-UPDATE pengajuan miliknya sendiri --
-- padahal keduanya boleh memicu penyimpanan laporan. Cuma dua kolom laporan
-- yang disentuh.
create or replace function public.set_cash_advance_report(
  target_id uuid,
  file_id text,
  view_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.cash_advances ca
    where ca.id = target_id
      and ca.status = 'closed'
      and (
        ca.requester_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operational')
      )
  ) then
    raise exception 'Laporan hanya bisa disimpan untuk pengajuan yang sudah selesai.';
  end if;

  update public.cash_advances
  set report_drive_file_id = file_id, report_drive_url = view_url
  where id = target_id;
end;
$$;

revoke execute on function public.set_cash_advance_report(uuid, text, text) from public, anon;
grant execute on function public.set_cash_advance_report(uuid, text, text) to authenticated;
