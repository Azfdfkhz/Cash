# Google Drive pribadi dengan OAuth 2.0

Project ini tetap kompatibel dengan konfigurasi Service Account lama, tetapi untuk Google Drive pribadi (`@gmail.com`) gunakan OAuth 2.0.

## 1. Buat OAuth Client

Di Google Cloud Console:

1. Pilih project Google Cloud yang digunakan aplikasi.
2. Aktifkan **Google Drive API**.
3. Buka **Google Auth Platform / Credentials**.
4. Buat **OAuth Client ID** dengan tipe **Desktop app**.
5. Download file JSON credential dan simpan sebagai:

```text
credentials.json
```

File tersebut harus berada di root project dan **tidak boleh di-commit ke GitHub**.

## 2. Siapkan folder Drive

Buat folder tujuan di Google Drive pribadi kamu. Salin ID folder dari URL:

```text
https://drive.google.com/drive/folders/ID_FOLDER
```

Isi di `.env.local`:

```env
GOOGLE_DRIVE_FOLDER_ID=ID_FOLDER
```

## 3. Ambil refresh token

Pastikan dependencies sudah terpasang:

```bash
npm install
```

Jalankan:

```bash
node scripts/google-drive-auth.mjs
```

Buka URL Google yang muncul di terminal, login dengan akun Gmail yang memiliki folder Drive tadi, lalu izinkan aplikasi.

Terminal akan menampilkan:

```env
GOOGLE_DRIVE_OAUTH_CLIENT_ID=...
GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=...
GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=...
```

Salin ketiganya ke `.env.local`.

## 4. Jalankan aplikasi

```bash
npm run dev
```

Saat upload gambar dilakukan, `src/lib/google/drive.js` akan memakai OAuth jika tiga variable OAuth tersedia.

## 5. Kompatibilitas anggota tim

Jika konfigurasi OAuth tidak tersedia, kode akan otomatis kembali memakai:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
```

Jadi perubahan ini tidak memaksa anggota tim mengubah metode Google mereka.

## Keamanan

Jangan commit file atau nilai berikut:

- `credentials.json`
- `.env.local`
- `GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN`
- `GOOGLE_DRIVE_OAUTH_CLIENT_SECRET`
- `GOOGLE_PRIVATE_KEY`

`.gitignore` project sudah melindungi file-file tersebut.
