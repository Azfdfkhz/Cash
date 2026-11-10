# Changelog

## 1.3.0
### Pendaftaran Akun & Onboarding
- **Hapus kolom username** dari formulir "Langkah 2 — Lengkapi Data Anda".
  Username kini diambil otomatis dari bagian email sebelum `@`
  (karakter yang tidak diizinkan dibuang; min 3, maks 30 karakter).
  Jika username sudah dipakai oleh pengguna lain, 4 digit acak ditambahkan
  secara otomatis — pengguna tidak perlu melakukan apa pun.
- **Pemicu Tur Aplikasi untuk Akun Baru**: Tur pengenalan aplikasi kini langsung dimulai seketika pengguna selesai melengkapi profil dan masuk ke Beranda untuk pertama kali, tanpa perlu logout dan login ulang.
- Migrasi database `0041_auto_username_from_email.sql`: backfill username
  untuk pengguna lama yang belum mengisi username, menggunakan logika yang sama.

### UI & UX
- **Favicon & Logo Tab Browser**: Mengganti favicon browser dan shortcut web app dengan logo resmi Sharing Happiness Mark (`/brand/sh-mark.png`).
- **Edit Profil**: Dialog peringatan perubahan belum disimpan (*leave guard*) dengan daftar data yang diubah dan tombol aksi Simpan langsung dari popup.
- **Filter Beranda**: Indikator skeleton memuat data saat mengklik tab filter status (*Semua*, *Belum Disetujui*, *Perlu Konfirmasi*).
- **Skeleton Laporan**: Memperbaiki tampilan load skeleton halaman Laporan agar selaras presisi dengan struktur tabel dan pratinjau desktop.
- **Glosarium Istilah**: Definisi istilah *miliar* disesuaikan dengan standar KBBI formal.

## 1.2.9
### Profil
- Halaman **Edit profil** kini menjelaskan data apa saja yang bisa diubah (username, bank, nomor rekening,
  atas nama rekening, Telegram Chat ID) dan yang tidak bisa (email, peran, riwayat pengajuan).
  Baris email diberi label **Tidak bisa diubah**.

### Pencairan
- Setelah bukti transfer dipilih, layar otomatis menggulung ke tombol **Konfirmasi Pencairan**
  (juga saat bukti dikirim dari tombol **Cairkan Sekarang**), disertai pengingat singkat agar tidak terlewat.

### Kembalikan Sisa
- Menekan **Salin** (atau mengetuk kartu rekening) otomatis memilih rekening perusahaan tujuan transfer.
  Pengiriman wajib memilih rekening; pilihan tersimpan bersama pengembalian (migrasi `0040`).
- Detail **Pengembalian Sisa Saldo** untuk Tim Operasional kini memberi tahu bahwa requester mentransfer ke
  rekening tertentu (bank, nomor, atas nama) dan teks konfirmasi menyebut rekening yang harus dicek mutasinya.
- UI formulir dirapikan: langkah bernomor 1-5, rekening berupa kartu pilihan besar dengan tanda **Dipilih**.
- Database lama tanpa migrasi 0040 tetap jalan: rekening tujuan dicatat di awal catatan.

### Konfirmasi
- Pencairan, pengembalian, penggantian, dan konfirmasi pengembalian dibatasi **15 detik**. Bila belum terkirim,
  proses dihentikan dan muncul pesan untuk klik ulang. Klik ulang aman: tidak tercatat dobel.

## 1.2.6
### Pencairan
- Setelah menyetujui lalu memilih **Nanti**, tombol **Lihat Detail** (di dialog maupun footer panel) langsung membuka
  detail dan menggulung ke bagian **Cairkan Dana**. Gulir otomatis hanya sekali (tidak melompat saat data dimuat ulang).
- Tombol konfirmasi pencairan tidak lagi mati diam-diam saat bukti belum dilampirkan: kotak unggah ditandai merah,
  tampil pesan "Bukti transfer belum dilampirkan", dan layar menggulung ke kotak unggah.

### Kembalikan Sisa
- Perbaikan formulir yang kembali kosong beberapa detik sebelum "berhasil" muncul: pop up tidak lagi memuat ulang
  formulir saat data di-refresh, dan selama pengiriman tampil lapisan loading "Mengirim bukti pengembalian..."
  (pop up tidak bisa ditutup di tengah proses).
- Bukti belum dilampirkan: pesan tampil di bawah kotak unggah dan di atas tombol Kirim (sebelumnya tersembunyi
  di atas formulir). Berlaku juga untuk bukti penggantian.
- UI konfirmasi pengembalian dirombak: kartu per pengembalian (nominal, status, catatan, bukti), konfirmasi dua langkah
  ("Ya, dana sudah diterima") dan pembatalan dengan konfirmasi, serta pesan berhasil.

### Kwitansi
- Tampilan kartu kwitansi dirapikan: thumbnail, vendor, nominal, rincian pos, dan tombol aksi.

### Bukti TF
- Pratinjau bukti: unduhan dibagi (cache) antara thumbnail dan layar penuh, otomatis diulang sekali bila gagal,
  pesan error lebih jelas, tombol **Coba lagi**, dan gambar tidak lagi putus karena object URL dicabut terlalu dini.

