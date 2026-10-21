// Aturan tunggal untuk pop up: SATU modal aktif pada satu waktu.
//
// State-nya satu nilai -- `null` (tidak ada modal) atau `{ name, ...params }` --
// bukan beberapa boolean terpisah (detailOpen, scanOpen, returnOpen, ...). Dengan
// bentuk ini, membuka modal baru otomatis menggantikan modal yang sedang aktif,
// jadi dua modal tidak mungkin tampil bersamaan walau ada tombol yang lupa
// menutup modal lain. Murni (tanpa React) supaya bisa diuji langsung.

export const MODAL = {
  DETAIL: "detail", // detail lengkap pengajuan
  SCAN: "scan", // catat kwitansi
  RETURN: "return", // kembalikan sisa saldo
  DECISION: "decision", // konfirmasi hasil setuju/tolak
};

// Membuka `name` menggantikan modal apa pun yang sedang aktif.
export function openModal(_current, name, params = {}) {
  return { ...params, name };
}

// Menutup modal aktif. Bila `name` diberikan, hanya menutup kalau modal itu
// memang yang aktif -- callback penutup yang terlambat (mis. dari modal yang
// baru saja digantikan) tidak boleh menutup modal baru.
export function closeModal(current, name) {
  if (!current) return null;
  if (name && current.name !== name) return current;
  return null;
}

export function isModalOpen(current, name) {
  return !!current && current.name === name;
}
