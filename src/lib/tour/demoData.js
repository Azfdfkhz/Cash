// Data CONTOH untuk tur interaktif. Tidak pernah dikirim ke / dibaca dari
// database: hanya ditampilkan di layar selama tur berjalan supaya pengguna yang
// belum punya pengajuan tetap bisa melihat cara memakai aplikasi.
//
// Tampilan yang memakainya adalah komponen ASLI aplikasi (daftar Beranda,
// antrean Persetujuan, panel tinjau, dan pop up detail), jadi bentuknya sama
// persis dengan desain. Komponen-komponen itu mengenali data contoh lewat
// `isDemoCa()`: tidak memuat dari Supabase dan tidak menjalankan aksi tulis.
//
// Setiap objek memakai bentuk yang sama dengan baris `cash_advances`, ditambah
// penanda `__demo: true` (dan id berawalan "tour-demo-").

export const DEMO_ID_PREFIX = "tour-demo-";
export const DEMO_OWNER_ID = "tour-demo-owner";
export const DEMO_REQUESTER_ID = "tour-demo-requester";
export const DEMO_OPS_ID = "tour-demo-ops";
// Lama "memuat" pop up contoh, supaya skeleton asli komponen sempat terlihat.
export const DEMO_LOAD_MS = 650;

export function isDemoCa(ca) {
  return Boolean(ca?.__demo) || String(ca?.id ?? "").startsWith(DEMO_ID_PREFIX);
}

export function isDemoId(id) {
  return String(id ?? "").startsWith(DEMO_ID_PREFIX);
}

function daysAgo(n, base = Date.now()) {
  return new Date(base - n * 24 * 60 * 60 * 1000).toISOString();
}

const DEMO_PROFILE = {
  full_name: "Contoh Pengguna",
  username: "contoh.pengguna",
  email: "contoh@example.com",
  bank_name: "Bank Contoh",
  bank_account_number: "1234567890",
  bank_account_holder: "Contoh Pengguna",
};

// Nilai yang sama untuk semua baris contoh (kolom lain di cash_advances).
function baseFields(now) {
  return {
    funding_source: "program",
    program_ref: "CONTOH-01",
    objective: "penyaluran",
    fund_usage_date: daysAgo(-2, now).slice(0, 10),
    bank_name: "Bank Contoh",
    bank_account_number: "1234567890",
    bank_account_holder: "Contoh Pengguna",
    rab_url: null,
    report_drive_url: null,
    disbursement_proof_url: null,
    disbursement_note: null,
    review_note: null,
    cash_advance_returns: [],
    profiles: DEMO_PROFILE,
  };
}

// Daftar contoh. Dibuat saat dipanggil supaya tanggalnya selalu terlihat
// "baru". Dua jenis (Cash Advance & Reimbursement) agar filter jenis tetap
// bermakna selama tur. Baris pertama dipakai juga sebagai isi pop up contoh.
export function demoRequests(role, kind = null) {
  const now = Date.now();
  const operational = role === "operational";
  const owner = operational ? DEMO_REQUESTER_ID : DEMO_OWNER_ID;
  const rows = operational
    ? [
        {
          id: `${DEMO_ID_PREFIX}1`,
          kind: "cash_advance",
          status: "pending",
          purpose: "Contoh: Penyaluran bantuan pangan",
          amount_requested: 5000000,
          created_at: daysAgo(1, now),
        },
        {
          id: `${DEMO_ID_PREFIX}2`,
          kind: "cash_advance",
          status: "approved",
          purpose: "Contoh: Konsumsi acara bakti sosial",
          amount_requested: 2500000,
          created_at: daysAgo(3, now),
          reviewed_at: daysAgo(2, now),
        },
        {
          id: `${DEMO_ID_PREFIX}3`,
          kind: "reimbursement",
          status: "pending",
          purpose: "Contoh: Transport survei lokasi",
          amount_requested: 350000,
          created_at: daysAgo(2, now),
        },
      ]
    : [
        {
          id: `${DEMO_ID_PREFIX}1`,
          kind: "cash_advance",
          status: "approved",
          purpose: "Contoh: Penyaluran bantuan pangan",
          amount_requested: 5000000,
          balance: 1750000,
          created_at: daysAgo(5, now),
          reviewed_at: daysAgo(4, now),
          disbursed_at: daysAgo(3, now),
        },
        {
          id: `${DEMO_ID_PREFIX}2`,
          kind: "cash_advance",
          status: "pending",
          purpose: "Contoh: Konsumsi acara bakti sosial",
          amount_requested: 2500000,
          created_at: daysAgo(1, now),
        },
        {
          id: `${DEMO_ID_PREFIX}3`,
          kind: "reimbursement",
          status: "closed",
          purpose: "Contoh: Transport survei lokasi",
          amount_requested: 350000,
          created_at: daysAgo(9, now),
          reviewed_at: daysAgo(8, now),
          disbursed_at: daysAgo(7, now),
        },
      ];

  return rows
    .filter((r) => !kind || r.kind === kind)
    .map((r) => ({ ...baseFields(now), requester_id: owner, ...r, __demo: true }));
}

// Isi pop up detail untuk pengajuan contoh: setara dengan hasil 7 query di
// CashAdvanceDetailPopup, tetapi statis. Bentuk kolom mengikuti tabel aslinya.
export function demoDetailPayload(ca) {
  const now = Date.now();
  const id = ca.id;
  const rabItems = [
    { id: `${id}-rab1`, cash_advance_id: id, position: 0, description: "Paket sembako", quantity: 40, unit: "paket", frequency: 1, unit_price: 100000, total: 4000000 },
    { id: `${id}-rab2`, cash_advance_id: id, position: 1, description: "Transport distribusi", quantity: 1, unit: "mobil", frequency: 2, unit_price: 300000, total: 600000 },
    { id: `${id}-rab3`, cash_advance_id: id, position: 2, description: "Konsumsi relawan", quantity: 20, unit: "porsi", frequency: 1, unit_price: 20000, total: 400000 },
  ];

  const approved = ca.status === "approved" || ca.status === "closed";
  const receipts = approved
    ? [
        {
          id: `${id}-rc1`,
          cash_advance_id: id,
          vendor: "Toko Sumber Rejeki",
          receipt_date: daysAgo(2, now).slice(0, 10),
          amount: 3250000,
          notes: null,
          drive_view_url: null,
          created_at: daysAgo(2, now),
          receipt_lines: [
            {
              id: `${id}-rl1`,
              receipt_id: `${id}-rc1`,
              position: 0,
              rab_item_id: `${id}-rab1`,
              outside_rab: false,
              category: null,
              amount: 3250000,
              quantity: 32,
              notes: "Pembelian paket sembako",
            },
          ],
        },
      ]
    : [];

  const events = approved
    ? [
        { id: `${id}-ev2`, action: "disbursed", note: null, created_at: daysAgo(3, now), profiles: { full_name: "Tim Operasional (contoh)" } },
        { id: `${id}-ev1`, action: "approved", note: "Dokumen lengkap.", created_at: daysAgo(4, now), profiles: { full_name: "Tim Operasional (contoh)" } },
      ]
    : [];

  const spent = receipts.reduce((sum, r) => sum + r.amount, 0);
  return {
    forCa: ca,
    full: { ...ca, disburser: { full_name: "Tim Operasional (contoh)" } },
    balanceRow: {
      balance: Number(ca.amount_requested) - spent,
      total_spent: spent,
      total_returned: 0,
      total_reimbursed: 0,
    },
    receipts,
    returns: [],
    reimbursements: [],
    rabItems,
    events,
  };
}
