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

// Ringkasan alur per peran (dipakai di Pusat Bantuan dan onboarding).
export const ROLE_FLOW = {
  requester: [
    {
      title: "Ajukan dana",
      body: "Pilih Ajukan, lalu pilih Cash Advance (dana di muka) atau Reimbursement (penggantian uang yang sudah Anda keluarkan). Isi data, lampirkan rincian, lalu kirim.",
    },
    {
      title: "Tunggu persetujuan",
      body: "Tim Operasional meninjau pengajuan Anda. Selama ditinjau, pengajuan tidak bisa diubah. Bila ditolak, baca catatannya, perbaiki, lalu ajukan ulang.",
    },
    {
      title: "Terima dana",
      body: "Setelah disetujui, Tim Operasional mentransfer dana ke rekening Anda dan mengunggah bukti transfer. Anda akan menerima notifikasi bila Telegram sudah diisi di Profil.",
    },
    {
      title: "Unggah bukti & kembalikan sisa",
      body: "Untuk Cash Advance, unggah kwitansi setiap pengeluaran dan kembalikan sisa dana bila ada. Pengajuan selesai setelah semuanya dikonfirmasi.",
    },
  ],
  operational: [
    {
      title: "Tinjau pengajuan",
      body: "Buka Persetujuan, periksa nominal, rincian, dan dokumen. Setujui, atau tolak dengan catatan yang jelas (catatan wajib saat menolak).",
    },
    {
      title: "Cairkan dana",
      body: "Untuk pengajuan yang disetujui, transfer ke rekening requester lalu unggah bukti transfer. Anda tidak dapat mencairkan pengajuan milik sendiri.",
    },
    {
      title: "Pantau bukti & SPJ",
      body: "Pantau kwitansi yang masuk dan sisa saldo tiap Cash Advance. Cek pengajuan yang menunggu pelaporan.",
    },
    {
      title: "Konfirmasi & tutup",
      body: "Konfirmasi pengembalian sisa saldo setelah dana masuk, catat penggantian bila pengeluaran melebihi dana, lalu unduh laporan penutupan.",
    },
  ],
};

