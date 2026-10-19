# Catatan penggabungan (PenambahanFitur + UpdateUI)

- Dasar: PenambahanFitur. Tampilan baru dari UpdateUI dipindahkan file per file.
- Migrasi UpdateUI dinomori ulang: 0015 -> 0025, 0016 -> 0026 (jalankan setelah 0024).
  0025 diubah agar saldo/CA aktif hanya menghitung kind = 'cash_advance'.
- Perbaikan: /register/complete-profile kini mengisi username dan profile_completed_at
  (sebelumnya akun baru terus diarahkan kembali ke halaman itu); bank dan atas nama disimpan terpisah.
- Logout memakai dialog konfirmasi (dari versi fitur).
- Branding memakai logo/nama UI ("CashAdvance"); metadata tab tetap "SharingHappiness".
- Belum diuji build (npm install / next build) dan belum dicek visual.
- google-service-account.json TIDAK disertakan. Rotasi key jika pernah ter-commit/terkirim.
