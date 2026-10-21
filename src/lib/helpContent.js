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
export const HELP_TOPICS = [
  {
    id: "alur-cash-advance",
    title: "Alur Cash Advance",
    summary: "Dana diberikan di muka, dipertanggungjawabkan sesudahnya.",
    common: "Cash Advance adalah dana kegiatan yang diberikan lebih dulu.",
    details: [
      "Alur: ajukan, disetujui, dicairkan, unggah kwitansi, selesai.",
      "Sisa dana yang tidak terpakai dikembalikan sebelum pengajuan selesai.",
    ],
    requester: [
      "Pilih Ajukan, lalu pilih Cash Advance.",
      "Isi keperluan, sumber dana, rekening tujuan, dan RAB.",
      "Nominal pengajuan mengikuti total RAB.",
      "Centang kebijakan SPJ, lalu kirim. Draft bisa dilanjutkan nanti.",
      "Pantau status di Beranda. Kartu menunjukkan langkah berikutnya.",
    ],
    operational: [
      "Pengajuan baru muncul di Persetujuan, tab Cash Advance.",
      "Setelah dicairkan, pantau kwitansi dan sisa saldo sampai selesai.",
    ],
  },
  {
    id: "alur-reimbursement",
    title: "Alur Reimbursement",
    summary: "Uang dikeluarkan lebih dulu, lalu diganti.",
    common: "Reimbursement adalah penggantian uang yang Anda bayarkan sendiri.",
    details: [
      "Kwitansi dilampirkan saat mengajukan.",
      "Setelah penggantian ditransfer, pengajuan langsung selesai.",
      "Tidak ada pengembalian sisa saldo.",
    ],
    requester: [
      "Pilih Ajukan, lalu pilih Reimbursement.",
      "Tambahkan kwitansi beserta kategorinya.",
      "Total reimbursement dihitung dari kwitansi tersebut.",
      "Centang pernyataan kwitansi asli dan sesuai, lalu kirim.",
      "Setelah ditransfer, status pengajuan menjadi Selesai.",
    ],
    operational: [
      "Cocokkan kwitansi dengan nominal sebelum menyetujui.",
      "Setelah disetujui, transfer dan unggah bukti transfer.",
      "Pengajuan otomatis selesai setelah bukti transfer terunggah.",
    ],
  },
  {
    id: "persetujuan",
    title: "Persetujuan",
    summary: "Siapa yang memutuskan dan apa yang terjadi sesudahnya.",
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
      "Buka pengajuan dari Persetujuan, periksa, lalu Setujui atau Tolak.",
      "Catatan wajib diisi saat menolak.",
      "Anda tidak dapat menyetujui pengajuan milik sendiri.",
    ],
  },
  {
    id: "pencairan",
    title: "Pencairan dana",
    summary: "Transfer dari Tim Operasional ke rekening requester.",
    common: "Pencairan adalah transfer dana setelah pengajuan disetujui.",
    details: ["Bukti transfer diunggah sebagai catatan."],
    requester: [
      "Pastikan rekening di pengajuan sudah benar sebelum mengirim.",
      "Status menunggu pencairan sampai Tim Operasional mentransfer.",
      "Isi Telegram Chat ID di Profil untuk notifikasi dana cair.",
    ],
    operational: [
      "Buka pengajuan disetujui, lalu salin rekening dengan tombol Salin.",
      "Transfer lewat bank, lalu unggah bukti transfer.",
      "Pencairan hanya dicatat sekali dan bukan untuk pengajuan sendiri.",
    ],
  },
  {
    id: "bukti-transaksi",
    title: "Unggah bukti transaksi",
    summary: "Kwitansi dan foto bukti pengeluaran.",
    common: "Bukti transaksi membuktikan dana dipakai sesuai tujuan.",
    details: [
      "Contohnya kwitansi, nota, dan struk.",
      "Berkas disimpan di Google Drive dan ditautkan ke pengajuan.",
    ],
    requester: [
      "Buka Cash Advance yang sudah cair, lalu pilih Catat kwitansi.",
      "Foto kwitansi atau pilih dari galeri.",
      "Nominal, vendor, dan tanggal dibaca otomatis.",
      "Periksa hasilnya dan perbaiki bila salah sebelum menyimpan.",
      "Format: JPG, PNG, WebP, HEIC, atau PDF. Maksimal 8 MB.",
    ],
    operational: [
      "Periksa kwitansi yang masuk di detail pengajuan.",
      "Jika ada pos anggaran belum ditandai, minta requester melengkapi.",
    ],
  },
  {
    id: "spj",
    title: "SPJ (pertanggungjawaban)",
    summary: "Laporan penggunaan dana beserta buktinya.",
    common: "SPJ adalah laporan pertanggungjawaban penggunaan dana.",
    details: [
      "SPJ terbentuk dari kwitansi yang Anda unggah.",
      "Kwitansi dibandingkan dengan anggaran (RAB).",
    ],
    requester: [
      "Unggah kwitansi maksimal 7 hari kalender setelah dana cair.",
      "Tenggat tampil di detail pengajuan (Tenggat LPJ / SPJ).",
      "Tandai tiap kwitansi pada pos RAB yang sesuai.",
    ],
    operational: [
      "Dashboard menampilkan jumlah pengajuan yang Perlu SPJ.",
      "Pakai perbandingan RAB dan realisasi untuk memeriksa pengeluaran.",
    ],
  },
  {
    id: "pengembalian",
    title: "Pengembalian sisa saldo",
    summary: "Dana yang tidak terpakai dikembalikan.",
    common: "Sisa saldo adalah dana diterima dikurangi total kwitansi.",
    details: [
      "Sisa dikembalikan ke rekening organisasi.",
      "Pengajuan selesai setelah Tim Operasional mengonfirmasi.",
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
  { term: "Laporan penutupan", meaning: "PDF ringkasan pengajuan yang sudah selesai." },
  { term: "jt", meaning: "Singkatan juta. Rp 1,85 jt berarti sekitar Rp 1.850.000." },
  { term: "miliar", meaning: "Seribu juta. Rp 17 miliar berarti sekitar Rp 17.000.000.000." },
];
