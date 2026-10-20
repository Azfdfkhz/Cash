-- Uji migrasi 0031 pada Postgres lokal dengan skema auth tiruan.
-- Jalankan: psql -v ON_ERROR_STOP=1 -f tests/domain_policy.sql (database kosong)
-- Domain di sini hanyalah FIXTURE uji (contoh.test), bukan kebijakan organisasi.
\set ON_ERROR_STOP 0
create role anon nologin; create role authenticated nologin; create role supabase_auth_admin nologin;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text, raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}'
);
create schema public;
grant usage on schema public to anon, authenticated, supabase_auth_admin;
\i src/lib/supabase/migrations/0031_signup_domain_policy.sql
-- idempoten
\i src/lib/supabase/migrations/0031_signup_domain_policy.sql

create temp table results(name text, ok boolean, detail text);
create or replace function t(p_name text, p_sql text, p_expect_error text default null) returns void language plpgsql as $f$
declare msg text;
begin
  begin
    execute p_sql;
    if p_expect_error is null then insert into results values (p_name, true, 'ok');
    else insert into results values (p_name, false, 'seharusnya ditolak');
    end if;
  exception when others then
    get stacked diagnostics msg = message_text;
    if p_expect_error is not null and msg like '%'||p_expect_error||'%' then insert into results values (p_name, true, msg);
    else insert into results values (p_name, false, msg);
    end if;
  end;
end $f$;

-- A. Daftar kosong => kebijakan tidak aktif
select t('A1 kosong: domain apa pun diterima', $$insert into auth.users(email) values ('siapa@gmail.com')$$);
select t('A2 kosong: akun lama tercipta', $$insert into auth.users(email) values ('lama@lama.example')$$);

-- B. Aktifkan dengan satu domain fixture
insert into public.allowed_signup_domains(domain) values ('contoh.test');
select t('B1 domain diizinkan', $$insert into auth.users(email) values ('budi@contoh.test')$$);
select t('B2 huruf besar/spasi dinormalisasi', $$insert into auth.users(email) values ('  Ani@CONTOH.TEST ')$$);
select t('B3 domain lain ditolak', $$insert into auth.users(email) values ('x@gmail.com')$$, 'email resmi organisasi');
select t('B4 lookalike awalan ditolak', $$insert into auth.users(email) values ('x@evil-contoh.test')$$, 'email resmi organisasi');
select t('B5 lookalike akhiran ditolak', $$insert into auth.users(email) values ('x@contoh.test.evil.com')$$, 'email resmi organisasi');
select t('B6 subdomain tidak otomatis lolos', $$insert into auth.users(email) values ('x@sub.contoh.test')$$, 'email resmi organisasi');
select t('B7 email null (anonim/phone) ditolak', $$insert into auth.users(email) values (null)$$, 'email resmi organisasi');
select t('B8 email kosong ditolak', $$insert into auth.users(email) values ('')$$, 'email resmi organisasi');
insert into results select 'B9 pesan tidak membocorkan daftar domain', position('contoh' in public.signup_email_rejection('x@gmail.com')) = 0, '';

-- C. OAuth
select t('C1 Google terverifikasi + domain sah',
  $$insert into auth.users(email, raw_app_meta_data, raw_user_meta_data) values ('g1@contoh.test','{"provider":"google"}','{"email_verified":true}')$$);
select t('C2 Google BELUM terverifikasi ditolak',
  $$insert into auth.users(email, raw_app_meta_data, raw_user_meta_data) values ('g2@contoh.test','{"provider":"google"}','{"email_verified":false}')$$, 'belum terverifikasi');
select t('C3 Google domain salah ditolak',
  $$insert into auth.users(email, raw_app_meta_data, raw_user_meta_data) values ('g3@gmail.com','{"provider":"google"}','{"email_verified":true}')$$, 'email resmi organisasi');

-- D. Akun lama tidak terkunci
select t('D1 akun lama (domain di luar daftar) boleh update non-email',
  $$update auth.users set raw_user_meta_data = '{"x":1}' where email='lama@lama.example'$$);
select t('D2 akun lama ganti email ke domain luar ditolak',
  $$update auth.users set email='baru@lama.example' where email='lama@lama.example'$$, 'email resmi organisasi');
select t('D3 akun lama pindah ke email resmi diizinkan',
  $$update auth.users set email='lama@contoh.test' where email='lama@lama.example'$$);
select t('D4 update email ke nilai sama tidak diperiksa',
  $$update auth.users set email=email where email='siapa@gmail.com'$$);

-- E. Hook
create temp table hookres as
  select public.hook_before_user_created('{"user":{"email":"x@gmail.com","app_metadata":{"provider":"email"}}}') as bad,
         public.hook_before_user_created('{"user":{"email":"ok@contoh.test","app_metadata":{"provider":"email"}}}') as good,
         public.hook_before_user_created('{}') as empty;
select t('E1 hook menolak dengan error 403', $$select 1 from hookres where bad->'error'->>'http_code'='403'$$);
insert into results select 'E1b hook menolak (isi)', (bad->'error'->>'http_code')='403', bad::text from hookres;
insert into results select 'E2 hook meloloskan domain sah', good = '{}'::jsonb, good::text from hookres;
insert into results select 'E3 hook tanpa user ditolak', (empty->'error'->>'http_code')='403', empty::text from hookres;

-- F. Hak akses
insert into results select 'F1 anon tak bisa baca tabel domain', not has_table_privilege('anon','public.allowed_signup_domains','select'), '';
insert into results select 'F2 authenticated tak bisa tulis tabel', not has_table_privilege('authenticated','public.allowed_signup_domains','insert'), '';
insert into results select 'F3 anon tak bisa eksekusi pemeriksa', not has_function_privilege('anon','public.signup_email_rejection(text,text,text)','execute'), '';
insert into results select 'F4 authenticated tak bisa eksekusi hook', not has_function_privilege('authenticated','public.hook_before_user_created(jsonb)','execute'), '';
insert into results select 'F5 supabase_auth_admin bisa eksekusi hook', has_function_privilege('supabase_auth_admin','public.hook_before_user_created(jsonb)','execute'), '';

-- G. Kebijakan dimatikan lagi => kembali longgar
delete from public.allowed_signup_domains;
select t('G1 daftar dikosongkan => diterima lagi', $$insert into auth.users(email) values ('bebas@gmail.com')$$);

select case when ok then 'PASS' else 'FAIL' end as hasil, name, left(detail,70) as detail from results;
select count(*) filter (where not ok) as gagal, count(*) as total from results;
