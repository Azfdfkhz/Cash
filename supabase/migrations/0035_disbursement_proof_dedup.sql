-- v1.2.3 -- Bukti transfer pencairan tidak boleh dipakai ulang.
--
-- Aman dijalankan ulang (idempoten). Jalankan di SQL Editor Supabase SETELAH
-- migrasi 0034.
--
-- Setiap bukti pencairan disidik-jarikan dua kali:
--   * sha256  : isi file persis sama (foto/PDF yang sama diunggah lagi).
--   * phash   : "sidik jari visual" 64-bit untuk foto, menangkap foto yang
--               sama tetapi disimpan ulang / diperkecil / dipotret layar.
-- Pencairan ditolak bila sidik jarinya sudah ada di pengajuan lain.

alter table public.cash_advances
  add column if not exists disbursement_proof_sha256 text,
  add column if not exists disbursement_proof_phash text;

alter table public.cash_advances drop constraint if exists chk_cash_advances_proof_sha256_fmt;
alter table public.cash_advances add constraint chk_cash_advances_proof_sha256_fmt
  check (disbursement_proof_sha256 is null or disbursement_proof_sha256 ~ '^[0-9a-f]{64}$') not valid;

alter table public.cash_advances drop constraint if exists chk_cash_advances_proof_phash_fmt;
alter table public.cash_advances add constraint chk_cash_advances_proof_phash_fmt
  check (disbursement_proof_phash is null or disbursement_proof_phash ~ '^[0-9a-f]{16}$') not valid;

-- Jaring pengaman terakhir di level data: satu file persis sama = satu pencairan.
create unique index if not exists idx_cash_advances_proof_sha256
  on public.cash_advances (disbursement_proof_sha256)
  where disbursement_proof_sha256 is not null;

-- Mengembalikan id pengajuan yang sudah memakai bukti serupa (atau null).
-- Selisih <= 6 dari 64 bit pada phash dianggap foto yang sama.
create or replace function public.find_duplicate_disbursement_proof(
  p_sha256 text,
  p_phash text default null,
  p_exclude uuid default null
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found uuid;
begin
  if not (select public.is_operational()) then
    raise exception 'Hanya Tim Operasional yang bisa memeriksa bukti pencairan.';
  end if;

  select ca.id into found
  from public.cash_advances ca
  where ca.id is distinct from p_exclude
    and (
      (p_sha256 is not null and ca.disbursement_proof_sha256 = p_sha256)
      or (
        p_phash is not null
        and ca.disbursement_proof_phash is not null
        and bit_count(('x' || ca.disbursement_proof_phash)::bit(64) # ('x' || p_phash)::bit(64)) <= 6
      )
    )
  limit 1;

  return found;
end;
$$;

revoke execute on function public.find_duplicate_disbursement_proof(text, text, uuid) from public, anon;
grant execute on function public.find_duplicate_disbursement_proof(text, text, uuid) to authenticated;

-- Fungsi pencairan: terima sidik jari bukti dan tolak bila sudah pernah dipakai.
drop function if exists public.mark_cash_advance_disbursed(uuid, text, text, text);

create or replace function public.mark_cash_advance_disbursed(
  target_id uuid,
  file_id text,
  view_url text,
  note text default null,
  proof_sha256 text default null,
  proof_phash text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'operational'
  ) then
    raise exception 'Hanya Tim Operasional yang bisa mencairkan dana.';
  end if;

  if not exists (
    select 1 from public.cash_advances
    where id = target_id
      and status = 'approved'
      and disbursed_at is null
      and requester_id <> auth.uid()
  ) then
    raise exception 'Pengajuan tidak bisa dicairkan (belum disetujui, sudah dicairkan, atau milik Anda sendiri).';
  end if;

  if file_id is null or view_url is null then
    raise exception 'Bukti transfer pencairan wajib diunggah.';
  end if;

  if proof_sha256 is null then
    raise exception 'Bukti transfer pencairan tidak valid. Unggah ulang bukti transfer.';
  end if;

  if public.find_duplicate_disbursement_proof(proof_sha256, proof_phash, target_id) is not null then
    raise exception 'Bukti transfer ini sudah pernah dipakai pada pengajuan lain. Gunakan bukti transfer yang berbeda.'
      using errcode = '23505';
  end if;

  update public.cash_advances
  set disbursed_at = now(),
      disbursed_by = auth.uid(),
      disbursement_proof_drive_file_id = file_id,
      disbursement_proof_url = view_url,
      disbursement_proof_sha256 = proof_sha256,
      disbursement_proof_phash = proof_phash,
      disbursement_note = nullif(trim(note), ''),
      -- Reimbursement: kwitansi sudah lengkap & nominal = total kwitansi,
      -- jadi setelah ditransfer tidak ada lagi yang perlu dibereskan.
      status = case when kind = 'reimbursement' then 'closed' else status end
  where id = target_id;

  insert into public.cash_advance_events (cash_advance_id, actor_id, action, note)
  values (target_id, auth.uid(), 'disbursed', nullif(trim(note), ''));
end;
$$;

revoke execute on function public.mark_cash_advance_disbursed(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.mark_cash_advance_disbursed(uuid, text, text, text, text, text) to authenticated;
