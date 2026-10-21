"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, FileText, Loader2, X } from "lucide-react";
import { renderPdfPreview } from "@/lib/pdfPreview";

// Ambil file id dari link Drive (".../file/d/<id>/view?...").
export function driveFileId(url) {
  return String(url || "").match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;
}

// Muat file bukti Drive lewat /api/files (server, dicek aksesnya) dan siapkan
// untuk ditampilkan di aplikasi: PDF dirender per halaman dengan pdf.js,
// foto ditampilkan apa adanya. Hasil: { status, pages, pageCount }.
function useAppFile(url, { enabled = true, maxPages = 30, width = 1400 } = {}) {
  const fileId = driveFileId(url);
  const key = `${fileId}:${maxPages}:${width}`;
  const [result, setResult] = useState({ key: null });

  useEffect(() => {
    if (!enabled || !fileId) return;
    let cancelled = false;
    const objectUrls = [];
    (async () => {
      try {
        const res = await fetch(`/api/files/${fileId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (blob.type === "application/pdf") {
          const { pages, pageCount } = await renderPdfPreview(blob, { maxPages, width });
          if (!cancelled) setResult({ key, status: "ready", pages, pageCount });
        } else {
          const src = URL.createObjectURL(blob);
          objectUrls.push(src);
          if (!cancelled) setResult({ key, status: "ready", pages: [src], pageCount: 1 });
        }
      } catch (err) {
        console.error("App file preview failed", fileId, err);
        if (!cancelled) setResult({ key, status: "error" });
      }
    })();
    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [enabled, fileId, key, maxPages, width]);

  if (!fileId) return { status: "error" };
  return result.key === key ? result : { status: "loading" };
}

function AppFileViewer({ url, title }) {
  const file = useAppFile(url, { maxPages: 30, width: 1400 });
  if (file.status === "loading") {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-sm text-white/80">
        <Loader2 className="animate-spin" size={18} /> Memuat file...
      </div>
    );
  }
  if (file.status === "error") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-sm text-white/80">
        <p>File tidak bisa ditampilkan di aplikasi.</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/25"
        >
          <ExternalLink size={14} /> Buka di Drive
        </a>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto space-y-3">
      {file.pages.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt={`${title || "File"}${file.pages.length > 1 ? ` halaman ${i + 1}` : ""}`}
          className="mx-auto max-w-full bg-white"
        />
      ))}
      {file.pageCount > file.pages.length && (
        <p className="py-2 text-center text-xs text-white/70">
          +{file.pageCount - file.pages.length} halaman lagi — buka di Drive untuk
          melihat semuanya.
        </p>
      )}
    </div>
  );
}

// Pop up penampil foto / PDF.
// - `url`    : link Drive (webViewLink) -> dimuat lewat server & ditampilkan
//              di aplikasi (PDF dirender per halaman).
// - `images` : daftar src gambar lokal (foto yang baru dipilih, atau halaman
//              PDF yang sudah dirender) -> ditampilkan berurutan.
// - `fallbackUrl`: kalau tidak ada yang bisa ditampilkan (mis. PDF gagal
//              dirender), tawarkan buka file aslinya di tab baru.
export function FilePreviewModal({ open, onClose, title, url, images, loading, fallbackUrl }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Hanya terbuka setelah interaksi user, jadi tidak pernah dirender di server.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Pratinjau file"}
      className="fixed inset-0 z-[60] flex flex-col bg-black/85"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      onClick={onClose}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="flex-1 min-w-0 truncate text-sm font-medium">
          {title || "Pratinjau"}
        </p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25"
          >
            <ExternalLink size={14} /> Buka di Drive
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          autoFocus
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white/15"
        >
          <X size={20} />
        </button>
      </div>

      <div
        className="flex-1 min-h-0 px-2 pb-2 sm:px-6 sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {url ? (
          <AppFileViewer url={url} title={title} />
        ) : images?.length ? (
          <div className="h-full overflow-y-auto space-y-3">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`${title || "File"} ${images.length > 1 ? `halaman ${i + 1}` : ""}`}
                className="mx-auto max-w-full bg-white"
              />
            ))}
            {loading && (
              <p className="flex items-center justify-center gap-2 py-3 text-xs text-white/80">
                <Loader2 size={14} className="animate-spin" /> Memuat halaman
                lainnya...
              </p>
            )}
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center text-white/80">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-sm text-white/80">
            <p>Pratinjau file ini tidak tersedia.</p>
            {fallbackUrl && (
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/25"
              >
                <ExternalLink size={14} /> Buka file di tab baru
              </a>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Tombol/link yang membuka file Drive di pop up, bukan tab baru.
export function FilePreviewLink({ url, title, className, children }) {
  const [open, setOpen] = useState(false);
  if (!url) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <FilePreviewModal open={open} onClose={() => setOpen(false)} title={title} url={url} />
    </>
  );
}

// Pratinjau besar file Drive langsung di halaman (foto, atau halaman pertama
// PDF), dimuat saat kartunya mulai terlihat di layar. Klik untuk layar penuh.
// Kalau gagal dimuat, pratinjau disembunyikan -- tombol "Layar penuh" tetap ada.
export function DriveInlinePreview({ url, title, className = "", variant = "full" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const file = useAppFile(url, { enabled: visible, maxPages: 1, width: 900 });
  const thumb = variant === "thumb";
  if (!driveFileId(url)) return null;
  // Gagal dimuat: untuk thumbnail tetap tampilkan kotak file yang bisa diketuk
  // (pop up menawarkan "Buka di Drive"), jangan hilang jadi teks saja.
  if (file.status === "error") {
    if (!thumb) return null;
    return (
      <>
        <button
          ref={ref}
          type="button"
          onClick={() => setOpen(true)}
          className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 ${className}`}
          aria-label={`Lihat ${title || "file"}`}
        >
          <FileText size={20} />
          <span className="text-[11px] font-medium">Buka</span>
        </button>
        <FilePreviewModal open={open} onClose={() => setOpen(false)} title={title} url={url} />
      </>
    );
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(true)}
        className={`relative block overflow-hidden border border-slate-200 bg-slate-50 ${
          thumb ? "h-20 w-20 shrink-0 rounded-lg hover:border-slate-300" : "w-full rounded-lg"
        } ${className}`}
        aria-label={`Lihat ${title || "file"} layar penuh`}
      >
        {file.status === "ready" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.pages[0]}
            alt={title || "Pratinjau file"}
            className={thumb ? "h-full w-full object-cover object-top" : "mx-auto max-h-96 w-full object-contain"}
          />
        ) : (
          <div
            className={`flex items-center justify-center gap-2 text-xs text-slate-500 ${
              thumb ? "h-full w-full" : "h-40"
            }`}
          >
            <Loader2 size={16} className="animate-spin" /> {!thumb && "Memuat pratinjau..."}
          </div>
        )}
        {!thumb && file.status === "ready" && file.pageCount > 1 && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
            <FileText size={12} /> PDF · {file.pageCount} halaman
          </span>
        )}
      </button>
      <FilePreviewModal open={open} onClose={() => setOpen(false)} title={title} url={url} />
    </>
  );
}

