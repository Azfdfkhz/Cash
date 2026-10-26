# Changelog

## 1.2.5 v2
### Catat kwitansi
- Pop up **Catat Kwitansi** hanya menampilkan tombol **Simpan Kwitansi**. Tombol *Kembalikan Sisa* dan
  *Lihat Detail* dihapus dari pop up ini supaya tidak salah kaprah dengan menyimpan kwitansi.
- Pratinjau file sekarang di **kiri** (tetap terlihat saat form di-scroll), form di kanan; di layar sempit
  pratinjau di atas form.
- Tombol **Simpan Kwitansi** ada di footer pop up (tidak ikut ter-scroll, tidak menutupi kolom) dan
  **abu-abu** selama kolom wajib belum lengkap (file, nominal, pos RAB/kategori, volume, catatan bila
  diwajibkan). Alasan yang kurang tampil di atas tombol; menjadi gelap setelah lengkap.
- Tidak lagi mengulang: Sisa Saldo hanya di header pop up (tampil juga di mobile), tombol *Ganti File*
  hanya di pratinjau.

### Batalkan Selesai (tinjau ulang)
- Tombol **Batalkan Selesai** ada di footer panel tinjau, di sebelah **Tutup** dan **Lihat Detail**
  (hanya Tim Operasional, bukan pemilik pengajuan). Konfirmasi lewat dialog dengan alasan opsional.
- Laporan PDF di Drive dihapus; `report_drive_*` dan `closed_at` dikosongkan; status kembali `approved`;
  pengembalian terkonfirmasi menunggu konfirmasi lagi; `total_returned` dihitung ulang.
- Kwitansi, bukti transfer, dan RAB tidak dihapus. Dicatat di riwayat sebagai `reopened`.
- Migrasi `0036_reopen_closed_cash_advance.sql`, route `POST /api/cash-advances/[id]/reopen`,
  `deleteDriveFile()`, komponen `ReopenDialog`.

### Batalkan Selesai: info ke pemohon & Laporan
- **Catatan wajib** saat membatalkan Selesai (dialog + server + database), supaya pemohon tahu apa yang diperbaiki.
- Pemohon diberi tahu: notifikasi **Telegram** (bila terhubung) + **banner "Dibuka kembali untuk tinjau ulang"**
  berisi catatan Ops di panel tinjau dan detail pengajuan; kartu menampilkan langkah berikutnya.
- Kwitansi pengajuan yang sedang tinjau ulang **tidak muncul di halaman Laporan** (dan ekspor) sampai ditutup lagi;
  tanda tinjau ulang dihapus otomatis saat status kembali Selesai.
- Migrasi `0037_reopen_notify_and_reports.sql` (kolom `reopened_at/by`, `reopen_note`; memperbarui `reopen_cash_advance`
  dan `report_receipts`).

### Tampilan
- Kartu **Dana sudah dicairkan** didesain ulang: lencana status, tanggal, nominal besar, petugas pencairan,
  thumbnail bukti transfer, dan tombol lihat bukti. Rekening tidak diulang (sudah ada di Rekening Tujuan).
- Panel tinjau: tautan "Lihat Detail" di tengah teks dihapus (sudah ada tombolnya di footer).
- Bagian Laporan di detail tidak lagi punya tombol Batalkan Selesai (pindah ke footer panel tinjau).

## 1.2.2
### Ajukan
- Tanggal kebutuhan dana berformat Indonesia **dd/mm/yyyy** di semua browser (`DateInput`: ketik angka
  atau pilih dari kalender; tanggal tidak nyata seperti 31/02 ditolak). Dipakai juga di kolom tanggal
  kwitansi dan pengembalian. Nilai internal tetap ISO.
- Tombol **Kirim Pengajuan** abu-abu selama isian belum lengkap; kliknya menampilkan apa yang kurang.
- **Nomor rekening** bisa dilihat dengan password (alur sama seperti Profil), tertutup lagi setelah 30 detik.
  Logika dipisah ke `useAccountReveal` dan dipakai bersama `ProfileForm`.
- Form dibagi per bagian dengan dua kolom dan lebar teks dibatasi (`max-w-4xl`, `max-w-prose`),
  tidak lagi satu kolom panjang.

### Tampilan & aksesibilitas
- Poppins di-host sendiri (`src/app/fonts`), Inter dihapus, font dipaksa untuk semua kontrol formulir.
- Ukuran teks minimal: `text-xs` 12 px, `text-sm` 13 px. Semua `text-[8..12px]` menjadi `text-xs`.
- Kontras: abu-abu pudar menjadi slate-600; hijau/kuning/oranye/merah teks dinaikkan ke -700/-600.
- Kartu di dalam kartu diratakan (form Ajukan, RAB, panel detail & tinjau Persetujuan).
- Persetujuan: urutan heading h1 > h2 > h3 tidak lagi melompat.
- Zoom pengguna tidak lagi dikunci.

