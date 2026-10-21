# Audit & Perbaikan — Realtime, Konsistensi Data, Akun

Laporan hasil audit atas 3 permintaan (A. Auto-refresh, B. Konsistensi data, C. Username),
beserta perbaikan yang sudah diterapkan ke kode.

## A. Auto-refresh Tim Operasional — Sudah terpenuhi, tidak ada perubahan kode

Infrastruktur realtime sudah ada dan memenuhi semua kriteria:

- **`src/lib/useRealtimeRefresh.js`** — hook inti: subscribe `postgres_changes` Supabase
  Realtime per tabel, debounce 400ms sebelum `router.refresh()` (Server Component di-refresh,
  jadi tabel/badge/jumlah/detail ikut update tanpa reload manual), backoff saat reconnect,
  pemulihan otomatis saat tab kembali visible/online/focus, dan `cleanup` penuh saat unmount
  (tidak ada subscription ganda/listener bocor).
- **`src/components/useApprovalBadge.js`** — polling 30 detik + saat visibility/focus untuk
  badge navigasi (elemen yang tidak ikut re-render saat pindah halaman), dengan de-dup
  request (`inflight`) dan cache singkat.
- Dipakai di keempat halaman utama (`RequesterDashboard.js`, `ReportsTable.js`, Persetujuan,
  Tim Operasional) dengan daftar tabel yang relevan masing-masing (`cash_advances`,
  `receipts`, `receipt_lines`, dll).
- Data yang mengalir tetap lewat Supabase client dengan sesi user yang login → RLS otomatis
  membatasi apa yang terlihat, jadi perubahan yang nyampe ke user juga sudah sesuai hak akses.

Migrasi `0032_realtime_and_username_format.sql` memastikan 7 tabel kunci sudah masuk publication
Realtime (`cash_advances`, `receipts`, `receipt_lines`, `cash_advance_returns`,
`cash_advance_reimbursements`, `cash_advance_events`, `rab_items`).

**Kesimpulan A: tidak perlu perubahan kode.**

## B. Konsistensi data — 2 gap ditemukan, keduanya sudah diperbaiki

Audit menyeluruh terhadap 4 halaman (Ajukan, Persetujuan, Laporan, Tim Operasional) + popup
detail menemukan bahwa mayoritas sudah konsisten by design:

- Status, label, dan "aksi berikutnya" berasal dari satu sumber: `src/lib/utils.js`
  (`STATUS_LABEL`, `STATUS_STYLE`, `nextAction()`, `hasPendingReturn()`) — dipakai di semua
  halaman, jadi tidak ada istilah/warna status yang berbeda antar halaman.
- Nominal (pengajuan, RAB, kwitansi, realisasi, sisa dana) dihitung dari satu sumber:
  **view `cash_advance_balances`** + RPC `cash_advance_dashboard_stats()`, bukan dihitung
  ulang berbeda-beda di tiap komponen.
- Pencegahan klik ganda sudah ada hampir di semua aksi finansial: `busyRef` guard di
  `ResubmitPanel.js`, `ReturnsSection.js` (submit/reimburse/close/confirm), state-guard di
  `ScanForm.js`, dan `if (loading) return;` di halaman pengajuan baru.
- Loading/error/kosong ditangani lewat skeleton component (`ListSkeletons.js`) dan pesan error
  per aksi; perubahan oleh user lain tertangkap lewat Realtime + `router.refresh()`.
- `isOwner`/role-gating sudah konsisten dipakai untuk membatasi siapa boleh apa
  (`canModifyReceipts`, `canEditRab`, tombol Setujui/Cairkan).

**Gap #1 (diperbaiki) — Ops bisa konfirmasi pengembalian atas pengajuannya sendiri.**
Aturan "tidak boleh menyetujui/mengonfirmasi milik sendiri" sudah berlaku untuk
persetujuan & pencairan (`ApprovalsWorkspace.js` + migrasi `0003_no_self_approve.sql`), tapi
belum untuk konfirmasi pengembalian sisa saldo (`ReturnsSection.js` → `handleConfirm`, dan
policy `returns_confirm` di DB). Ini sudah ditandai di `PRODUCTION_CHECKLIST.md` tapi belum
ada kodenya. **Sudah diperbaiki:**
- Frontend: tombol "Konfirmasi" disembunyikan untuk pemilik pengajuan (ditambah guard
  `if (isOwner) return` di `handleConfirm`) — [ReturnsSection.js](src/components/ReturnsSection.js).
