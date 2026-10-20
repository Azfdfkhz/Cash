-- v1.1.6 -- Hardening keamanan sebelum produksi.
--
-- Celah yang ditutup (semuanya sudah dibuktikan bisa dieksploitasi lewat REST
-- API Supabase memakai anon key yang memang publik di bundle JavaScript):
--
--  1. profiles_update_own mengizinkan user mengubah KOLOM APA PUN di profilnya,
--     termasuk `role` -> requester bisa menjadikan dirinya Tim Operasional.
--  2. profiles_select_all (using true) tanpa batasan role -> siapa pun di
--     internet, TANPA LOGIN, bisa membaca seluruh profil: email, nomor
--     rekening, atas nama, dan Telegram chat ID semua user.
--  3. Requester bisa mengubah kolom sensitif pada pengajuannya yang berstatus
--     `rejected` (total_spent, total_returned, disbursed_at, kind, dst.).
--  4. Requester bisa membuat catatan pengembalian yang SUDAH "terkonfirmasi"
--     (confirmed_at terisi) sehingga pengajuan tertutup tanpa verifikasi Ops.
--  5. Tidak ada pembatasan laju / kuota -> rawan spam (notifikasi Telegram,
--     unggahan Drive, panggilan OCR berbayar, pengajuan massal).
--  6. Ops bisa menurunkan role dirinya sendiri (aplikasi bisa tanpa admin).
--
-- Aman dijalankan ulang (idempoten). Jalankan di SQL Editor Supabase SETELAH
-- migrasi 0029. Tidak mengubah/menghapus data yang sudah ada.

-- ============================================================================
-- 0. Helper: apakah user yang sedang login adalah Tim Operasional?
-- ============================================================================
-- SECURITY DEFINER supaya bisa dipakai di policy tabel `profiles` itu sendiri
-- tanpa rekursi RLS. Dibungkus (select ...) di policy agar dievaluasi sekali
-- per query, bukan per baris.
create or replace function public.is_operational()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'operational'
  );
$$;

revoke execute on function public.is_operational() from public, anon;
grant execute on function public.is_operational() to authenticated;

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_select_scoped" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Yang boleh dibaca: profil sendiri, profil staf Operasional (dipakai untuk
-- menampilkan "disetujui/dicairkan oleh <nama>" ke requester), dan -- bila
-- yang login Tim Operasional -- semua profil. Pengunjung anonim: tidak ada.
create policy "profiles_select_scoped" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or role = 'operational'
    or (select public.is_operational())
  );

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Batasi KOLOM yang bisa ditulis langsung dari browser. `role`, `email`, `id`
-- sengaja tidak ada: role hanya berubah lewat RPC set_user_role (khusus Ops).
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;
grant update (
  full_name,
  username,
  profile_completed_at,
  bank_name,
  bank_account_number,
  bank_account_holder,
  telegram_chat_id
) on public.profiles to authenticated;

-- ============================================================================
-- 2. CASH_ADVANCES: hanya kolom workflow yang boleh ditulis langsung
-- ============================================================================
-- Aplikasi menulis langsung hanya: status/reviewed_by/reviewed_at/review_note
-- (setuju/tolak/tutup oleh Ops) dan rab_url. Semua kolom lain (total_*, kind,
-- requester_id, disbursed_*, closed_at, report_*, bank_*, amount_requested,
-- purpose, dst.) hanya berubah lewat RPC/trigger SECURITY DEFINER.
-- RLS tetap menentukan SIAPA yang boleh meng-update baris yang mana.
revoke insert, update, delete, truncate on public.cash_advances from anon, authenticated;
grant update (status, reviewed_by, reviewed_at, review_note, rab_url)
  on public.cash_advances to authenticated;

-- ============================================================================
-- 3. PENGEMBALIAN SISA SALDO
-- ============================================================================
-- Requester tidak boleh membuat pengembalian yang sudah "terkonfirmasi".
drop policy if exists "returns_insert" on public.cash_advance_returns;
create policy "returns_insert" on public.cash_advance_returns
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and confirmed_at is null
    and confirmed_by is null
    and exists (
      select 1 from public.cash_advances ca
      where ca.id = cash_advance_returns.cash_advance_id
        and ca.requester_id = auth.uid()
        and ca.status = 'approved'
    )
  );

-- Konfirmasi oleh Ops hanya menyentuh dua kolom ini.
revoke update on public.cash_advance_returns from anon, authenticated;
grant update (confirmed_by, confirmed_at) on public.cash_advance_returns to authenticated;

