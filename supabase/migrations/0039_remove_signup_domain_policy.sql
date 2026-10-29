-- Hapus pembatasan domain email untuk pendaftaran (mekanisme dari 0031).
-- Pendaftaran kembali terbuka untuk email dari domain mana pun.
--
-- Fungsi hook_before_user_created TIDAK di-drop, hanya dibuat selalu
-- mengizinkan. Kalau Auth Hook "Before User Created" sempat diaktifkan di
-- Dashboard, men-drop fungsinya akan membuat SEMUA pendaftaran gagal. Setelah
-- migrasi ini boleh dimatikan di Dashboard > Authentication > Hooks, lalu
-- fungsinya baru di-drop manual bila mau.
--
-- Aman dijalankan ulang (idempoten). Akun yang sudah ada tidak terpengaruh.

drop trigger if exists on_auth_user_restrict_domain on auth.users;
drop trigger if exists on_auth_user_email_change_restrict_domain on auth.users;

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;

drop function if exists public.enforce_signup_domain();
drop function if exists public.signup_email_rejection(text, text, text);
drop table if exists public.allowed_signup_domains;
