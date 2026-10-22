-- v1.1.9 -- Username boleh huruf besar & kecil.
--
-- Aman dijalankan ulang (idempoten). Jalankan di SQL Editor Supabase SETELAH
-- migrasi 0033. Keunikan username tetap tidak peka huruf besar/kecil lewat
-- index idx_profiles_username_lower (lower(username)), jadi "Rina" dan "rina"
-- dianggap sama.
alter table public.profiles drop constraint if exists chk_profiles_username_format;
alter table public.profiles add constraint chk_profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9_.]{3,30}$')
  not valid;