-- ============================================================================
-- 4. set_user_role: jangan biarkan Ops menurunkan dirinya sendiri
-- ============================================================================
create or replace function public.set_user_role(target_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'operational'
  ) then
    raise exception 'Hanya Tim Operasional yang bisa mengubah role pengguna.';
  end if;

  if new_role not in ('requester', 'operational') then
    raise exception 'Role tidak valid.';
  end if;

  if target_id = auth.uid() and new_role <> 'operational' then
    raise exception 'Anda tidak bisa menurunkan role akun Anda sendiri. Minta Tim Operasional lain.';
  end if;

  update public.profiles set role = new_role where id = target_id;
end;
$$;

revoke execute on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- ============================================================================
-- 5. RATE LIMIT (dipakai API route Next.js lewat supabase.rpc)
-- ============================================================================
-- Kunci = <user id>:<aksi>[:<subjek>]. Jendela tetap (fixed window). Berjalan
-- sebagai definer; tabel tidak bisa dibaca/ditulis langsung oleh browser.
-- Aksi & ukuran jendela di-whitelist supaya tabel tidak bisa digembungkan
-- dengan baris sampah.
create table if not exists public.api_rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create index if not exists idx_api_rate_limits_window on public.api_rate_limits (window_start);

create or replace function public.rate_limit_hit(
  p_action text,
  p_max integer,
  p_window_seconds integer,
  p_subject text default null,
  p_subject_max integer default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_window timestamptz;
  v_hits integer;
begin
  if v_uid is null then
    return false;
  end if;

  if p_action not in (
    'ocr', 'upload', 'file_view', 'rab_import', 'report_get', 'report_save',
    'notify_ops', 'notify_decision', 'notify_disbursed', 'notify_reimbursed'
  ) then
    raise exception 'Aksi rate limit tidak dikenal.';
  end if;
  if p_window_seconds not in (60, 300, 600, 3600, 86400) then
    raise exception 'Ukuran jendela rate limit tidak valid.';
  end if;
  if p_max < 1 or p_max > 10000 then
    raise exception 'Batas rate limit tidak valid.';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  -- Batas total per user per aksi.
  insert into public.api_rate_limits (bucket, window_start, hits)
  values (v_uid::text || ':' || p_action, v_window, 1)
  on conflict (bucket, window_start)
    do update set hits = public.api_rate_limits.hits + 1
  returning hits into v_hits;

  if v_hits > p_max then
    return false;
  end if;

  -- Batas per subjek (mis. satu pengajuan) supaya notifikasi yang sama tidak
  -- bisa dikirim berulang. Baris subjek hanya dibuat setelah batas total lolos,
  -- jadi jumlahnya ikut dibatasi p_max.
  if p_subject is not null and p_subject_max is not null then
    insert into public.api_rate_limits (bucket, window_start, hits)
    values (v_uid::text || ':' || p_action || ':' || left(p_subject, 64), v_window, 1)
    on conflict (bucket, window_start)
      do update set hits = public.api_rate_limits.hits + 1
    returning hits into v_hits;

    if v_hits > p_subject_max then
      return false;
    end if;
  end if;

  -- Bersih-bersih berkala (baris lama tidak dibutuhkan lagi).
  if random() < 0.01 then
    delete from public.api_rate_limits where window_start < now() - interval '2 days';
  end if;

  return true;
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer, text, integer) from public, anon;
grant execute on function public.rate_limit_hit(text, integer, integer, text, integer) to authenticated;

-- ============================================================================
-- 6. ANTI-SPAM PENGAJUAN
-- ============================================================================
-- Satu akun tidak bisa membanjiri antrean Ops (dan grup Telegram Ops) dengan
-- pengajuan massal.
create or replace function public.guard_cash_advance_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending integer;
  v_recent integer;
begin
  select
    count(*) filter (where status = 'pending'),
    count(*) filter (where created_at > now() - interval '24 hours')
  into v_pending, v_recent
  from public.cash_advances
  where requester_id = new.requester_id;

  if v_pending >= 20 then
    raise exception 'Terlalu banyak pengajuan yang masih menunggu persetujuan (maks. 20). Tunggu sampai ditinjau Tim Operasional.';
  end if;
  if v_recent >= 40 then
    raise exception 'Batas pengajuan harian tercapai (maks. 40 per 24 jam). Coba lagi besok.';
  end if;

  return new;
end;
$$;

drop trigger if exists on_cash_advance_insert_guard on public.cash_advances;
create trigger on_cash_advance_insert_guard
  before insert on public.cash_advances
  for each row execute procedure public.guard_cash_advance_insert();

revoke execute on function public.guard_cash_advance_insert() from public, anon, authenticated;