### Production
- Metadata `noindex`, halaman `not-found` dan `global-error`.
- Dibuang: `src/lib/supabase/.temp` (ref project) dan SVG bawaan Next.js yang tidak dipakai.

## 1.3.0
### Persetujuan
- Pencarian (`?q=`, ditunda 400 ms, desktop & mobile): username / nama / email pemohon,
  keperluan, nomor pengajuan (`#CA-2026-A1B2` atau potongannya), dan nominal. Dihitung di
  database (`lib/approvalSearch.js`); jumlah di tab ikut hasil pencarian.
- Kartu disederhanakan (`CashAdvanceCard compact`): label jenis, badge status, dan badge
  pengembalian dihapus karena sudah diwakili tab. Nomor pengajuan tampil di baris tanggal.
- Tombol **Lihat Detail** di setiap kartu (mobile membuka panel tinjau, desktop memilih
  pengajuan di panel kanan).
- Tab mobile: tinggi min. 44 px, label 14 px, `whitespace-nowrap` + `min-w-0`, badge angka
  tidak menyusut.
- Pemohon ditampilkan dengan **username** saja (fallback `full_name` untuk akun lama) lewat
  `requesterName()`.

### Laporan
- Mobile: **Lihat Kwitansi** membuka modal pratinjau (PDF & gambar), bukan tab baru. Modal
  punya tombol Unduh, Buka di Drive, dan Tutup; kondisi gagal muat menampilkan pesan + Unduh.
- Unduh memakai `/api/files/<id>?download=1`: berkas ASLI dari Drive, dengan pemeriksaan akses
  (RLS) yang sama seperti pratinjau, dan `Content-Disposition: attachment`. Tombol Unduh desktop
  juga dialihkan ke rute ini (sebelumnya tautan Drive langsung).

### Ajukan
- Tombol **Template RAB Excel (.xlsx)** dan **Template RAB CSV (.csv)** di bagian RAB
  (`public/templates/`). Kolom: No, Uraian, Jumlah, Satuan, Frekuensi, Harga Satuan, Total;
  berisi 3 baris contoh + petunjuk. Sudah diuji lewat `parseRabCsv` (CSV langsung, dan xlsx
  setelah diekspor ke CSV).

### Pusat Bantuan
- Isi dipilih di SERVER (`getHelpContent(role)`): requester dan halaman publik `/bantuan` tidak
  menerima panduan Tim Operasional sama sekali; tab peran hanya muncul untuk
  `role === 'operational'`.
- Topik: Pengajuan, RAB, Kwitansi, Persetujuan, Pencairan, Laporan (khusus operasional),
  Pengembalian Sisa. `tests/help.test.mjs` diperbarui (termasuk uji tidak ada kebocoran).

## 1.2.0
### Tipografi & keterbacaan
- Teks minimal 11 px di semua layar. Penyebab teks 10,5 px: `text-xs` berbasis rem sementara
  root desktop 14 px; sekarang `--text-xs: max(0.75rem, 11px)` (globals.css). Semua `text-[10px]`,
  `text-[9px]`, dan `text-[8.5px]` dinaikkan ke 11 px.
- Kontras: `text-slate-400` (2,6:1) diganti `text-slate-500` (4,8:1) untuk teks dan placeholder
  di latar terang (panel gelap halaman masuk tidak diubah). Pusat Bantuan memakai slate-600/700.
- Pusat Bantuan & Glosarium: setiap paragraf/unit penjelasan maksimal 80 karakter (bukan ukuran
  font). Isi dipecah jadi poin (`common`, `details`, langkah per peran) dan dijaga oleh
  `tests/help.test.mjs`. Teks panduan per topik memakai `text-base`.
- Hapus card di dalam card: kotak tenggat LPJ, baris file bukti pengembalian, kotak rekening
  pencairan, ikon spreadsheet, dan form Catat Kwitansi di dalam pop up.
- Identitas desain CashGue (warna, bentuk, hierarki) tidak diubah.

### Modal & alur tindakan
- State modal terpusat: `lib/modalState.js` + `lib/useModalState.js`. Hanya SATU modal aktif
  (detail, catat kwitansi, kembalikan sisa, konfirmasi keputusan); membuka yang baru otomatis
  menggantikan yang lama, menggantikan boolean `detailOpen/scanOpen/returnOpen/result` terpisah
  di `CashAdvanceReviewModal`, `ApprovalsWorkspace`, dan `CashAdvanceDetailPopup`.
