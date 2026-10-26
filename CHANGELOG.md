# Changelog

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

