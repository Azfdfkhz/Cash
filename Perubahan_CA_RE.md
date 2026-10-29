CashAdvance & Reimbursement

Perubahannya bukan cuma dari tampilan, tetapi juga dari fitur aplikasi, alur pengajuan, keamanan, laporan, dan database.

| 1. Perbaikan Dashboard dan UI |

- Menambahkan dan merapikan komponen navigasi, sidebar, header mobile, dan menu profil.
- Memperbaiki tampilan popup, notifikasi, status, dan loading.
- Menambahkan komponen untuk menampilkan tindakan yang perlu dilakukan pengguna.
- Menambahkan halaman Help Center, onboarding, dan product tour untuk membantu pengguna memahami aplikasi.
- Merapikan tampilan kwitansi, detail pengajuan, dan beberapa bagian laporan.
- Pengajuan yang pengembalian sisa dananya "menunggu konfirmasi" selalu tampil di paling atas daftar Beranda (urut dari pengembalian terbaru), baik untuk pemohon maupun Tim Operasional.
- Menambahkan tab "Perlu Konfirmasi" di Beranda Tim Operasional, di samping tab "Semua" dan "Belum Disetujui".

| 2. Perbaikan Form Pengajuan |

- Menambahkan fitur draft otomatis agar data yang sudah diisi tidak mudah hilang.
- Menambahkan peringatan ketika pengguna ingin meninggalkan halaman saat masih mengisi form.
- Menambahkan ringkasan validasi supaya pengguna lebih mudah mengetahui bagian yang perlu diperbaiki.
- Menambahkan popup ketika pengajuan berhasil.
- Memperbaiki proses penyelesaian profil setelah registrasi.
- Memperbaiki pengisian username dan rekening bank.

| 3. Perbaikan Persetujuan dan Pencairan Dana |

- Menambahkan komponen khusus untuk mengelola persetujuan.
- Menambahkan indikator pengajuan atau persetujuan yang masih menunggu.
- Memperbaiki navigasi dari detail pengajuan ke bagian pencairan dana.
- Menampilkan pesan yang lebih jelas jika bukti transfer belum dilampirkan.
- Memperbaiki tombol dan dialog konfirmasi untuk mengurangi kesalahan saat melakukan tindakan penting.

| 4. Perbaikan Pengembalian Dana dan Reimbursement |

- Memperbaiki tampilan dan proses pengembalian sisa dana.
- Merapikan informasi nominal, status, catatan, dan bukti transfer.
- Menambahkan konfirmasi dua langkah pada proses konfirmasi pengembalian.
- Memperbaiki form agar input tidak mudah ter-reset ketika data diperbarui.
- Memperbaiki tampilan loading saat bukti pengembalian dikirim, termasuk overlay "Mengirim bukti pengembalian..." yang sebelumnya tidak hilang setelah bukti berhasil terkirim.
- Menambahkan mekanisme mencoba kembali ketika pratinjau bukti transfer gagal dimuat.
- Menambahkan fitur "Buka Kembali Pengajuan" untuk pengajuan yang sudah selesai agar bisa ditinjau ulang, mengikuti perilaku reopen di cash-advance-app:
  - Tim Operasional menulis alasan (wajib) dan "memilih pengembalian mana" yang konfirmasinya dibatalkan. Pengembalian yang tidak dipilih tetap terkonfirmasi.
  - Hanya berlaku untuk Cash Advance; reimbursement tidak bisa dibuka kembali.
  - Tidak bisa dipakai pada pengajuan milik sendiri.
  - Pemohon mendapat banner di pengajuan dan notifikasi Telegram berisi alasan peninjauan ulang.

| 5. Perbaikan Laporan dan Ekspor Data |

- Menambahkan API dan fungsi untuk ekspor laporan.
- Menambahkan template RAB dalam format CSV dan Excel.
- Memperbaiki tampilan kwitansi dan tabel laporan.
- Memperluas statistik yang ditampilkan pada dashboard.
- Memperbaiki pengambilan data laporan kwitansi agar pencarian dan filter bisa dilakukan melalui database serta data ditampilkan per halaman.
- Saat pengajuan selesai, hanya laporan PDF yang disimpan ke Google Drive. File CSV "tidak lagi terunduh otomatis"; tombol "Unduh data (CSV)" tetap tersedia untuk unduh manual.

