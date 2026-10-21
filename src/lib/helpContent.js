// Konten Pusat Bantuan & onboarding. Murni data (tanpa JSX) supaya mudah
// diubah tanpa menyentuh komponen dan bisa dipakai di halaman publik maupun
// di dalam aplikasi. Isi hanya MENJELASKAN alur yang sudah berlaku di aplikasi;
// tidak mendefinisikan aturan bisnis baru.

export const HELP_ROLES = [
  { id: "requester", label: "Requester", hint: "Mengajukan dan melaporkan dana" },
  { id: "operational", label: "Tim Operasional", hint: "Menyetujui, mencairkan, memverifikasi" },
];

export function normalizeHelpRole(role) {
  return role === "operational" ? "operational" : "requester";
}

// Peran yang boleh MELIHAT panduan: requester hanya panduan requester; hanya
// role === "operational" yang juga mendapat panduan Tim Operasional.
export function helpRolesFor(role) {
  return normalizeHelpRole(role) === "operational"
    ? ["requester", "operational"]
    : ["requester"];
}

// Ringkasan alur per peran (dipakai di Pusat Bantuan).
// Standar keterbacaan v1.2.0: setiap kalimat penjelasan maksimal 80 karakter
// (dijaga oleh tests/help.test.mjs). Penjelasan panjang dipecah jadi poin.
export const HELP_MAX_CHARS = 80;

export const ROLE_FLOW = {
  requester: [
    {
      title: "Ajukan dana",
      body: "Pilih Ajukan, lalu Cash Advance atau Reimbursement. Isi data dan kirim.",
    },
    {
      title: "Tunggu persetujuan",
      body: "Tim Operasional meninjau. Jika ditolak, baca catatan lalu ajukan ulang.",
    },
    {
      title: "Terima dana",
      body: "Dana ditransfer ke rekening Anda, lengkap dengan bukti transfer.",
    },
    {
      title: "Unggah bukti & kembalikan sisa",
      body: "Unggah kwitansi tiap pengeluaran dan kembalikan sisa dana bila ada.",
    },
  ],
  operational: [
    {
      title: "Tinjau pengajuan",
      body: "Periksa nominal dan dokumen. Penolakan wajib disertai catatan.",
    },
    {
      title: "Cairkan dana",
      body: "Transfer ke rekening requester, lalu unggah bukti transfer.",
    },
    {
      title: "Pantau bukti & SPJ",
      body: "Pantau kwitansi yang masuk dan sisa saldo tiap Cash Advance.",
    },
    {
      title: "Konfirmasi & tutup",
      body: "Konfirmasi pengembalian, catat penggantian, lalu unduh laporan.",
    },
  ],
};

