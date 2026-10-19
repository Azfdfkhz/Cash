// Render halaman PDF jadi gambar (data URL) di browser untuk pratinjau
// kwitansi PDF sebelum disimpan. pdf.js dimuat dinamis supaya tidak ikut
// bundle halaman lain & tidak jalan di server.
export async function renderPdfPreview(file, { maxPages = 3, width = 900 } = {}) {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    // Disalin ke public/ saat build (scripts/copy-pdf-worker.mjs). Jangan pakai
    // new URL(..., import.meta.url): alamat hasil bundle-nya 404 di Vercel.
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  }

  const data = new Uint8Array(await file.arrayBuffer());
  // pdf.js v6: dokumen ditutup lewat loading task (PDFDocumentProxy tidak
  // punya destroy() lagi).
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;
  try {
    const pages = [];
    const count = Math.min(doc.numPages, maxPages);
    for (let i = 1; i <= count; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      pages.push(canvas.toDataURL("image/jpeg", 0.85));
    }
    return { pages, pageCount: doc.numPages };
  } finally {
    task.destroy();
  }
}
