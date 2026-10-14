export const PAGE_SIZE = 20;

// Batas aman jumlah baris yang diambil sekaligus untuk halaman yang butuh
// seluruh data (cari + export CSV + total), mis. Laporan.
export const MAX_FETCH_ROWS = 10000;
const FETCH_CHUNK = 1000;

// Baca nomor halaman (1-indexed) dari searchParams yang sudah di-await.
export function getPage(searchParams) {
  const raw = Number(searchParams?.page);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

// Rentang .range() Supabase untuk satu halaman.
export function pageRange(page, size = PAGE_SIZE) {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

// Ambil semua baris yang cocok dengan `buildQuery`, menembus plafon 1000 baris
// PostgREST dengan mengambil per potongan. Berhenti di MAX_FETCH_ROWS.
// `buildQuery` menerima {from, to} dan mengembalikan query Supabase.
export async function fetchAll(buildQuery, cap = MAX_FETCH_ROWS) {
  const all = [];
  for (let from = 0; from < cap; from += FETCH_CHUNK) {
    const to = Math.min(from + FETCH_CHUNK, cap) - 1;
    const { data, error } = await buildQuery({ from, to });
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < to - from + 1) break;
  }
  return all;
}
