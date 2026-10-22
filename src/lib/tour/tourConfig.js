// Konfigurasi tur interaktif. Murni data + fungsi kecil (tanpa JSX/alias "@/")
// supaya bisa diuji dengan `node --test` dan dipakai di server maupun client.
//
// Isi penjelasan HANYA menggambarkan perilaku yang sudah ada di aplikasi
// (lihat supabase/migrations 0028 untuk definisi angka Beranda). Tidak ada
// aturan bisnis baru di sini.
//
// Peran yang benar-benar ada di aplikasi hanya dua: `requester` dan
// `operational`. Fungsi administrasi (Kelola Pengguna) adalah bagian dari peran
// operational, jadi tidak ada tur "admin" terpisah.

export const TOUR_VERSION = "v2";
export const START_TOUR_EVENT = "open-onboarding";

export const TOUR_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  SKIPPED: "skipped",
};

export function normalizeTourRole(role) {
  return role === "operational" ? "operational" : "requester";
}

// Langkah-langkah. Field:
//  id          unik, dipakai untuk melanjutkan tur
//  chapter     label halaman (eyebrow tooltip)
//  path        pathname tempat elemen berada; tur berpindah ke sana bila perlu
//  target      nilai atribut data-tour="..." pada elemen yang disorot
//  placement   saran posisi tooltip di desktop: top | bottom | left | right
//  interactive true = pengguna boleh mengklik/mengisi elemen yang disorot
//  optional    true = dilewati diam-diam bila elemen tidak ada
//  fallback    teks tambahan bila elemen tidak tampil (mis. belum ada data)
//  clickToGo   true = sorotan adalah menu navigasi yang boleh diklik pengguna;
//              mengkliknya memindahkan halaman dan tur lanjut ke langkah berikut
//              (tombol Lanjut tetap membawa pengguna otomatis)
//  demo        tampilan CONTOH (komponen asli + data statis, tidak masuk database)
//              untuk menjelaskan bagian yang belum ada datanya:
//                { kind: "review", mode: "always", detail?: true }
//                  -> panel tinjau pengajuan contoh; `detail` juga membuka pop
//                     up detail lengkapnya. `target` = elemen di dalam contoh.
//                { kind, mode: "fallback", target, unless? }
//                  -> pakai elemen asli bila ada; bila tidak ada (atau elemen
//                     `unless` tidak ada) pakai contoh dan sorot `target`
//  roles       batasi ke peran tertentu (kosong = semua)
//  body        string, atau { requester, operational }
const STEPS = [
  // ───────── Beranda ─────────
  {
    id: "nav",
    chapter: "Beranda",
    path: "/dashboard",
    target: "nav",
    placement: "right",
    title: "Menu utama",
    body: {
      requester:
        "Pindah halaman dari sini: Beranda (ringkasan pengajuan Anda), Ajukan (buat Cash Advance atau Reimbursement), dan Profil (rekening dan notifikasi Telegram). Pusat Bantuan ada di menu samping (desktop) atau ikon ? di pojok atas (ponsel).",
      operational:
        "Pindah halaman dari sini: Beranda (ringkasan), Persetujuan (tinjau, setujui/tolak, dan cairkan; titik oranye berarti ada yang perlu tindakan), Ajukan (pengajuan milik Anda sendiri), Laporan (rekap kwitansi), dan Profil. Pusat Bantuan ada di menu samping atau ikon ? di pojok atas.",
    },
  },
  {
    id: "stat-balance",
    chapter: "Beranda",
    path: "/dashboard",
    target: "stat-balance",
    placement: "bottom",
    title: { requester: "Sisa saldo aktif", operational: "Saldo berjalan" },
    body: {
      requester:
        "Dana Cash Advance yang masih Anda pegang: nominal semua Cash Advance berstatus Disetujui, dikurangi total kwitansi yang sudah dicatat dan pengembalian yang sudah dikonfirmasi Tim Operasional. Reimbursement tidak ikut dihitung.",
      operational:
        "Total sisa saldo seluruh Cash Advance berstatus Disetujui: nominal pengajuan dikurangi total kwitansi dan pengembalian yang sudah dikonfirmasi. Reimbursement tidak ikut dihitung.",
    },
  },
  {
    id: "stat-pending",
    chapter: "Beranda",
    path: "/dashboard",
    target: "stat-pending",
    placement: "bottom",
    title: "Belum Disetujui",
    body: {
      requester:
        "Jumlah pengajuan (Cash Advance maupun Reimbursement) yang masih menunggu keputusan Tim Operasional. Selama menunggu, pengajuan terkunci dan tidak bisa diedit.",
      operational:
        "Jumlah pengajuan berstatus Belum Disetujui yang menunggu verifikasi dokumen. Pengajuan milik Anda sendiri tidak dapat Anda setujui.",
    },
  },
  {
    id: "stat-active",
    chapter: "Beranda",
    path: "/dashboard",
    target: "stat-active",
    placement: "bottom",
    title: { requester: "CA aktif", operational: "CA berjalan" },
    body: "Jumlah Cash Advance berstatus Disetujui yang belum berstatus Selesai, artinya masih perlu dicairkan, dipakai, atau dipertanggungjawabkan.",
  },
  {
    id: "stat-returned",
    chapter: "Beranda",
    path: "/dashboard",
    target: "stat-returned",
    placement: "bottom",
    roles: ["requester"],
    title: "Dikembalikan",
    body: "Total sisa dana Cash Advance yang sudah Anda kembalikan dan telah dikonfirmasi Tim Operasional. Pengembalian yang masih menunggu konfirmasi belum masuk angka ini.",
  },
  {
    id: "stat-spj",
    chapter: "Beranda",
    path: "/dashboard",
    target: "stat-spj",
    placement: "bottom",
    roles: ["operational"],
    title: "Perlu SPJ",
    body: "Cash Advance berstatus Disetujui yang belum memiliki satu pun kwitansi tercatat, alias masih menunggu pelaporan dari requester.",
  },
  {
    id: "status-filter",
    chapter: "Beranda",
    path: "/dashboard",
    target: "status-filter",
    placement: "bottom",
    roles: ["operational"],
    title: "Semua / Belum Disetujui",
    body: "Pilih Semua untuk melihat seluruh pengajuan, atau Belum Disetujui untuk hanya yang menunggu keputusan. Angka di dalam kurung adalah jumlahnya.",
  },
  {
    id: "kind-filter",
    chapter: "Beranda",
    path: "/dashboard",
    target: "kind-filter",
    placement: "bottom",
    title: "Filter jenis pengajuan",
    body: "Pindah antara daftar Cash Advance dan Reimbursement. Daftar pengajuan di bawahnya mengikuti pilihan ini.",
  },
  {
    id: "request-list",
    chapter: "Beranda",
    path: "/dashboard",
    target: "request-list",
    placement: "top",
    title: "Daftar pengajuan",
    body: {
      requester:
        "Setiap pengajuan menampilkan kegiatan, tanggal pengajuan, nominal, dan status: Belum Disetujui, Disetujui, Ditolak, atau Selesai. Di bawah status ada petunjuk langkah berikutnya, misalnya baca catatan penolakan atau unggah kwitansi.",
      operational:
        "Setiap pengajuan menampilkan pemohon, kegiatan, tanggal pengajuan, nominal, dan status beserta langkah berikutnya. Pengajuan terbaru ada di atas.",
    },
    fallback:
      "Belum ada pengajuan pada jenis ini, jadi daftarnya kosong. Setelah ada pengajuan, daftar muncul di sini.",
  },
  {
    id: "row-action",
    chapter: "Beranda",
    path: "/dashboard",
    target: "row-action",
    placement: "left",
    title: { requester: "Lihat detail pengajuan", operational: "Tinjau Pengajuan dan Lihat" },
    body: {
      requester:
        "Klik baris atau tombol Lihat untuk membuka pop up detail: Ringkasan, RAB, Kwitansi, dan Riwayat. Dari sana Anda mencatat kwitansi, mengembalikan sisa dana, atau mengajukan ulang bila ditolak.",
      operational:
        "Tinjau Pengajuan muncul pada pengajuan yang menunggu keputusan dan membuka pop up untuk memeriksa lalu menyetujui atau menolak. Lihat membuka detail pengajuan yang sudah diputuskan, termasuk bukti transfer dan SPJ. Di ponsel, tulisan tombol mengikuti status.",
    },
    fallback: "Tombol aksi muncul pada setiap pengajuan di daftar. Saat ini belum ada pengajuan.",
  },
  {
    id: "detail-demo",
    chapter: "Beranda",
    path: "/dashboard",
    target: "review-panel",
    placement: "left",
    demo: { kind: "review", mode: "always" },
    title: "Contoh panel pengajuan",
    body: {
      requester:
        "Seperti inilah panel yang terbuka saat Anda menekan Lihat. Ini hanya data contoh, tidak tersimpan dan bukan pengajuan Anda. Isinya ringkasan pengajuan, plafon, tenggat SPJ, dan rekening tujuan.",
      operational:
        "Seperti inilah panel yang terbuka saat Anda menekan Tinjau Pengajuan. Ini hanya data contoh, tidak tersimpan dan bukan pengajuan sungguhan. Isinya ringkasan pengajuan, plafon, dan rekening tujuan.",
    },
  },
  {
    id: "spj",
    chapter: "Beranda",
    path: "/dashboard",
    target: "review-actions",
    placement: "top",
    roles: ["requester"],
    demo: { kind: "review", mode: "always" },
    title: "SPJ dan pengembalian dana",
    body: "Untuk Cash Advance yang sudah cair, tombol Catat kwitansi dan Kembalikan sisa muncul di panel ini, paling lambat 7 hari kalender setelah dana cair (Tenggat LPJ/SPJ tampil di panel). Bila ada sisa dana, transfer ke rekening organisasi lalu catat pengembaliannya beserta bukti transfer. Pengajuan Selesai setelah seluruh sisa dikonfirmasi Tim Operasional. Reimbursement tidak punya langkah ini.",
  },
  {
    id: "review-actions-ops",
    chapter: "Beranda",
    path: "/dashboard",
    target: "review-actions",
    placement: "top",
    roles: ["operational"],
    demo: { kind: "review", mode: "always" },
    title: "Lihat Detail, Tolak, Setujui",
    body: "Lihat Detail membuka rincian lengkap. Tolak dan Setujui Pengajuan adalah keputusan nyata pada pengajuan sungguhan; di contoh ini tombolnya tidak berfungsi dan tur tidak pernah menekannya.",
  },
  {
    id: "detail-popup-demo",
    chapter: "Beranda",
    path: "/dashboard",
    target: "detail-popup",
    placement: "right",
    demo: { kind: "review", mode: "always", detail: true },
    title: "Contoh pop up detail",
    body: "Inilah pop up detail lengkap yang terbuka dari Lihat Detail. Ada tab Ringkasan, RAB, Kwitansi, dan Riwayat. Isinya data contoh, tidak tersimpan. Pop up memuat dulu sebentar sebelum isinya tampil.",
  },
  {
    id: "go-ajukan",
    chapter: "Beranda",
    path: "/dashboard",
    target: "nav-ajukan",
    placement: "right",
    interactive: true,
    clickToGo: true,
    roles: ["requester"],
    title: "Mau mengajukan dana? Klik Ajukan",
    body: "Untuk membuat Cash Advance atau Reimbursement, klik menu Ajukan yang disorot ini. Anda juga bisa menekan Lanjut dan kami bukakan halamannya.",
    fallback: "Menu Ajukan ada di menu utama. Tekan Lanjut dan kami bukakan halaman Ajukan.",
  },
  {
    id: "go-approvals",
    chapter: "Beranda",
    path: "/dashboard",
    target: "nav-approvals",
    placement: "right",
    interactive: true,
    clickToGo: true,
    roles: ["operational"],
    title: "Mau menyetujui pengajuan? Klik Persetujuan",
    body: "Untuk meninjau, menyetujui, menolak, dan mencairkan dana, klik menu Persetujuan yang disorot ini. Anda juga bisa menekan Lanjut dan kami bukakan halamannya.",
    fallback: "Menu Persetujuan ada di menu utama. Tekan Lanjut dan kami bukakan halamannya.",
  },

  // ───────── Ajukan (requester) ─────────
  {
    id: "req-kind",
    chapter: "Ajukan",
    path: "/cash-advances/new",
    target: "req-kind",
    placement: "bottom",
    roles: ["requester"],
    title: "Pilih jenis pengajuan",
    body: "Cash Advance untuk meminta dana sebelum belanja. Reimbursement untuk mengklaim uang pribadi yang sudah terpakai. Pilihan ini mengganti formulir di bawahnya. Tur ini sekarang membahas formulir Cash Advance.",
  },
  {
    id: "req-basic",
    chapter: "Ajukan",
    path: "/cash-advances/new",
    target: "req-basic",
    placement: "right",
    interactive: true,
    roles: ["requester"],
    title: "Data kegiatan",
    body: "Isi keperluan (maks. 80 karakter), tujuan pengajuan (Penyaluran, Event, atau Lainnya), dan sumber dana. Bila sumber dana Program, ID campaign wajib diisi. Silakan coba mengisi, tidak ada yang terkirim sebelum Anda menekan Kirim Pengajuan.",
  },
  {
    id: "req-rab",
    chapter: "Ajukan",
    path: "/cash-advances/new",
    target: "req-rab",
    placement: "top",
    interactive: true,
    roles: ["requester"],
    title: "Rencana Anggaran Biaya (RAB)",
    body: "Daftar rencana pengeluaran beserta nominalnya. Nominal pengajuan mengikuti total RAB. Anda bisa mengisinya manual atau mengimpor dari link Google Spreadsheet. Formulir Cash Advance tidak punya unggahan lampiran lain: kwitansi diunggah setelah dana cair.",
  },
  {
    id: "req-date",
    chapter: "Ajukan",
    path: "/cash-advances/new",
    target: "req-date",
    placement: "top",
    interactive: true,
    roles: ["requester"],
    title: "Tanggal kebutuhan dana",
    body: "Tanggal dana mulai Anda butuhkan. Wajib diisi.",
  },
  {
    id: "req-bank",
    chapter: "Ajukan",
    path: "/cash-advances/new",
    target: "req-bank",
    placement: "top",
    interactive: true,
    roles: ["requester"],
    title: "Rekening tujuan",
    body: "Rekening untuk menerima dana. Terisi otomatis dari data rekening di Profil, dan bisa diubah khusus untuk pengajuan ini. Periksa lagi sebelum mengirim.",
  },
  {
    id: "req-summary",
    chapter: "Ajukan",
    path: "/cash-advances/new",
    target: "req-summary",
    placement: "left",
    roles: ["requester"],
    title: "Ringkasan validasi",
    body: "Menampilkan total dana dan daftar pemeriksaan yang diperbarui otomatis. Semua poin harus tercentang agar statusnya berubah dari Belum lengkap menjadi Siap dikirim.",
  },
  {
    id: "req-agree",
    chapter: "Ajukan",
    path: "/cash-advances/new",
    target: "req-agree",
    placement: "left",
    interactive: true,
    roles: ["requester"],
    title: "Kebijakan SPJ",
    body: "Centang untuk menyatakan Anda akan mengunggah kwitansi dan bukti pengeluaran maksimal 7 hari kalender setelah dana cair. Pernyataan ini wajib sebelum mengirim.",
  },
  {
    id: "req-actions",
    chapter: "Ajukan",
    path: "/cash-advances/new",
    target: "req-actions",
    placement: "left",
    roles: ["requester"],
    title: "Draft dan Kirim Pengajuan",
    body: "Draft menyimpan isian di perangkat ini untuk dilanjutkan nanti. Kirim Pengajuan adalah tindakan nyata dan tidak dijalankan oleh tur. Setelah terkirim, pengajuan tampil di Beranda berstatus Belum Disetujui dan Anda mendapat notifikasi Telegram saat diputuskan bila Chat ID sudah diisi di Profil.",
  },
  {
    id: "req-receipts",
    chapter: "Ajukan",
    path: "/reimbursements/new",
    target: "req-receipts",
    placement: "top",
    roles: ["requester"],
    title: "Reimbursement: kwitansi",
    body: "Pada Reimbursement, kwitansi dilampirkan saat mengajukan dan total klaim dihitung dari kwitansi tersebut. Setelah disetujui dan ditransfer Tim Operasional, pengajuan langsung Selesai tanpa pengembalian sisa dana.",
    fallback:
      "Pada Reimbursement, kwitansi dilampirkan saat mengajukan dan total klaim dihitung dari kwitansi tersebut.",
  },

  {
    id: "go-profile-req",
    chapter: "Ajukan",
    path: "/reimbursements/new",
    target: "nav-profile",
    placement: "right",
    interactive: true,
    clickToGo: true,
    roles: ["requester"],
    title: "Mengatur rekening? Klik Profil",
    body: "Rekening bank dan notifikasi Telegram diatur di Profil. Klik menu Profil yang disorot ini, atau tekan Lanjut dan kami bukakan halamannya.",
    fallback:
      "Di ponsel, menu bawah disembunyikan di halaman Ajukan. Tekan Lanjut dan kami bukakan halaman Profil.",
  },

  // ───────── Persetujuan (operasional) ─────────
  {
    id: "ap-tabs",
    chapter: "Persetujuan",
    path: "/approvals",
    target: "approval-tabs",
    placement: "bottom",
    roles: ["operational"],
    title: "Dua tahap pekerjaan",
    body: "Persetujuan berisi pengajuan berstatus Belum Disetujui. Pencairan berisi pengajuan yang sudah disetujui tetapi dananya belum ditransfer. Angka di tiap tab adalah jumlahnya, dan pengajuan milik Anda sendiri tidak ikut.",
  },
  {
    id: "ap-list",
    chapter: "Persetujuan",
    path: "/approvals",
    target: "approval-list",
    placement: "right",
    roles: ["operational"],
    title: "Antrean pengajuan",
    body: "Diurutkan dari yang paling lama menunggu. Di desktop, pilih pengajuan untuk melihat detailnya di panel kanan. Di ponsel, ketuk pengajuan untuk membuka pop up. Bila antrean sedang kosong, tur menampilkan satu pengajuan contoh (tidak tersimpan).",
    fallback: "Antrean kosong: tidak ada pengajuan yang menunggu pada tab ini.",
  },
  {
    id: "ap-detail",
    chapter: "Persetujuan",
    path: "/approvals",
    target: "approval-detail",
    placement: "left",
    roles: ["operational"],
    title: "Periksa sebelum memutuskan",
    body: "Tinjau Ringkasan (kegiatan, sumber dana, rekening tujuan), RAB untuk Cash Advance, serta Kwitansi dan Riwayat. Pastikan nominal, rincian, dan dokumen sesuai sebelum mengambil keputusan.",
    fallback:
      "Panel detail tampil di desktop setelah Anda memilih sebuah pengajuan. Di ponsel, isinya muncul sebagai pop up saat pengajuan diketuk. Periksa ringkasan, RAB, kwitansi, dan riwayat sebelum memutuskan.",
  },
  {
    id: "ap-actions",
    chapter: "Persetujuan",
    path: "/approvals",
    target: "approval-actions",
    placement: "top",
    roles: ["operational"],
    title: "Setujui atau Tolak",
    body: "Setujui Pengajuan dan Tolak adalah keputusan nyata yang langsung tersimpan dan memicu notifikasi ke requester. Catatan wajib diisi saat menolak, dan opsional saat menyetujui. Tur tidak pernah menekan tombol ini.",
    fallback:
      "Tombol Setujui Pengajuan dan Tolak muncul untuk pengajuan yang menunggu keputusan. Keputusan ini nyata dan langsung tersimpan. Catatan wajib diisi saat menolak, dan Anda tidak dapat memutuskan pengajuan milik sendiri.",
  },
  {
    id: "ap-disburse",
    chapter: "Persetujuan",
    path: "/approvals",
    target: "approval-tabs",
    placement: "bottom",
    roles: ["operational"],
    title: "Pencairan dana",
    body: "Pada tab Pencairan, salin data rekening requester dengan tombol Salin, transfer lewat bank, lalu unggah bukti transfer dan konfirmasi pencairan. Pencairan hanya dapat dicatat sekali.",
  },

  {
    id: "go-reports",
    chapter: "Persetujuan",
    path: "/approvals",
    target: "nav-reports",
    placement: "right",
    interactive: true,
    clickToGo: true,
    roles: ["operational"],
    title: "Butuh rekap kwitansi? Klik Laporan",
    body: "Rekap seluruh kwitansi ada di menu Laporan. Klik menu yang disorot ini, atau tekan Lanjut dan kami bukakan halamannya.",
    fallback: "Menu Laporan ada di menu utama. Tekan Lanjut dan kami bukakan halamannya.",
  },

  // ───────── Laporan (operasional) ─────────
  {
    id: "rp-filters",
    chapter: "Laporan",
    path: "/reports",
    target: "report-filters",
    placement: "right",
    interactive: true,
    roles: ["operational"],
    title: "Cari dan saring laporan",
    body: "Cari berdasarkan requester, vendor, keperluan, atau kategori. Saring menurut tanggal kwitansi dan jenis pengajuan (Cash Advance atau Reimbursement). Silakan dicoba.",
  },
  {
    id: "rp-summary",
    chapter: "Laporan",
    path: "/reports",
    target: "report-summary",
    placement: "bottom",
    roles: ["operational"],
    title: "Total dan ekspor",
    body: "Menampilkan jumlah kwitansi dan total nilainya sesuai filter aktif. Tombol CSV mengunduh data sesuai filter yang sama.",
  },

  {
    id: "go-profile-ops",
    chapter: "Laporan",
    path: "/reports",
    target: "nav-profile",
    placement: "right",
    interactive: true,
    clickToGo: true,
    roles: ["operational"],
    title: "Mengatur akun? Klik Profil",
    body: "Data rekening, notifikasi Telegram, dan Kelola Pengguna ada di Profil. Klik menu yang disorot ini, atau tekan Lanjut dan kami bukakan halamannya.",
    fallback: "Menu Profil ada di menu utama. Tekan Lanjut dan kami bukakan halamannya.",
  },

  // ───────── Profil ─────────
  {
    id: "pr-account",
    chapter: "Profil",
    path: "/profile",
    target: "profile-account",
    placement: "right",
    title: "Informasi akun",
    body: "Berisi nama, email, dan data rekening bank. Rekening ini otomatis terisi saat Anda mengajukan Cash Advance atau Reimbursement. Nomor rekening lengkap hanya tampil setelah konfirmasi password. Gunakan Edit profil untuk mengubahnya.",
  },
  {
    id: "pr-telegram",
    chapter: "Profil",
    path: "/profile",
    target: "profile-telegram",
    placement: "right",
    title: "Notifikasi Telegram",
    body: {
      requester:
        "Isi Telegram Chat ID supaya Anda mendapat notifikasi saat pengajuan disetujui, ditolak, atau dananya cair.",
      operational:
        "Isi Telegram Chat ID bila Anda juga mengajukan dana sendiri: Anda akan mendapat notifikasi saat pengajuan Anda disetujui, ditolak, atau dananya cair.",
    },
  },
  {
    id: "pr-users",
    chapter: "Profil",
    path: "/profile",
    target: "profile-users",
    placement: "top",
    optional: true,
    roles: ["operational"],
    title: "Kelola Pengguna",
    body: "Atur siapa yang punya akses Tim Operasional. Menu ini hanya tampil untuk peran Operasional.",
  },
  {
    id: "pr-help",
    chapter: "Profil",
    path: "/profile",
    target: "profile-help",
    placement: "top",
    title: "Pusat bantuan dan tur ulang",
    body: "Panduan lengkap, glosarium, dan tombol untuk mengulang tur ini kapan saja ada di Pusat bantuan. Tombol Panduan interaktif di daftar ini juga mengulang tur. Selamat mencoba!",
  },
];

