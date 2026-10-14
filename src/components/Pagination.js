import Link from "next/link";

// Navigasi halaman berbasis query param `?page=`. Cukup dipakai di Server
// Component — tidak butuh state klien.
export default function Pagination({ page, total, pageSize, basePath }) {
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (!canPrev && !canNext) return null;

  const linkCls =
    "text-sm font-medium rounded-lg px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50";
  const disabledCls =
    "text-sm font-medium rounded-lg px-3 py-1.5 border border-slate-200 text-slate-300 pointer-events-none";

  return (
    <div className="flex items-center justify-between pt-1">
      {canPrev ? (
        <Link href={`${basePath}?page=${page - 1}`} className={linkCls}>
          Sebelumnya
        </Link>
      ) : (
        <span className={disabledCls}>Sebelumnya</span>
      )}

      <span className="text-xs text-slate-500">
        Halaman {page} dari {totalPages}
      </span>

      {canNext ? (
        <Link href={`${basePath}?page=${page + 1}`} className={linkCls}>
          Berikutnya
        </Link>
      ) : (
        <span className={disabledCls}>Berikutnya</span>
      )}
    </div>
  );
}
