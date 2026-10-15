-- RPC untuk mengubah role user (requester <-> operational), dipanggil dari
-- halaman "Kelola Pengguna" (/users). Lewat RPC (bukan UPDATE langsung ke
-- tabel profiles) supaya hak "ubah role siapa pun" tetap sempit -- cuma
-- kolom role yang bisa diubah, bukan seluruh baris profil orang lain.
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

  update public.profiles set role = new_role where id = target_id;
end;
$$;

-- Cabut dari public/anon (bukan Tim Operasional tidak akan lolos cek di
-- dalam fungsi, tapi dirapikan juga sesuai pola security advisor), izinkan
-- authenticated -- pengecekan role sesungguhnya tetap di dalam fungsi.
revoke execute on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;
