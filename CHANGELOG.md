# Changelog

## 1.3.2 v2
- Tombol **Lanjut** (Daftar), **Selesaikan pendaftaran**, dan **Saya sudah konfirmasi** kini setinggi tombol **Masuk**.
- **Gradient blur dihapus total** di semua halaman auth (Masuk, Daftar, Lengkapi data, Lupa/Reset sandi, layar sukses).
  Kartu kaca melayang tetap ada. Lingkaran centang di layar sukses kini warna solid tanpa cahaya.
- **Animasi aplikasi dibuat lebih halus dan ringan**: isi halaman memudar masuk (juga saat skeleton berganti ke isi),
  pop up & drawer memakai kurva yang lebih lembut, transisi hover/fokus 200 ms, garis tab bawah melebar, ikon tab aktif
  naik sedikit, titik radio memantul. Blur latar pop up dihapus agar tidak berat di HP. Tetap hanya transform/opacity.

## 1.3.2
### Pendaftaran dengan email
- **Layar "Konfirmasi email" yang jelas.** Setelah menekan Lanjut, pengguna melihat 3 langkah (buka email,
  klik tombol konfirmasi, kembali ke halaman ini) dan status "Menunggu konfirmasi".
- **Lanjut otomatis.** Begitu email dikonfirmasi (di HP, tab lain, atau perangkat lain), halaman langsung
  lanjut ke Langkah 2 tanpa perlu klik apa pun. Pemantauan jalan tiap 15 detik dan seketika saat pengguna
  kembali ke tab. Ada tombol **Saya sudah konfirmasi** untuk cek manual.
- **Kirim ulang email** (jeda 60 detik) dan **Ganti email** bila salah ketik. Tombol **Buka Gmail/Outlook/Yahoo**
  muncul sesuai domain email.
- **Halaman Masuk**: bila email belum dikonfirmasi, pesannya kini jelas (bukan "password salah") dan ada
  tombol **Kirim ulang email konfirmasi**.
- Kata sandi hanya dipegang di memori halaman untuk pemantauan, tidak disimpan ke storage.

### Latar halaman buat akun
- Gradient blur (bola cahaya) dan grid **dihapus** di halaman Buat Akun, Lengkapi Data, dan layar suksesnya.
  Latar kembali polos navy; **kartu kaca melayang tetap ada** di panel kiri desktop. Halaman Masuk tidak berubah.

### Animasi lain
- Pindah menu: isi halaman naik pelan. Kartu pengajuan dan kartu ringkasan Beranda muncul berurutan dan
  terangkat saat disorot. Badge status muncul memantul. Notifikasi (toast) naik dari bawah.
- Semua tombol sedikit menekan saat ditekan; ikon menu samping bergeser halus saat disorot.
- Semua animasi hanya `transform`/`opacity`/`scale` dan statis untuk pengguna "kurangi gerakan".


## 1.3.1
### Pengajuan Cash Advance
- **Link RAB hanya disimpan jika valid.** Saat pengajuan dikirim, link yang tidak valid
  (belum diimport atau gagal diimport sebagai spreadsheet RAB) tidak ikut dimasukkan ke
  pengajuan (`rab_url` = kosong). Hanya link yang sudah berhasil diimport yang tersimpan.
- Di bawah kolom link kini tampil keterangan **"Link valid: spreadsheet RAB"** bila link
  lolos pemeriksaan, atau petunjuk untuk menekan **Import** bila belum diperiksa.
- Berlaku juga saat mengedit RAB di detail pengajuan. Link yang sudah tersimpan tetap
  dianggap valid; mengosongkan kolom link tetap menghapus link lama.
- Status verifikasi ikut tersimpan di draft.

### Animasi Login & Daftar
- **Latar bergerak**: bola cahaya biru yang melayang pelan + grid tipis di panel kiri desktop dan header mobile.
  Di layar lebar (≥1536px) ada kartu kaca melayang (Cash Advance, Kwitansi & SPJ, Persetujuan berjenjang, Terlacak real-time).
- **Animasi masuk berurutan**: logo turun, judul, tombol Google, lalu tiap kolom formulir muncul satu per satu.
  Panel kiri desktop: headline, deskripsi, lalu daftar centang muncul bergantian dengan ikon centang "memantul".
  Di mobile, lembar putih formulir naik dari bawah dan bilah langkah terisi dengan animasi.
- **Langkah pendaftaran (desktop)**: garis penghubung memanjang, lingkaran langkah aktif berdenyut.
- **Interaksi**: ikon kolom membesar & berwarna biru saat fokus, tombol terangkat dengan kilau melintas saat disentuh,
  panah "Lanjut" bergeser, tombol Google terangkat.
- **Memproses**: tombol menampilkan spinner dan kilau terus berjalan. Pesan galat masuk lalu bergetar sekali.
- **Layar sukses** setelah masuk, daftar, dan lengkapi data: centang tergambar, cincin berdenyut, percikan warna,
  bilah kemajuan (±1,3 detik) sebelum pindah halaman. Kartu "Cek email Anda" juga memakai centang beranimasi.
- Murni CSS (tanpa library baru), hanya `transform`/`opacity` agar mulus di HP. Pengguna dengan pengaturan
  "kurangi gerakan" mendapat tampilan statis dan jeda sukses hanya ±0,15 detik.

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

