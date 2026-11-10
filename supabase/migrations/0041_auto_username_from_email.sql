-- v1.3.0 -- Auto-populate username dari email (bagian sebelum @).
--
-- Perubahan UX: form "Langkah 2" tidak lagi meminta username secara manual.
-- Username diisi otomatis dari bagian email sebelum @, hanya menyisakan
-- karakter [A-Za-z0-9_.], dipotong 30 karakter.
-- Jika hasil < 3 karakter, disambung dengan 4 digit ID unik.
--
-- Aman dijalankan ulang (idempoten). Jalankan SETELAH migrasi 0040.

-- ============================================================================
-- 1. Fungsi pembantu: derive_username_from_email
--    Mengubah email menjadi username yang aman:
--    - Ambil bagian sebelum @
--    - Hapus karakter yang tidak diizinkan
--    - Potong ke maks 30 karakter
--    - Pastikan minimal 3 karakter (tambahkan suffix angka bila perlu)
-- ============================================================================
create or replace function public.derive_username_from_email(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_prefix text;
  v_username text;
begin
  -- Ambil bagian sebelum @
  v_prefix := split_part(p_email, '@', 1);

  -- Hapus karakter yang tidak diizinkan (hanya [A-Za-z0-9_.])
  v_username := regexp_replace(v_prefix, '[^A-Za-z0-9_.]', '', 'g');

  -- Potong ke maks 30 karakter
  v_username := left(v_username, 30);

  -- Jika terlalu pendek, tambahkan suffix untuk memenuhi minimal 3 karakter
  if length(v_username) < 3 then
    v_username := left(v_username || '001', 30);
  end if;

  return v_username;
end;
$$;

-- ============================================================================
-- 2. Backfill: isi username untuk profil yang belum punya username,
--    tapi sudah punya email (pengguna lama yang belum mengisi username).
--    Jika username hasil derive sudah dipakai, tambahkan 4 angka terakhir
--    dari id UUID agar tetap unik.
-- ============================================================================
do $$
declare
  r record;
  v_base text;
  v_candidate text;
  v_suffix int := 1000;
begin
  for r in
    select p.id, p.email
    from public.profiles p
    where p.username is null
      and p.email is not null
  loop
    v_base := public.derive_username_from_email(r.email);
    v_candidate := v_base;

    -- Jika sudah dipakai, coba tambahkan angka sampai unik
    while exists (
      select 1 from public.profiles
      where lower(username) = lower(v_candidate)
    ) loop
      v_candidate := left(v_base, 26) || v_suffix::text;
      v_suffix := v_suffix + 1;
      exit when v_suffix > 9999; -- guard terhadap loop tak terbatas
    end loop;

    update public.profiles
    set username = v_candidate
    where id = r.id;
  end loop;
end $$;

-- ============================================================================
-- 3. (Opsional / informatif) Pastikan constraint username tetap berlaku
--    setelah backfill. Constraint sudah ada dari migrasi 0034.
-- ============================================================================
-- Tidak ada perubahan constraint; sudah cukup dari migrasi sebelumnya.
-- chk_profiles_username_format: username ~ '^[A-Za-z0-9_.]{3,30}$'