// Pratinjau besar file yang BARU dipilih (belum diunggah): foto, atau
// halaman-halaman PDF (dirender pdf.js). Klik untuk layar penuh.
export function LocalFilePreview({ file, className = "" }) {
  const isPdf = file?.type === "application/pdf";
  const [open, setOpen] = useState(false);
  const imageUrl = useMemo(
    () => (file && !isPdf ? URL.createObjectURL(file) : null),
    [file, isPdf]
  );
  useEffect(() => () => imageUrl && URL.revokeObjectURL(imageUrl), [imageUrl]);

  // Halaman PDF, disimpan bersama file-nya supaya hasil file lama tidak
  // tertampil saat file diganti.
  const [pdf, setPdf] = useState({ file: null });
  useEffect(() => {
    if (!file || !isPdf) return;
    let cancelled = false;
    renderPdfPreview(file, { maxPages: 20 })
      .then(({ pages }) => !cancelled && setPdf({ file, pages }))
      .catch(() => !cancelled && setPdf({ file, pages: [] }));
    return () => {
      cancelled = true;
    };
  }, [file, isPdf]);

  if (!file) return null;
  const pages = isPdf ? (pdf.file === file ? pdf.pages : null) : [imageUrl];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!pages?.length}
        className={`relative block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ${className}`}
        aria-label={`Lihat ${file.name} layar penuh`}
      >
        {pages?.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pages[0]} alt={file.name} className="mx-auto max-h-80 w-full object-contain" />
        ) : (
          <div className="flex h-32 items-center justify-center gap-2 text-xs text-slate-500">
            {pages ? (
              <>
                <FileText size={16} /> Pratinjau tidak tersedia
              </>
            ) : (
              <>
                <Loader2 size={16} className="animate-spin" /> Menyiapkan pratinjau...
              </>
            )}
          </div>
        )}
        {isPdf && pages?.length > 1 && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
            <FileText size={12} /> PDF · {pages.length} halaman
          </span>
        )}
      </button>
      <FilePreviewModal
        open={open}
        onClose={() => setOpen(false)}
        title={file.name}
        images={pages ?? []}
      />
    </>
  );
}