| 6. Perbaikan Keamanan dan Pengelolaan Data |

- Memperketat aturan akses profil dan perubahan role pengguna.
- Menambahkan validasi format dan keunikan username di database.
- Mencegah pengguna mengonfirmasi pengembalian dana miliknya sendiri.
- Menambahkan pemeriksaan agar bukti transfer pencairan yang sama tidak digunakan kembali pada pengajuan lain.
- Menambahkan dukungan pembaruan data melalui Supabase Realtime untuk tabel yang dibutuhkan aplikasi.
- Pembatasan domain email untuk registrasi "tidak dipakai": sempat disiapkan (migration 0031) lalu dihapus (migration 0039). Pendaftaran terbuka untuk domain email apa pun.

| 7. Perbandingan Migration Database |

File SQL pada folder utama `supabase/migrations` dari kedua versi dibandingkan.

Versi sebelumnya memiliki 25 file migration, sedangkan versi terbaru memiliki 39. Sebanyak 24 file pertama, yaitu migration `0001` sampai `0024`, memiliki isi yang sama persis. Perubahan yang membedakan kedua versi ada pada migration setelah `0024`.

| Migration 0001–0024 yang tetap dipertahankan |

- 0001_init.sql = struktur awal database.
- 0002_returns.sql = pengelolaan pengembalian sisa dana.
- 0003_no_self_approve.sql = mencegah pengguna menyetujui pengajuannya sendiri.
- 0004_bank_account.sql = pengelolaan rekening bank.
- 0005_telegram.sql = kebutuhan integrasi Telegram.
- 0006_reimbursements.sql = pengelolaan reimbursement.
- 0007_ca_funding_purpose_rab.sql = tujuan penggunaan dana dan RAB.
- 0008_profile_bank_account.sql = informasi rekening pada profil pengguna.
- 0009_dashboard_stats.sql = statistik dashboard.
- 0010_perf_indexes.sql = index untuk membantu kinerja database.
- 0011_balance_denormalization.sql = penyimpanan atau perhitungan saldo yang lebih efisien.
- 0012_revoke_trigger_function_execute.sql = pembatasan hak menjalankan fungsi trigger tertentu.
- 0013_set_user_role_rpc.sql = fungsi database untuk mengatur role pengguna.
- 0014_fund_usage_date.sql = tanggal penggunaan dana.
- 0015_rab_items.sql = rincian item RAB.
- 0016_reject_revise_resubmit.sql = alur penolakan, revisi, dan pengajuan ulang.
- 0017_lock_pending_for_requester.sql = membatasi perubahan pengajuan yang masih menunggu persetujuan.
- 0018_receipt_rab_item.sql = menghubungkan kwitansi dengan item RAB.
- 0019_receipt_outside_rab.sql = mendukung kwitansi di luar RAB.
- 0020_closed_at.sql = mencatat waktu pengajuan ditutup.
- 0021_report_drive.sql = penyimpanan informasi laporan di Google Drive.
- 0022_receipt_quantity_disbursement.sql = informasi kuantitas kwitansi dan pencairan.
- 0023_reimbursement.sql = perubahan database untuk mendukung reimbursement.
- 0024_receipt_lines.sql = rincian baris atau item pada kwitansi.

| Migration 0025 — Dashboard Stats Extended |

File: `0025_dashboard_stats_extended.sql`

Memperluas statistik dashboard dengan informasi:

- Jumlah pengajuan yang masih menunggu persetujuan.
- Total sisa saldo aktif.
- Jumlah Cash Advance yang sedang berjalan.
- Total pengembalian sisa dana.
- Jumlah Cash Advance yang belum memiliki kwitansi.

Perhitungan saldo aktif pada migration ini diperbaiki lagi pada migration 0028.

| Migration 0026 — Profile Onboarding |

File: `0026_profile_onboarding.sql`

- Kolom username pada profil pengguna.
- Kolom `profile_completed_at` untuk mencatat penyelesaian profil.
- Index unik username yang tidak membedakan huruf besar dan kecil.

Akun lama yang sudah ada ditandai sebagai akun dengan profil selesai agar tidak dipaksa mengisi ulang.

| Migration 0027 — Return Date |

File: `0027_return_date.sql`

Menambahkan kolom `return_date` pada tabel pengembalian sisa dana agar tanggal pengembalian bisa dicatat terpisah.

| Migration 0028 — Outstanding After Returns |