- Database: policy baru `returns_confirm` menolak `ca.requester_id = auth.uid()` —
  [0033_no_self_confirm_return.sql](src/lib/supabase/migrations/0033_no_self_confirm_return.sql),
  sudah disalin juga ke `supabase/migrations/`.

**Gap #2 (diperbaiki) — Folder migrasi `supabase/migrations/` tidak lengkap.**
README dan PRODUCTION_CHECKLIST mengarahkan setup ke `supabase/migrations/`, tapi folder itu
sebelumnya tidak punya `0030_security_hardening.sql` dan `0031_signup_domain_policy.sql`
(hanya ada di `src/lib/supabase/migrations/`). Kalau diikuti sesuai dokumentasi, hardening
keamanan (role escalation, rekening bank publik, dsb.) dan kebijakan domain signup tidak
pernah tereksekusi. **Sudah diperbaiki:** kedua file disalin ke `supabase/migrations/`,
beserta migrasi baru `0033`. Kedua folder sekarang identik (kecuali dua file lama yang sudah
sengaja dinomori ulang: `0015/0016` → `0025/0026`, itu bukan gap).

`PRODUCTION_CHECKLIST.md` dan `CHANGELOG.md` sudah diupdate sesuai perbaikan ini.

## C. Username dapat diganti — Sudah terpenuhi, tidak ada perubahan kode

`src/components/ProfileForm.js` sudah mengimplementasikan semuanya sesuai spesifikasi:

- Field "Username" terpisah total dari "Nama Lengkap" (nama lengkap ditampilkan read-only,
  **tidak** disinkronkan ke username — sesuai klarifikasi Anda).
- Validasi: 3–30 karakter, hanya `a-z0-9_.`, disanitasi otomatis saat mengetik; juga ada
  constraint cek yang sama di DB (`chk_profiles_username_format`, migrasi 0032) sebagai
  lapis kedua.
- Keunikan dijaga oleh unique index `idx_profiles_username_lower` (case-insensitive) +
  penanganan error Postgres `23505` → pesan "Username sudah dipakai. Coba username lain."
- Simpan hanya menyentuh kolom `username` di tabel `profiles`
  (`.update({ username, ... }).eq("id", profileId)`) — email, ID, role, dan relasi
  pengajuan (`requester_id`, dst.) tidak tersentuh.
- Policy `profiles_update_own` (migrasi 0030) membatasi user hanya bisa update kolom
  tertentu pada profilnya sendiri (tidak termasuk email/id/role) — jadi aturan ini juga
  ditegakkan di level DB, bukan hanya di frontend.

**Kesimpulan C: tidak perlu perubahan kode.**

## Ringkasan perubahan kode

| File | Perubahan |
|---|---|
| `src/components/ReturnsSection.js` | Tombol konfirmasi disembunyikan dari pemilik pengajuan + guard di `handleConfirm` |
| `src/lib/supabase/migrations/0033_no_self_confirm_return.sql` | Policy `returns_confirm` baru (menolak self-confirm) — file baru |
| `supabase/migrations/0030_security_hardening.sql`, `0031_signup_domain_policy.sql`, `0033_no_self_confirm_return.sql` | Disalin dari `src/lib/supabase/migrations/` agar kedua folder sinkron |
| `PRODUCTION_CHECKLIST.md` | Catat migrasi 0030–0033 sebagai wajib dijalankan; pindahkan gap self-confirm ke bagian "sudah diperbaiki" |
| `CHANGELOG.md` | Entri "Unreleased" untuk kedua perbaikan |

### Langkah lanjutan yang perlu dilakukan manual
Jalankan migrasi `0033_no_self_confirm_return.sql` (dan pastikan `0030`/`0031` juga sudah
dijalankan) di SQL Editor Supabase project produksi Anda — perubahan kode saja tidak
mengubah database yang sudah berjalan.
