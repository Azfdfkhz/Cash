// Draft pengajuan disimpan di perangkat ini, per jenis (cash_advance /
// reimbursement). Teks formulir ada di localStorage; file kwitansi (Blob) di
// IndexedDB karena terlalu besar untuk localStorage.
//
// Draft dibuat OTOMATIS (lihat useAutoDraft): tiap perubahan, saat halaman
// ditutup/pindah, saat koneksi putus, dan saat pengiriman gagal. User tinggal
// membuka lagi formulirnya (atau "Lanjutkan" di Beranda) untuk melanjutkan.
const PREFIX = "cashadvance:draft:";
export const DRAFT_KINDS = ["cash_advance", "reimbursement"];
export const DRAFT_EVENT = "cashadvance:draft-changed";

function emitChange() {
  try {
    window.dispatchEvent(new Event(DRAFT_EVENT));
  } catch {
    /* abaikan */
  }
}

export function loadDraft(kind) {
  try {
    const raw = window.localStorage.getItem(PREFIX + kind);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// `reason`: "auto" (otomatis), "manual" (tombol Draft), "error" (pengiriman gagal).
export function saveDraft(kind, data, { reason = "auto" } = {}) {
  try {
    window.localStorage.setItem(
      PREFIX + kind,
      JSON.stringify({ ...data, _savedAt: new Date().toISOString(), _reason: reason })
    );
    emitChange();
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(kind) {
  try {
    window.localStorage.removeItem(PREFIX + kind);
  } catch {
    /* abaikan */
  }
  clearDraftFiles(kind).catch(() => {});
  emitChange();
}

// Ringkasan draft untuk daftar "Lanjutkan" di Beranda.
export function getDraftInfo(kind) {
  const d = loadDraft(kind);
  if (!d) return null;
  return {
    kind,
    savedAt: d._savedAt ?? null,
    reason: d._reason ?? "auto",
    title: (d.purpose || "").trim(),
    fileCount: Array.isArray(d.receipts) ? d.receipts.length : 0,
  };
}

// ── File (IndexedDB) ────────────────────────────────────────────────
const DB_NAME = "cashadvance-drafts";
const STORE = "files";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(out?.result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
    t.onabort = () => {
      db.close();
      reject(t.error);
    };
  });
}

// Ganti seluruh file draft `kind` dengan `files` = [{ key, file }].
export async function saveDraftFiles(kind, files) {
  const db = await openDb();
  await tx(db, "readwrite", (store) => {
    store.put(
      files.map(({ key, file }) => ({ key, file })),
      kind
    );
  });
}

// -> { [key]: File }
export async function loadDraftFiles(kind) {
  const db = await openDb();
  const list = await tx(db, "readonly", (store) => store.get(kind));
  const out = {};
  for (const { key, file } of list ?? []) out[key] = file;
  return out;
}

export async function clearDraftFiles(kind) {
  const db = await openDb();
  await tx(db, "readwrite", (store) => {
    store.delete(kind);
  });
}
