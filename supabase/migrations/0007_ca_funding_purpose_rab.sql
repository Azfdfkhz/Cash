-- Detail tambahan pengajuan Cash Advance:
--  - funding_source : sumber dana (program / marketing-operasional / program lainnya)
--  - program_ref    : id campaign atau nama dana program, wajib saat funding_source = 'program'
--  - objective      : tujuan penggunaan (penyaluran / event / lainnya)
--  - rab_url        : link spreadsheet RAB
alter table public.cash_advances
  add column if not exists funding_source text
    check (funding_source in ('program', 'marketing_operasional', 'program_lainnya')),
  add column if not exists program_ref text,
  add column if not exists objective text
    check (objective in ('penyaluran', 'event', 'lainnya')),
  add column if not exists rab_url text;

-- Kalau sumber dana = 'program', program_ref wajib diisi.
alter table public.cash_advances
  drop constraint if exists cash_advances_program_ref_required;

alter table public.cash_advances
  add constraint cash_advances_program_ref_required
  check (
    funding_source is distinct from 'program'
    or (program_ref is not null and length(trim(program_ref)) > 0)
  );
