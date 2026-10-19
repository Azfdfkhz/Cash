// Konvensi nama file & folder Drive untuk dokumen pengajuan. Prefix
// mengikuti jenis: CA- (Cash Advance) atau RB- (Reimbursement).
//   Folder : "CA-1a2b3c4d 2026-09-18 Event Padhang Bulan"
//   File   : "CA-1a2b3c4d_KWITANSI_20260919_Zaeni-Ramdan_Whoosh_130921.jpg"
//            (jenis: PENCAIRAN, KWITANSI, PENGEMBALIAN, PENGGANTIAN, LAPORAN)

// Penanda jenis dokumen. `kind` dari client dibatasi ke daftar ini supaya
// nama file tetap konsisten.
export const KIND_TAG = {
  kwitansi: "KWITANSI",
  "bukti-pengembalian": "PENGEMBALIAN",
  "bukti-penggantian": "PENGGANTIAN",
  "bukti-pencairan": "PENCAIRAN",
  laporan: "LAPORAN",
};

// Potongan aman untuk nama file Drive: buang aksen, ganti karakter
// non-alfanumerik dengan "-", batasi panjangnya.
export function slugForFilename(name) {
  const slug = String(name || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || "tanpa-nama";
}

// Tanggal & jam saat ini (WIB) -> { date: "20260919", time: "130921" }.
export function jakartaStamp(at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}${parts.month}${parts.day}`,
    time: `${parts.hour}${parts.minute}${parts.second}`,
  };
}

function kindPrefix(ca) {
  return ca.kind === "reimbursement" ? "RB" : "CA";
}

// `ca` butuh: purpose, created_at, profiles.full_name, kind.
export function caDriveFolder(cashAdvanceId, ca) {
  const shortId = cashAdvanceId.slice(0, 8);
  const datePrefix = ca.created_at?.slice(0, 10) || "";
  return {
    folderName: `${kindPrefix(ca)}-${shortId} ${datePrefix} ${ca.purpose}`.trim().slice(0, 120),
    // Format lama, tetap dipakai kalau foldernya sudah ada.
    legacyFolderNames: [
      `${datePrefix} ${ca.purpose} (${shortId})`.trim().slice(0, 120),
    ],
  };
}

export function caDriveFilename(cashAdvanceId, ca, { kind, label, ext }) {
  const { date, time } = jakartaStamp();
  return [
    `${kindPrefix(ca)}-${cashAdvanceId.slice(0, 8)}`,
    KIND_TAG[kind] ?? "LAMPIRAN",
    date,
    slugForFilename(ca.profiles?.full_name),
    label ? slugForFilename(label) : null,
    time,
  ]
    .filter(Boolean)
    .join("_")
    .concat(`.${ext}`);
}
