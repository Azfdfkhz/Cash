-- Telegram chat ID milik user, dipakai untuk kirim notifikasi status pengajuan.
alter table public.profiles
  add column if not exists telegram_chat_id text;
