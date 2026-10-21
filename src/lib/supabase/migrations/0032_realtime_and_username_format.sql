-- v1.1.8 -- Realtime untuk auto-refresh Tim Operasional + format username.
--
-- Aman dijalankan ulang (idempoten). Jalankan di SQL Editor Supabase SETELAH
-- migrasi 0031.

-- ============================================================================
-- 1. Aktifkan Supabase Realtime (postgres_changes) untuk tabel yang perlu
--    auto-refresh: pengajuan, kwitansi, pengembalian, penggantian, RAB, dan
--    riwayat keputusan. RLS tetap berlaku di jalur Realtime -- publikasi ini
--    hanya menentukan tabel mana yang MEMANCARKAN event; siapa yang boleh
--    MENERIMA event tetap diputuskan oleh policy SELECT masing-masing tabel.
-- ============================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'cash_advances',
    'receipts',
    'receipt_lines',
    'cash_advance_returns',
    'cash_advance_reimbursements',
    'cash_advance_events',
    'rab_items'
  ])
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Realtime butuh cara mengenali baris yang berubah; identitas replika penuh
-- memastikan payload UPDATE/DELETE tetap konsisten walau tabelnya punya
-- kolom yang sering berubah (aman, tidak memengaruhi RLS/akses).
alter table public.cash_advances replica identity full;

-- ============================================================================
-- 2. Format username (defense in depth; validasi utama tetap di aplikasi).
--    Huruf kecil, angka, titik, underscore, 3-30 karakter. Konsisten dengan
--    batas panjang 40 karakter yang sudah ada di migrasi 0030.
-- ============================================================================
alter table public.profiles drop constraint if exists chk_profiles_username_format;
alter table public.profiles add constraint chk_profiles_username_format
  check (username is null or username ~ '^[a-z0-9_.]{3,30}$')
  not valid;