// Topik panduan. `common` berlaku untuk semua peran; `requester` / `operational`
// berisi langkah khusus peran tersebut.
export const HELP_TOPICS = [
  {
    id: "alur-cash-advance",
    title: "Alur Cash Advance",
    summary: "Dana diberikan di muka, dipertanggungjawabkan sesudahnya.",
    common:
      "Cash Advance (CA) adalah dana kegiatan yang diberikan lebih dulu, lalu dipertanggungjawabkan dengan kwitansi. Alurnya: pengajuan → persetujuan → pencairan → unggah kwitansi (SPJ) → pengembalian sisa saldo bila ada → selesai.",
    requester: [
      "Pilih Ajukan, lalu pilih Cash Advance.",
      "Isi keperluan, sumber dana, tanggal dana dibutuhkan, rekening tujuan, dan rincian anggaran (RAB). Nominal pengajuan mengikuti total RAB.",
      "Centang pernyataan kebijakan SPJ, lalu kirim. Anda bisa menyimpan sebagai draft dan melanjutkannya nanti.",
      "Pantau statusnya di Beranda. Kartu pengajuan menampilkan langkah berikutnya.",
    ],
    operational: [
      "Pengajuan baru muncul di Persetujuan (tab Cash Advance).",
      "Setelah disetujui dan dicairkan, pantau kwitansi dan sisa saldo sampai pengajuan selesai.",
    ],
  },
  {
    id: "alur-reimbursement",
    title: "Alur Reimbursement",
    summary: "Uang dikeluarkan lebih dulu, lalu diganti.",
    common:
      "Reimbursement adalah penggantian uang yang sudah Anda bayarkan sendiri. Kwitansi dilampirkan saat mengajukan, sehingga setelah Tim Operasional mentransfer penggantiannya, pengajuan langsung selesai. Tidak ada pengembalian sisa saldo.",
    requester: [
      "Pilih Ajukan, lalu pilih Reimbursement.",
      "Tambahkan kwitansi beserta kategorinya. Total reimbursement dihitung dari kwitansi tersebut.",
      "Centang pernyataan bahwa kwitansi asli dan sesuai, lalu kirim.",
      "Setelah disetujui dan ditransfer, pengajuan berstatus Selesai.",
    ],
    operational: [
      "Periksa kecocokan kwitansi dengan nominal pengajuan sebelum menyetujui.",
      "Setelah disetujui, transfer dan unggah bukti transfer. Pengajuan otomatis selesai.",
    ],
  },
  {
    id: "persetujuan",
    title: "Persetujuan",
    summary: "Siapa yang memutuskan dan apa yang terjadi sesudahnya.",
    common:
      "Setiap pengajuan ditinjau oleh Tim Operasional. Status yang mungkin: Belum Disetujui, Disetujui, Ditolak, dan Selesai. Seseorang tidak dapat menyetujui pengajuannya sendiri.",
    requester: [
      "Selama berstatus Belum Disetujui, pengajuan terkunci dan tidak bisa diedit.",
      "Jika Ditolak, buka pengajuan dan baca catatan penolakan.",
      "Perbaiki RAB (Cash Advance) atau kwitansi (Reimbursement) sesuai catatan, lalu tekan Ajukan Ulang.",
    ],
    operational: [
      "Buka pengajuan dari daftar Persetujuan, periksa isinya, lalu pilih Setujui atau Tolak.",
      "Catatan wajib diisi saat menolak, supaya requester tahu apa yang perlu diperbaiki.",
      "Anda tidak dapat menyetujui pengajuan milik sendiri.",
    ],
  },
  {
    id: "pencairan",
    title: "Pencairan dana",
    summary: "Transfer dari Tim Operasional ke rekening requester.",
    common:
      "Pencairan adalah transfer dana ke rekening requester setelah pengajuan disetujui. Bukti transfer diunggah sebagai catatan.",
    requester: [
      "Pastikan rekening di pengajuan sudah benar sebelum mengirim.",
      "Status berubah menjadi menunggu pencairan sampai Tim Operasional mentransfer.",
      "Isi Telegram Chat ID di Profil bila ingin mendapat notifikasi saat dana cair.",
    ],
    operational: [
      "Buka pengajuan yang sudah disetujui, salin data rekening dengan tombol Salin, lalu transfer lewat bank.",
      "Unggah bukti transfer. Pencairan hanya dapat dicatat sekali dan tidak untuk pengajuan milik sendiri.",
    ],
  },
  {
    id: "bukti-transaksi",
    title: "Unggah bukti transaksi",
    summary: "Kwitansi dan foto bukti pengeluaran.",
    common:
      "Bukti transaksi (kwitansi, nota, struk) membuktikan bahwa dana dipakai sesuai tujuan. Foto atau berkas disimpan di Google Drive organisasi dan ditautkan ke pengajuan.",
    requester: [
      "Buka pengajuan Cash Advance yang sudah cair, lalu pilih untuk mencatat kwitansi.",
      "Foto kwitansi dengan kamera atau pilih dari galeri. Aplikasi membantu membaca nominal, vendor, dan tanggal secara otomatis.",
      "Periksa hasil bacaan otomatis. Perbaiki bila ada yang salah sebelum menyimpan.",
      "Format yang diterima: JPG, PNG, WebP, HEIC, atau PDF. Ukuran berkas dibatasi 8 MB.",
    ],
    operational: [
      "Periksa kwitansi yang masuk di halaman detail pengajuan.",
      "Bila ada pos anggaran yang belum ditandai, hubungi requester untuk melengkapinya.",
    ],
  },
  {
    id: "spj",
    title: "SPJ (pertanggungjawaban)",
    summary: "Laporan penggunaan dana beserta buktinya.",
    common:
      "SPJ adalah laporan pertanggungjawaban penggunaan dana: kumpulan kwitansi yang dibandingkan dengan anggaran (RAB). Di aplikasi ini SPJ terbentuk dari kwitansi yang Anda unggah.",
    requester: [
      "Pada formulir Cash Advance, Anda menyetujui kebijakan SPJ: kwitansi dan bukti pengeluaran diunggah maksimal 7 hari kalender setelah dana cair.",
      "Tenggat tiap pengajuan juga tampil di detail pengajuan (Tenggat LPJ / SPJ).",
      "Tandai tiap kwitansi pada pos RAB yang sesuai supaya perbandingan RAB dan realisasi akurat.",
    ],
    operational: [
      "Dashboard menampilkan jumlah pengajuan yang Perlu SPJ.",
      "Gunakan perbandingan RAB dan realisasi di detail pengajuan untuk memeriksa pengeluaran.",
    ],
  },
  {
    id: "pengembalian",
    title: "Pengembalian sisa saldo",
    summary: "Dana yang tidak terpakai dikembalikan.",
    common:
      "Sisa saldo = dana yang diterima dikurangi total kwitansi. Bila masih ada sisa, dana itu dikembalikan ke rekening organisasi dan dikonfirmasi Tim Operasional. Pengajuan selesai setelah pengembalian yang dikonfirmasi menutup seluruh sisa.",
    requester: [
      "Buka pengajuan, lihat jumlah sisa saldo, dan transfer ke salah satu rekening organisasi yang tertera.",
      "Catat pengembalian: isi nominal dan unggah bukti transfer (maks. 5 MB).",
      "Status pengembalian Menunggu konfirmasi sampai Tim Operasional memverifikasi. Anda dapat membatalkannya selama belum dikonfirmasi.",
    ],
    operational: [
      "Periksa bukti transfer dan pastikan dana sudah masuk, lalu konfirmasi pengembalian.",
      "Bila sisa saldo nol, pengajuan dapat ditutup langsung. Bila pengeluaran melebihi dana, catat penggantian kekurangan.",
      "Setelah selesai, unduh laporan penutupan (PDF) atau simpan ke Drive.",
    ],
  },
];

