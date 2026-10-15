-- Onboarding langkah 2 ("Lengkapi data Anda"):
--   username             -> nama pengguna unik (huruf kecil, tanpa spasi)
--   profile_completed_at -> terisi saat langkah 2 selesai. NULL = belum selesai,
--                           dan aplikasi akan mengarahkan user ke
--                           /register/complete-profile.
alter table public.profiles
  add column if not exists username text,
  add column if not exists profile_completed_at timestamptz;

-- Semua akun yang SUDAH ada dianggap lengkap, supaya pengguna lama tidak
-- tiba-tiba dipaksa mengisi ulang. Hanya akun baru yang mulai dari NULL.
update public.profiles
set profile_completed_at = coalesce(profile_completed_at, created_at)
where profile_completed_at is null;

create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(username))
  where username is not null;