File: `0028_outstanding_after_returns.sql`

Memperbaiki perhitungan sisa saldo aktif. Sebelumnya saldo hanya dikurangi pengeluaran dari nominal pengajuan. Setelah diperbaiki, total pengembalian yang sudah dikonfirmasi juga ikut mengurangi sisa saldo aktif.

| Migration 0029 — Report Receipts Page |

File: `0029_report_receipts_page.sql`

Menambahkan fungsi `report_receipts` untuk mengambil data laporan kwitansi secara bertahap:

- Pencarian dan filter dilakukan melalui database.
- Data laporan ditampilkan per halaman.
- Jumlah kwitansi dan total nominal tetap tersedia untuk ringkasan.
- Index untuk membantu pengurutan dan filter tanggal kwitansi.

| Migration 0030 — Security Hardening |

File: `0030_security_hardening.sql`

- Membatasi akses untuk membaca data profil.
- Mencegah pengguna mengubah role sendiri melalui perubahan profil.
- Membatasi perubahan pada kolom sensitif pengajuan.
- Mencegah pembuatan pengembalian yang langsung dianggap terkonfirmasi tanpa verifikasi.
- Pembatasan permintaan untuk mengurangi risiko spam.
- Mencegah Tim Operasional menurunkan role dirinya sendiri.

| Migration 0031 — Signup Domain Policy (kemudian dihapus di 0039) |

File: `0031_signup_domain_policy.sql`

Menyiapkan mekanisme pembatasan domain email untuk registrasi (tabel `allowed_signup_domains`, trigger pada `auth.users`, dan Auth Hook). Mekanisme ini tidak pernah dipakai dan dihapus pada migration 0039.

| Migration 0032 — Realtime and Username Format |

File: `0032_realtime_and_username_format.sql`

- Mengaktifkan Supabase Realtime pada tabel-tabel yang dibutuhkan aplikasi.
- Memperbarui format dan validasi username di database.

| Migration 0033 — No Self Confirm Return |

File: `0033_no_self_confirm_return.sql`

Pengguna yang mengajukan Cash Advance tidak boleh mengonfirmasi pengembalian dananya sendiri sebagai Tim Operasional.

| Migration 0034 — Username Allow Uppercase |

File: `0034_username_allow_uppercase.sql`

Format username kini mengizinkan huruf besar. Keunikan username tetap tidak membedakan huruf besar dan kecil, jadi "Rina" dan "rina" dianggap sama.

| Migration 0035 — Disbursement Proof Dedup |

File: `0035_disbursement_proof_dedup.sql`

- Menyimpan hash SHA-256 dari file bukti transfer.
- Menyimpan perceptual hash untuk membantu mendeteksi gambar yang sama atau serupa.
- Memeriksa apakah bukti transfer sudah pernah digunakan pada pengajuan lain.
- Menolak bukti transfer yang terdeteksi digunakan kembali.

| Migration 0036 — Reopen Closed Cash Advance |

File: `0036_reopen_closed_cash_advance.sql`

Menambahkan fungsi pembukaan kembali pengajuan yang sudah ditutup:

- Mengubah status pengajuan dari `closed` menjadi `approved`.
- Menghapus referensi laporan penutupan dari database.
- Mencatat pembukaan kembali pada riwayat pengajuan.

Pada versi ini semua pengembalian terkonfirmasi dikembalikan ke menunggu konfirmasi dan total pengembalian di-nol-kan. Perilaku itu diganti di migration 0038.

Kwitansi, bukti transfer, dan RAB tidak dihapus oleh fungsi ini.

| Migration 0037 — Reopen Notify and Reports |

File: `0037_reopen_notify_and_reports.sql`

Melanjutkan fitur pembukaan kembali pengajuan dengan:

- `reopened_at` untuk mencatat waktu pembukaan kembali.
- `reopened_by` untuk mencatat pengguna yang membuka kembali pengajuan.
- `reopen_note` untuk menyimpan alasan peninjauan ulang.
- Validasi agar alasan pembukaan kembali diisi.
- Perubahan laporan kwitansi agar pengajuan yang sedang ditinjau ulang tidak ditampilkan sampai ditutup kembali.

| Migration 0038 — Reopen Selective Unconfirm |

File: `0038_reopen_selective_unconfirm.sql`

