-- Index tambahan untuk query yang sering jalan tanpa index pendukung:
--  - profiles(role)        : dicek berulang kali oleh RLS (exists ... p.role
--                            = 'operational') di setiap policy cash_advances
--                            & receipts, jadi ikut kena per baris yang dicek.
--  - cash_advances(created_at desc) : ORDER BY di dashboard & approvals.
--  - receipts(created_at desc)      : ORDER BY di halaman Laporan (fetch
--                            sampai 10.000 baris tanpa index sort sebelumnya).
--
-- CONCURRENTLY dipakai karena `create index` biasa mengambil lock ACCESS
-- EXCLUSIVE yang memblokir semua read/write ke tabel selama index dibangun --
-- di project yang sedang dipakai aktif (traffic tinggi = resource sudah
-- terkuras), itu bisa bikin build index-nya sendiri antre lama menunggu lock,
-- lalu membuat koneksi yang menjalankannya timeout (persis error yang muncul
-- saat migrasi ini dicoba lewat SQL Editor). CONCURRENTLY tidak mengambil
-- lock itu, jadi aplikasi tetap bisa jalan selama index dibangun.
--
-- PENTING: CREATE INDEX CONCURRENTLY tidak boleh berada dalam transaction
-- block. Jalankan TIGA statement di bawah ini SATU PER SATU (klik Run
-- terpisah untuk masing-masing) di SQL Editor -- jangan ditempel & dijalankan
-- sekaligus, dan jangan dibungkus begin/commit, karena beberapa statement
-- yang ditempel bersamaan otomatis dijalankan Postgres dalam satu transaksi
-- implisit walau tanpa begin/commit eksplisit.
create index concurrently if not exists idx_profiles_role on public.profiles(role);
create index concurrently if not exists idx_cash_advances_created_at on public.cash_advances(created_at desc);
create index concurrently if not exists idx_receipts_created_at on public.receipts(created_at desc);
