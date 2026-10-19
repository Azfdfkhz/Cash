// Kirim file kwitansi (foto/PDF) ke OCR dan kembalikan field yang terbaca:
// { amount, vendor, receiptDate, rawText }. Melempar Error kalau gagal.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function scanReceiptFile(file) {
  const base64 = await fileToBase64(file);
  const res = await fetch("/api/ocr/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// Unggah file bukti ke folder Drive pengajuan. Mengembalikan { fileId, viewUrl }.
export async function uploadProof(file, fields) {
  const formData = new FormData();
  formData.append("file", file);
  for (const [k, v] of Object.entries(fields)) {
    if (v != null && v !== "") formData.append(k, v);
  }
  const res = await fetch("/api/drive/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gagal mengunggah file.");
  return data;
}

// Beri tahu grup Tim Operasional bahwa ada pengajuan masuk. Tidak ditunggu &
// tidak menggagalkan apa pun; keepalive supaya tetap terkirim walau halaman
// langsung pindah.
export function notifyOps(cashAdvanceId, { event = "created", note } = {}) {
  fetch(`/api/cash-advances/${cashAdvanceId}/notify-ops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, note }),
    keepalive: true,
  }).catch(() => {});
}