- Catat kwitansi punya tombol Kembalikan Sisa dan Lihat Detail (konfirmasi bila ada isian
  belum tersimpan). Dialog persetujuan punya tombol Lihat Detail. Menutup Detail kembali ke
  halaman sebelumnya tanpa membuka modal lain.
- Escape menutup modal teratas saja (sebelumnya menutup seluruh panel tinjau).
- Hasil aksi tampil jelas: `ActionToast` (berhasil/gagal) dan pesan galat berperan `alert`.
- Tes baru: `tests/modal.test.mjs`.

### Perbaikan
- **DB (0033)**: Tim Operasional tidak bisa lagi mengonfirmasi pengembalian sisa saldo atas
  pengajuannya sendiri (policy `returns_confirm`), menyamakan aturan dengan
  persetujuan/pencairan (`0003_no_self_approve.sql`). Tombol "Konfirmasi" di `ReturnsSection`
  juga disembunyikan untuk pemilik pengajuan, dengan guard tambahan di `handleConfirm`.
- Folder `supabase/migrations/` disamakan dengan `src/lib/supabase/migrations/` (sebelumnya
  hilang `0030_security_hardening.sql` dan `0031_signup_domain_policy.sql`), supaya setup
  mengikuti README/PRODUCTION_CHECKLIST benar-benar menjalankan semua hardening keamanan.

### Fitur
- **Tur interaktif (Product Tour)**: menggantikan panduan modal lama. Tur menyorot elemen UI
  nyata (atribut `data-tour`), meredupkan sisa halaman, menampilkan tooltip dengan progres
  "Langkah n dari N", dan berpindah halaman otomatis. Requester: Beranda, Ajukan (Cash
  Advance + kwitansi Reimbursement), Profil. Operasional: Beranda, Persetujuan/Pencairan,
  Laporan, Profil (termasuk Kelola Pengguna).
- Muncul sekali setelah login pertama (Mulai Tur / Lewati); status belum mulai / berlangsung /
  selesai / dilewati disimpan di `user_metadata.tour` (tanpa migrasi DB, tanpa localStorage).
  Tur yang terhenti ditawarkan lanjut. Ulang lewat Pusat Bantuan atau Profil > Panduan interaktif.
  Pengguna yang sudah melihat panduan lama tidak dipaksa menonton ulang.
- Tur tidak pernah mengklik tombol atas nama pengguna: sorotan hanya bisa diklik pada langkah
  pengisian formulir, tombol Kirim/Setujui/Tolak tidak pernah dijalankan; tur jeda saat ada pop up
  aplikasi, mendukung keyboard (Esc, panah, Tab terkunci), dan `prefers-reduced-motion`.

## 1.1.6
### Keamanan
- **DB (0030)**: `profiles` tidak bisa lagi diubah kolom `role`/`email` oleh user (eskalasi
  jadi Operasional) dan tidak bisa dibaca anonim; grant kolom pada `cash_advances` &
  `cash_advance_returns`; requester tidak bisa "mengonfirmasi" pengembaliannya sendiri; Ops
  tidak bisa menurunkan dirinya sendiri; batas panjang teks & jumlah baris; maks 20 pengajuan
  menunggu / 40 per hari per akun; `anon` dicabut dari semua tabel.
- Open redirect pada `?next=` (login & `/auth/callback`) ditutup.
- Upload Drive: validasi isi file (JPG/PNG/WebP/HEIC/PDF), maks 8 MB, batas piksel, UUID wajib.
- OCR: batas ukuran, validasi format, rate limit (biaya Google Vision).
- Rate limit per user (di DB, lintas instance serverless): OCR, upload, tampil file, import
  RAB, laporan PDF/CSV, dan semua notifikasi Telegram (+ batas per pengajuan).
- CSV injection pada ekspor laporan dinetralkan.
- Header keamanan: CSP, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy.
- Timeout pada Telegram & fetch spreadsheet; ukuran CSV impor dibatasi.
- File kredensial & folder migrasi usang dihapus dari paket.
### Performa
- Middleware & `getUserProfile` memakai `getClaims()` (verifikasi JWT lokal): satu
  round-trip jaringan lebih sedikit tiap navigasi. Halaman Profil memuat paralel.
### UI
- Skeleton saat pindah tab Persetujuan/Pencairan, filter Semua/Menunggu, paginasi, filter
  jenis (termasuk tabel desktop), Laporan, dan isi pop up detail. Placeholder bottom-nav.
