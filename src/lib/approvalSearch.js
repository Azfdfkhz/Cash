// Pencarian halaman Persetujuan (?q=). Dicocokkan ke: username / nama /
// email pemohon, keperluan, nomor pengajuan (mis. #CA-2026-A1B2), dan nominal.

export const MAX_QUERY_LENGTH = 100;

export function getApprovalQuery(searchParams) {
  const raw = Array.isArray(searchParams?.q) ? searchParams.q[0] : searchParams?.q;
  return String(raw ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

// Buang karakter yang punya arti di sintaks filter PostgREST (, ( ) * " \ %).
export function sanitizeForFilter(value) {
  return String(value).replace(/[,()*"\\%]/g, " ").replace(/\s+/g, " ").trim();
}

// Nomor pengajuan = "#CA-<tahun>-<4 hex awal id>". Pengguna boleh mengetik
// utuh, tanpa "#", atau hanya potongan hex-nya. Hasilnya rentang uuid, karena
// kolom uuid tidak bisa dicari dengan LIKE lewat PostgREST.
export function uuidRangeFromCode(query) {
  let s = String(query).trim().toLowerCase().replace(/^#/, "");
  s = s.replace(/^ca-?/, "").replace(/^\d{4}-/, "");
  const hex = s.replace(/-/g, "");
  if (!/^[0-9a-f]{3,32}$/.test(hex)) return null;
  const pad = (c) => (hex + c.repeat(32 - hex.length)).replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
    "$1-$2-$3-$4-$5"
  );
  return { from: pad("0"), to: pad("f") };
}

// Angka murni (boleh "Rp", titik, koma ribuan) -> nominal.
function amountFromQuery(query) {
  const digits = String(query).replace(/^rp\.?\s*/i, "").replace(/[.\s]/g, "").replace(/,/g, "");
  return /^\d{4,12}$/.test(digits) ? Number(digits) : null;
}

// Bangun string untuk `.or()` pada tabel cash_advances. `profileIds` = id
// pemohon yang username/nama/emailnya cocok (dicari terpisah).
export function buildApprovalOrFilter(query, profileIds = []) {
  const safe = sanitizeForFilter(query);
  if (!safe) return null;
  const parts = [`purpose.ilike.*${safe}*`];
  if (profileIds.length) parts.push(`requester_id.in.(${profileIds.join(",")})`);
  const range = uuidRangeFromCode(query);
  if (range) parts.push(`and(id.gte.${range.from},id.lte.${range.to})`);
  const amount = amountFromQuery(query);
  if (amount != null) parts.push(`amount_requested.eq.${amount}`);
  return parts.join(",");
}