function pick(value, role) {
  if (value && typeof value === "object") return value[role] ?? value.requester ?? "";
  return value ?? "";
}

// Langkah yang berlaku untuk satu peran, dengan teks sudah dipilih sesuai peran.
export function tourStepsFor(role) {
  const r = normalizeTourRole(role);
  return STEPS.filter((s) => !s.roles || s.roles.includes(r)).map((s) => ({
    ...s,
    title: pick(s.title, r),
    body: pick(s.body, r),
  }));
}

export function welcomeCopy(role) {
  return normalizeTourRole(role) === "operational"
    ? {
        title: "Selamat datang, Tim Operasional",
        body: "Ikuti tur singkat langsung di aplikasi: kami akan menyorot angka di Beranda, antrean Persetujuan, Laporan, dan Profil, beserta fungsinya.",
      }
    : {
        title: "Selamat datang di Cash Advance",
        body: "Ikuti tur singkat langsung di aplikasi: kami akan menyorot Beranda, formulir Ajukan, dan Profil, beserta fungsinya. Tidak ada pengajuan yang dikirim selama tur.",
      };
}

// Baca status tur dari user_metadata Supabase Auth.
//   metadata.tour = { v, status, step }
//   metadata.onboarding_seen = "v1" -> penanda panduan modal lama; pengguna lama
//   tidak dipaksa menonton tur baru (bisa mengulang dari Pusat Bantuan).
export function readTourState(metadata) {
  const t = metadata?.tour;
  if (t && t.v === TOUR_VERSION && Object.values(TOUR_STATUS).includes(t.status)) {
    return { status: t.status, stepId: typeof t.step === "string" ? t.step : null };
  }
  if (metadata?.onboarding_seen) {
    return { status: TOUR_STATUS.COMPLETED, stepId: null };
  }
  return { status: TOUR_STATUS.NOT_STARTED, stepId: null };
}

export function tourMetadata(status, stepId) {
  return { v: TOUR_VERSION, status, step: stepId ?? null };
}

// Indeks langkah untuk melanjutkan; 0 bila id tidak dikenal.
export function resumeIndex(steps, stepId) {
  const i = steps.findIndex((s) => s.id === stepId);
  return i >= 0 ? i : 0;
}
