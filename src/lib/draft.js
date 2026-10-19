// Draft pengajuan disimpan di perangkat ini saja (localStorage), per jenis.
const PREFIX = "cashadvance:draft:";

export function loadDraft(kind) {
  try {
    const raw = window.localStorage.getItem(PREFIX + kind);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(kind, data) {
  try {
    window.localStorage.setItem(PREFIX + kind, JSON.stringify(data));
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
}
