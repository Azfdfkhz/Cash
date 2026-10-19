-- Supabase Security Advisor menandai fungsi-fungsi trigger (SECURITY
-- DEFINER) di bawah ini sebagai bisa dieksekusi publik lewat REST API
-- (/rest/v1/rpc/<nama_fungsi>), karena Postgres secara default memberi
-- grant EXECUTE ke PUBLIC untuk fungsi baru kecuali dicabut manual.
--
-- Fungsi-fungsi ini cuma dipakai sebagai trigger (returns trigger, butuh
-- konteks NEW/OLD) -- memanggilnya langsung lewat RPC akan gagal dengan
-- error Postgres sendiri ("trigger functions can only be called as
-- triggers"), jadi bukan celah aktif. Tapi tetap dicabut sesuai rekomendasi
-- Advisor supaya tidak muncul sebagai endpoint publik sama sekali. Ini
-- tidak memengaruhi trigger-nya sendiri -- Postgres memanggil fungsi
-- trigger lewat jalur internal, bukan lewat cek privilege EXECUTE yang
-- sama seperti panggilan RPC biasa.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.maybe_close_cash_advance() from public, anon, authenticated;
revoke execute on function public.maybe_close_cash_advance_reimbursement() from public, anon, authenticated;
revoke execute on function public.recompute_ca_total_spent() from public, anon, authenticated;
revoke execute on function public.recompute_ca_total_reimbursed_on_delete() from public, anon, authenticated;