Menyamakan fungsi `reopen_cash_advance` dengan cash-advance-app (`0025_reopen_cash_advance.sql`). Parameter fungsi kini `(target_id, note, unconfirm_return_ids)`.

- Tim Operasional memilih pengembalian mana yang konfirmasinya dibatalkan. Yang tidak dipilih tetap terkonfirmasi.
- `total_returned` dihitung ulang dari pengembalian yang masih terkonfirmasi.
- Reopen ditolak jika saldo masih lunas setelah pembatalan, karena pengajuan tidak akan bisa selesai lagi lewat konfirmasi.
- Hanya Cash Advance yang bisa dibuka kembali, reimbursement tidak.
- Versi lama fungsi `(target_id, reason)` dihapus supaya tidak ada dua versi.
- Tetap dipertahankan khas Cash: `reopened_at/by/note`, alasan minimal 3 karakter, dan kwitansi disembunyikan dari Laporan selama ditinjau ulang.

| Migration 0039 — Remove Signup Domain Policy |

File: `0039_remove_signup_domain_policy.sql`

Menghapus mekanisme pembatasan domain dari migration 0031: trigger pada `auth.users`, fungsi pemeriksa, dan tabel `allowed_signup_domains`. Fungsi `hook_before_user_created` sengaja tidak dihapus, hanya dibuat selalu mengizinkan, supaya pendaftaran tidak gagal bila Auth Hook sempat diaktifkan di Dashboard Supabase. Hook itu boleh dimatikan di Dashboard setelah migration ini dijalankan. Akun yang sudah ada tidak terpengaruh.

| 8. Perubahan Nomor Migration Saat Penggabungan |

Pada versi sebelumnya, `0025_reopen_cash_advance.sql` digunakan untuk membuka kembali Cash Advance yang sudah selesai (perilaku yang kini dijadikan acuan).

Pada versi terbaru, fungsi tersebut berada pada `0036_reopen_closed_cash_advance.sql`, dilanjutkan `0037_reopen_notify_and_reports.sql`, lalu disamakan dengan versi cash-advance-app pada `0038_reopen_selective_unconfirm.sql`.

Nomor `0025` dan `0026` pada versi terbaru digunakan untuk statistik dashboard dan onboarding profil.

Perlu dibedakan antara perubahan nomor file dan penambahan fitur. Tidak semua migration dengan nomor baru berarti seluruh fungsinya baru dibuat dari nol.

| 9. Fitur yang Sudah Ada pada Versi Sebelumnya |

- Login dan registrasi.
- Role Requester dan Tim Operasional.
- Pengajuan dan persetujuan Cash Advance.
- Scan kwitansi menggunakan OCR.
- Upload bukti ke Google Drive.
- RAB dan perbandingan anggaran dengan realisasi.
- Pengembalian sisa dana dan reimbursement.
- Notifikasi Telegram.
- Laporan kwitansi dan ekspor CSV.
- Supabase sebagai database beserta pengaturan akses data.

Fitur-fitur tersebut bukan semuanya penambahan baru. Sebagian sudah ada sebelumnya dan kemudian diperbaiki atau dikembangkan lebih lanjut pada `Cash-main`.

| 10. Kesimpulan |

1. Perbaikan tampilan dan navigasi aplikasi, termasuk pengajuan menunggu konfirmasi di paling atas dan tab Perlu Konfirmasi.
2. Penyempurnaan form pengajuan dan penyimpanan draft.
3. Perbaikan alur persetujuan dan pencairan dana.
4. Penyempurnaan pengembalian sisa dana dan reimbursement.
5. Perbaikan laporan dan ekspor data (CSV tidak lagi terunduh otomatis saat selesai).
6. Penambahan Help Center dan panduan penggunaan.
7. Penguatan keamanan profil, role, dan transaksi.
8. Perbaikan statistik dashboard dan perhitungan sisa saldo.
9. Penambahan validasi username; pembatasan domain registrasi tidak dipakai.
10. Pemeriksaan penggunaan ulang bukti transfer.
11. Fitur Buka Kembali Pengajuan yang mengikuti cash-advance-app (pilih pengembalian yang dibatalkan, total pengembalian dihitung ulang, hanya Cash Advance).

| Yang perlu dijalankan di Supabase |

Jalankan secara berurutan di SQL Editor bila belum: `0036`, `0037`, `0038`, dan `0039`. Semuanya idempoten dan tidak menghapus data pengajuan.