// Glosarium: bahasa sederhana.
export const GLOSSARY = [
  { term: "Cash Advance (CA)", meaning: "Dana kegiatan yang diberikan di muka, lalu dipertanggungjawabkan dengan kwitansi." },
  { term: "Reimbursement", meaning: "Penggantian uang yang sudah Anda bayarkan sendiri, berdasarkan kwitansi." },
  { term: "RAB", meaning: "Rencana Anggaran Biaya: daftar rencana pengeluaran beserta nominalnya." },
  { term: "Realisasi", meaning: "Pengeluaran yang benar-benar terjadi, dibuktikan dengan kwitansi." },
  { term: "Kwitansi / bukti transaksi", meaning: "Nota, struk, atau tanda terima yang membuktikan sebuah pembayaran." },
  { term: "SPJ / LPJ", meaning: "Surat/Laporan Pertanggungjawaban: laporan cara dana dipakai, lengkap dengan bukti." },
  { term: "Pencairan", meaning: "Transfer dana ke rekening requester setelah pengajuan disetujui." },
  { term: "Sisa saldo", meaning: "Dana diterima dikurangi total kwitansi. Bila positif, harus dikembalikan." },
  { term: "Pengembalian", meaning: "Transfer sisa dana yang tidak terpakai ke rekening organisasi." },
  { term: "Konfirmasi", meaning: "Pemeriksaan Tim Operasional bahwa transfer atau pengembalian benar-benar diterima." },
  { term: "Bukti transfer", meaning: "Tangkapan layar atau struk dari bank yang menunjukkan transfer berhasil." },
  { term: "Ajukan ulang", meaning: "Mengirim kembali pengajuan yang ditolak setelah diperbaiki sesuai catatan." },
  { term: "Draft", meaning: "Pengajuan yang disimpan di perangkat Anda dan belum dikirim." },
  { term: "Laporan penutupan", meaning: "Dokumen PDF ringkasan pengajuan yang sudah selesai." },
  { term: "jt", meaning: "Singkatan juta. Rp 1,85 jt berarti sekitar Rp 1.850.000." },
  { term: "miliar", meaning: "Seribu juta. Rp 17 miliar berarti sekitar Rp 17.000.000.000." },
];