-- ============================================================================
-- 7. BATAS JUMLAH BARIS ANAK (cegah payload/penyimpanan membengkak)
-- ============================================================================
-- TG_ARGV[0] = kolom induk, TG_ARGV[1] = jumlah maksimum. Baris yang sudah ada
-- (upsert yang meng-update) tidak dihitung ulang.
create or replace function public.enforce_max_children()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
  v_count bigint;
  v_exists boolean;
begin
  execute format('select exists (select 1 from %I.%I where id = $1)', tg_table_schema, tg_table_name)
    into v_exists using (to_jsonb(new) ->> 'id')::uuid;
  if v_exists then
    return new;
  end if;

  execute format('select count(*) from %I.%I where %I = $1', tg_table_schema, tg_table_name, tg_argv[0])
    into v_count using v_parent;

  if v_count >= tg_argv[1]::integer then
    raise exception 'Jumlah data terlalu banyak (maksimal % baris).', tg_argv[1];
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_max_children() from public, anon, authenticated;

drop trigger if exists on_rab_items_limit on public.rab_items;
create trigger on_rab_items_limit
  before insert on public.rab_items
  for each row execute procedure public.enforce_max_children('cash_advance_id', '300');

drop trigger if exists on_receipts_limit on public.receipts;
create trigger on_receipts_limit
  before insert on public.receipts
  for each row execute procedure public.enforce_max_children('cash_advance_id', '300');

drop trigger if exists on_receipt_lines_limit on public.receipt_lines;
create trigger on_receipt_lines_limit
  before insert on public.receipt_lines
  for each row execute procedure public.enforce_max_children('receipt_id', '100');

-- ============================================================================
-- 8. BATAS PANJANG TEKS (NOT VALID = hanya diperiksa untuk baris baru/diubah,
--    data lama tidak disentuh)
-- ============================================================================
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('profiles',            'full_name',           150),
      ('profiles',            'username',             40),
      ('profiles',            'bank_name',           100),
      ('profiles',            'bank_account_number',  40),
      ('profiles',            'bank_account_holder', 150),
      ('profiles',            'telegram_chat_id',     40),
      ('cash_advances',       'purpose',             300),
      ('cash_advances',       'program_ref',         300),
      ('cash_advances',       'rab_url',             500),
      ('cash_advances',       'bank_name',           100),
      ('cash_advances',       'bank_account_number',  40),
      ('cash_advances',       'bank_account_holder', 150),
      ('cash_advances',       'review_note',        1000),
      ('cash_advances',       'disbursement_note',  1000),
      ('receipts',            'vendor',              200),
      ('receipts',            'notes',              1000),
      ('receipts',            'category',            100),
      ('receipts',            'ocr_raw_text',      20000),
      ('receipt_lines',       'notes',              1000),
      ('receipt_lines',       'category',            100),
      ('rab_items',           'description',         300),
      ('rab_items',           'unit',                 50),
      ('cash_advance_events', 'note',               1000),
      ('cash_advance_returns','note',               1000),
      ('cash_advance_reimbursements', 'note',       1000)
    ) as v(tbl, col, max_len)
  loop
    execute format('alter table public.%I drop constraint if exists %I', spec.tbl, 'chk_' || spec.tbl || '_' || spec.col || '_len');
    execute format(
      'alter table public.%I add constraint %I check (%I is null or char_length(%I) <= %s) not valid',
      spec.tbl, 'chk_' || spec.tbl || '_' || spec.col || '_len', spec.col, spec.col, spec.max_len
    );
  end loop;
end $$;

-- ============================================================================
-- 9. Defense in depth: peran `anon` (pengunjung tanpa login) tidak punya akses
--    tabel sama sekali. Aplikasi hanya memakai role `authenticated` untuk data.
-- ============================================================================
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- ============================================================================
-- 10. (OPSIONAL, belum aktif) Batasi pendaftaran ke domain email perusahaan.
--     Halaman daftar menulis "Daftar dengan email perusahaan Anda", tetapi
--     tidak ada yang memaksakannya: siapa pun dengan email apa pun bisa
--     mendaftar dan langsung bisa mengajukan, mengunggah ke Drive, dan memicu
--     notifikasi Telegram. Hapus tanda komentar & ganti domainnya jika sesuai
--     kebijakan Anda (atau pakai Auth Hook "Before User Created" di dashboard).
-- ============================================================================
-- create or replace function public.restrict_signup_domain()
-- returns trigger
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- begin
--   if lower(split_part(new.email, '@', 2)) not in ('sharinghappiness.org') then
--     raise exception 'Pendaftaran hanya untuk email resmi organisasi.';
--   end if;
--   return new;
-- end;
-- $$;
-- drop trigger if exists on_auth_user_restrict_domain on auth.users;
-- create trigger on_auth_user_restrict_domain
--   before insert on auth.users
--   for each row execute procedure public.restrict_signup_domain();
