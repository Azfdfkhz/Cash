-- v1.1.7 -- Kebijakan domain email untuk pendaftaran (server-side, di database).
--
-- STATUS KEBIJAKAN: DAFTAR DOMAIN BELUM DIKONFIRMASI.
--   Migrasi ini hanya menyediakan mekanisme. Selama tabel
--   public.allowed_signup_domains KOSONG, kebijakan TIDAK aktif (perilaku
--   pendaftaran sama seperti sebelumnya). Begitu diisi satu domain atau lebih,
--   pendaftaran akun BARU dan penggantian email akun hanya diterima bila
--   domainnya ada di daftar itu.
--   Domain TIDAK ditebak di sini. Isi sendiri setelah organisasi memutuskan
--   (lihat contoh di bagian paling bawah, dalam komentar).
--
-- Mengapa di database, bukan di frontend:
--   anon key Supabase publik. Siapa pun bisa memanggil
--   POST /auth/v1/signup atau alur OAuth langsung tanpa melewati halaman
--   /register. Trigger pada auth.users tetap dijalankan untuk SEMUA jalur
--   pembuatan akun (email+password, Google/OAuth, magic link/OTP, anonim,
--   phone, admin API).
--
-- Tidak mengunci akun yang sudah ada:
--   - Trigger hanya aktif saat INSERT (akun baru) dan saat kolom email
--     BERUBAH. Login akun lama tidak melewati trigger ini sama sekali.
--   - Akun lama dengan domain di luar daftar tetap bisa masuk. Bila ingin
--     menutupnya, lakukan manual lewat prosedur migrasi (lihat bagian bawah).
--
-- Aman dijalankan ulang (idempoten). Jalankan di SQL Editor Supabase SETELAH
-- migrasi 0030.

-- ============================================================================
-- 1. Daftar domain yang diizinkan
-- ============================================================================
create table if not exists public.allowed_signup_domains (
  domain text primary key
    check (domain = lower(domain) and domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  note text,
  created_at timestamptz not null default now()
);

-- RLS aktif tanpa policy + semua hak dicabut: tabel tidak terbaca/tertulis dari
-- browser (anon/authenticated), sehingga daftar domain tidak bocor. Hanya
-- SQL Editor / service role yang mengelolanya.
alter table public.allowed_signup_domains enable row level security;
revoke all on public.allowed_signup_domains from anon, authenticated;

-- ============================================================================
-- 2. Fungsi pemeriksa (satu sumber kebenaran untuk trigger DAN hook)
-- ============================================================================
-- Mengembalikan NULL bila email diterima, atau teks alasan bila ditolak.
-- Pesan penolakan sengaja generik: tidak menyebut daftar domain.
create or replace function public.signup_email_rejection(
  p_email text,
  p_provider text default 'email',
  p_email_verified text default null
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_domain text;
begin
  -- Kebijakan belum aktif bila daftar kosong (keputusan belum dikonfirmasi).
  if not exists (select 1 from public.allowed_signup_domains) then
    return null;
  end if;

  -- Domain = bagian setelah '@' TERAKHIR, dinormalisasi. Dicocokkan persis
  -- (bukan akhiran), jadi "evil-contoh.org" dan "contoh.org.evil.com" tidak
  -- lolos untuk domain "contoh.org". Subdomain harus didaftarkan sendiri.
  v_domain := lower(btrim(substring(coalesce(p_email, '') from '@([^@]+)$')));

  if v_domain is null or v_domain = ''
     or not exists (select 1 from public.allowed_signup_domains where domain = v_domain) then
    return 'Pendaftaran hanya untuk email resmi organisasi.';
  end if;

  -- Penyedia OAuth yang menyatakan EKSPLISIT email belum terverifikasi ditolak.
  -- (Jalur email+password diverifikasi lewat tautan konfirmasi Supabase.)
  if coalesce(p_provider, 'email') <> 'email' and lower(coalesce(p_email_verified, '')) = 'false' then
    return 'Email dari penyedia login belum terverifikasi.';
  end if;

  return null;
end;
$$;

revoke execute on function public.signup_email_rejection(text, text, text) from public, anon, authenticated;

-- ============================================================================
-- 3. Trigger pada auth.users (tidak bisa dilewati dari luar aplikasi)
-- ============================================================================
create or replace function public.enforce_signup_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text;
begin
  -- UPDATE: hanya periksa bila email benar-benar berubah. Akun lama yang
  -- tidak mengganti email tidak terpengaruh.
  if tg_op = 'UPDATE' and new.email is not distinct from old.email then
    return new;
  end if;

  v_reason := public.signup_email_rejection(
    new.email,
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    new.raw_user_meta_data->>'email_verified'
  );
  if v_reason is not null then
    raise exception '%', v_reason using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_signup_domain() from public, anon, authenticated;

drop trigger if exists on_auth_user_restrict_domain on auth.users;
create trigger on_auth_user_restrict_domain
  before insert on auth.users
  for each row execute procedure public.enforce_signup_domain();

drop trigger if exists on_auth_user_email_change_restrict_domain on auth.users;
create trigger on_auth_user_email_change_restrict_domain
  before update of email on auth.users
  for each row execute procedure public.enforce_signup_domain();

-- ============================================================================
-- 4. (Dianjurkan) Auth Hook "Before User Created" -- pesan error yang jelas
-- ============================================================================
-- Tanpa hook, penolakan dari trigger muncul di klien sebagai pesan generik
-- "Database error saving new user" (aplikasi sudah memetakannya ke pesan yang
-- ramah). Dengan hook, pesan penolakan tersampaikan apa adanya dan penolakan
-- terjadi lebih awal. Trigger di atas tetap jadi lapis terakhir.
-- Aktifkan manual: Dashboard > Authentication > Hooks > Before User Created >
-- pilih "Postgres function" > public.hook_before_user_created.
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_reason text;
  v_user jsonb := coalesce(event->'user', '{}'::jsonb);
begin
  v_reason := public.signup_email_rejection(
    v_user->>'email',
    coalesce(v_user->'app_metadata'->>'provider', 'email'),
    v_user->'user_metadata'->>'email_verified'
  );
  if v_reason is not null then
    return jsonb_build_object(
      'error', jsonb_build_object('message', v_reason, 'http_code', 403)
    );
  end if;
  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;

-- ============================================================================
-- 5. LANGKAH MANUAL SETELAH KEBIJAKAN DIKONFIRMASI (sengaja dikomentari)
-- ============================================================================
-- a) Isi domain yang DISETUJUI organisasi (ganti contoh; jangan menebak):
--
--    insert into public.allowed_signup_domains (domain, note)
--    values ('<domain-resmi-organisasi>', 'Dikonfirmasi oleh <nama> pada <tanggal>')
--    on conflict (domain) do nothing;
--
-- b) Cek dampak pada akun yang SUDAH ADA sebelum/ sesudah mengaktifkan:
--
--    select p.id, p.email, p.role
--    from public.profiles p
--    where lower(substring(p.email from '@([^@]+)$'))
--          not in (select domain from public.allowed_signup_domains);
--
--    Akun-akun ini TETAP bisa login. Tangani lewat prosedur migrasi yang
--    disepakati (mis. minta ganti ke email resmi, atau tambahkan domainnya
--    ke daftar bila memang sah). Jangan menghapus akun yang masih punya
--    pengajuan.
--
-- c) Untuk menonaktifkan kebijakan sementara: kosongkan tabel
--    (delete from public.allowed_signup_domains;).