// Topik panduan. `common` = satu kalimat inti untuk semua peran, `details` =
// poin tambahan untuk semua peran, `requester` / `operational` = langkah
// khusus peran tersebut. Semua teks maksimal 80 karakter.
// `audience` = peran yang boleh melihat topik. Topik khusus Tim Operasional
// (mis. Laporan) tidak pernah dikirim ke requester: pemilihan dilakukan di
// server lewat getHelpContent(), bukan disembunyikan di browser.
export const HELP_TOPICS = [
  {
    id: "pengajuan",
    title: "Pengajuan",
    summary: "Cash Advance atau Reimbursement lewat menu Ajukan.",
    audience: ["requester", "operational"],
    common: "Pengajuan dibuat lewat menu Ajukan.",
    details: [
      "Cash Advance: dana diberikan di muka, lalu dipertanggungjawabkan.",
      "Reimbursement: uang dibayar sendiri lebih dulu, lalu diganti.",
      "Draft tersimpan di perangkat dan bisa dilanjutkan nanti.",
    ],
    requester: [
      "Pilih Ajukan, lalu pilih Cash Advance atau Reimbursement.",
      "Isi keperluan, sumber dana, dan rekening tujuan.",
      "Cash Advance: lengkapi RAB. Nominal mengikuti total RAB.",
      "Reimbursement: tambahkan kwitansi. Total dihitung dari kwitansi.",
      "Centang pernyataan yang tampil, lalu kirim.",
      "Pantau status di Beranda. Kartu menunjukkan langkah berikutnya.",
    ],
    operational: [
      "Anda juga bisa mengajukan dana lewat menu Ajukan.",
      "Pengajuan milik sendiri tidak bisa Anda setujui atau cairkan.",
    ],
  },
  {
    id: "rab",
    title: "RAB",
    summary: "Rencana Anggaran Biaya untuk Cash Advance.",
    audience: ["requester", "operational"],
    common: "RAB berisi daftar rencana pengeluaran beserta nominalnya.",
    details: [
      "Kolom: No, Uraian, Jumlah, Satuan, Frekuensi, Harga Satuan, Total.",
      "Total = Jumlah x Frekuensi x Harga Satuan.",
    ],
    requester: [
      "Isi RAB di halaman Ajukan atau impor dari Google Spreadsheet.",
      "Tekan Gunakan Template RAB. Salinannya langsung ada di Drive Anda.",
      "Hapus baris contoh, isi baris Anda, dan jangan ubah nama kolom.",
      "Atur akses ke Siapa saja yang memiliki link, lalu salin linknya.",
      "Tempel link di halaman Ajukan, lalu tekan Import.",
    ],
    operational: [
      "Cocokkan total RAB dengan nominal sebelum menyetujui.",
      "Perbandingan RAB dan realisasi ada di detail pengajuan.",
    ],
  },
  {
    id: "kwitansi",
    title: "Kwitansi",
    summary: "Bukti pengeluaran dan cara mengunggahnya.",
    audience: ["requester", "operational"],
    common: "Kwitansi membuktikan dana dipakai sesuai tujuan.",
    details: [
      "Contohnya kwitansi, nota, dan struk.",
      "Berkas disimpan di Google Drive dan ditautkan ke pengajuan.",
      "Kwitansi dibandingkan dengan anggaran (RAB).",
    ],
    requester: [
      "Buka Cash Advance yang sudah cair, lalu pilih Catat kwitansi.",
      "Foto kwitansi atau pilih dari galeri.",
      "Nominal, vendor, dan tanggal dibaca otomatis.",
      "Periksa hasilnya dan perbaiki bila salah sebelum menyimpan.",
      "Tandai tiap kwitansi pada pos RAB yang sesuai.",
      "Tenggat unggah tampil di detail pengajuan (Tenggat LPJ / SPJ).",
      "Format: JPG, PNG, WebP, HEIC, atau PDF. Maksimal 8 MB.",
    ],
    operational: [
      "Periksa kwitansi yang masuk di detail pengajuan.",
      "Jika ada pos RAB belum ditandai, minta requester melengkapi.",
      "Semua kwitansi bisa dilihat dan diunduh di menu Laporan.",
    ],
  },
  {
    id: "persetujuan",
    title: "Persetujuan",
    summary: "Siapa yang memutuskan dan apa yang terjadi sesudahnya.",
    audience: ["requester", "operational"],
    common: "Setiap pengajuan ditinjau oleh Tim Operasional.",
    details: [
      "Status: Belum Disetujui, Disetujui, Ditolak, atau Selesai.",
      "Seseorang tidak dapat menyetujui pengajuannya sendiri.",
    ],
    requester: [
      "Pengajuan Belum Disetujui terkunci dan tidak bisa diedit.",
      "Jika Ditolak, buka pengajuan dan baca catatan penolakan.",
      "Perbaiki RAB atau kwitansi sesuai catatan, lalu Ajukan Ulang.",
    ],
    operational: [
      "Buka menu Persetujuan. Cari lewat username, nomor, atau keperluan.",
      "Tekan Lihat Detail untuk memeriksa nominal, RAB, dan pemohon.",
      "Setujui atau Tolak. Catatan wajib diisi saat menolak.",
      "Anda tidak dapat menyetujui pengajuan milik sendiri.",
    ],
  },
  {
    id: "pencairan",
    title: "Pencairan dana",
    summary: "Transfer dari Tim Operasional ke rekening requester.",
    audience: ["requester", "operational"],
    common: "Pencairan adalah transfer dana setelah pengajuan disetujui.",
    details: ["Bukti transfer diunggah sebagai catatan."],
    requester: [
      "Pastikan rekening di pengajuan sudah benar sebelum mengirim.",
      "Status menunggu pencairan sampai Tim Operasional mentransfer.",
      "Isi Telegram Chat ID di Profil untuk notifikasi dana cair.",
    ],
    operational: [
      "Buka tab Pencairan, lalu salin rekening dengan tombol Salin.",
      "Transfer lewat bank, lalu unggah bukti transfer.",
      "Pencairan hanya dicatat sekali dan bukan untuk pengajuan sendiri.",
    ],
  },
  {
    id: "laporan",
    title: "Laporan",
    summary: "Rekap kwitansi Cash Advance dan Reimbursement.",
    audience: ["operational"],
    common: "Laporan menampilkan seluruh kwitansi yang sudah masuk.",
    details: ["Hanya Tim Operasional yang dapat membuka halaman Laporan."],
    operational: [
      "Cari berdasarkan requester, vendor, keperluan, atau kategori.",
      "Saring dengan tanggal kwitansi dan tab jenis pengajuan.",
      "Ketuk Lihat Kwitansi untuk pratinjau, lalu Unduh bila perlu.",
      "Tombol CSV mengekspor hasil yang sedang ditampilkan.",
      "Laporan penutupan PDF diunduh dari detail pengajuan selesai.",
    ],
  },
  {
    id: "pengembalian",
    title: "Pengembalian Sisa",
    summary: "Dana yang tidak terpakai dikembalikan.",
    audience: ["requester", "operational"],
    common: "Sisa saldo adalah dana diterima dikurangi total kwitansi.",
    details: [
      "Sisa dikembalikan ke rekening organisasi.",
      "Pengajuan selesai setelah Tim Operasional mengonfirmasi.",
      "Reimbursement tidak punya pengembalian sisa saldo.",
    ],
    requester: [
      "Buka pengajuan, lihat sisa saldo, lalu transfer ke rekening tertera.",
      "Catat pengembalian: isi nominal dan unggah bukti (maks. 5 MB).",
      "Status Menunggu sampai diverifikasi. Bisa dibatalkan sebelum itu.",
    ],
    operational: [
      "Pastikan dana sudah masuk, lalu konfirmasi pengembalian.",
      "Sisa saldo nol: pengajuan bisa ditutup langsung.",
      "Pengeluaran melebihi dana: catat penggantian kekurangan.",
      "Setelah selesai, unduh laporan penutupan atau simpan ke Drive.",
    ],
  },
];

// Glosarium: bahasa sederhana, setiap penjelasan maksimal 80 karakter.
export const GLOSSARY = [
  { term: "Cash Advance (CA)", meaning: "Dana kegiatan diberikan di muka, lalu dipertanggungjawabkan." },
  { term: "Reimbursement", meaning: "Penggantian uang yang sudah Anda bayarkan sendiri." },
  { term: "RAB", meaning: "Rencana Anggaran Biaya: daftar rencana pengeluaran dan nominalnya." },
  { term: "Realisasi", meaning: "Pengeluaran yang benar-benar terjadi, dibuktikan kwitansi." },
  { term: "Kwitansi / bukti transaksi", meaning: "Nota, struk, atau tanda terima yang membuktikan pembayaran." },
  { term: "SPJ / LPJ", meaning: "Laporan pertanggungjawaban: cara dana dipakai, lengkap dengan bukti." },
  { term: "Pencairan", meaning: "Transfer dana ke rekening requester setelah disetujui." },
  { term: "Sisa saldo", meaning: "Dana diterima dikurangi total kwitansi. Jika positif, dikembalikan." },
  { term: "Pengembalian", meaning: "Transfer sisa dana tak terpakai ke rekening organisasi." },
  { term: "Konfirmasi", meaning: "Pemeriksaan Tim Operasional bahwa transfer benar-benar diterima." },
  { term: "Bukti transfer", meaning: "Tangkapan layar atau struk bank yang menunjukkan transfer berhasil." },
  { term: "Ajukan ulang", meaning: "Mengirim kembali pengajuan ditolak setelah diperbaiki." },
  { term: "Draft", meaning: "Pengajuan tersimpan di perangkat Anda yang belum dikirim." },
  { term: "Laporan penutupan", meaning: "PDF ringkasan pengajuan yang sudah selesai.", audience: ["operational"] },
  { term: "jt", meaning: "Singkatan juta. Rp 1,85 jt berarti sekitar Rp 1.850.000." },
  { term: "miliar", meaning: "Seribu juta. Rp 17 miliar berarti sekitar Rp 17.000.000.000." },
];

// Isi Pusat Bantuan yang BOLEH dilihat satu peran. Dipanggil di SERVER
// (page.js), lalu hasilnya dikirim ke komponen klien -- jadi panduan Tim
// Operasional tidak ikut terkirim ke browser requester (bukan sekadar
// disembunyikan di tampilan, dan tidak bisa dibuka lewat URL langsung).
export function getHelpContent(role) {
  const roles = helpRolesFor(role);
  const allowed = (audience) => !audience || audience.some((a) => roles.includes(a));
  return {
    roles: HELP_ROLES.filter((r) => roles.includes(r.id)),
    defaultRole: normalizeHelpRole(role),
    flow: Object.fromEntries(roles.map((r) => [r, ROLE_FLOW[r]])),
    topics: HELP_TOPICS.filter((t) => allowed(t.audience)).map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary,
      common: t.common,
      details: t.details ?? [],
      steps: Object.fromEntries(roles.filter((r) => t[r]?.length).map((r) => [r, t[r]])),
    })),
    glossary: GLOSSARY.filter((g) => allowed(g.audience)).map(({ term, meaning }) => ({ term, meaning })),
  };
}
