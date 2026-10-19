"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import RabEditor, { newRabItem, toRabRows } from "@/components/RabEditor";
import RabComparison from "@/components/RabComparison";
import { formatCurrency } from "@/lib/utils";
import { compareRab } from "@/lib/rab";

function formatQty(value) {
  return Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export default function RabSection({
  cashAdvanceId,
  rabUrl,
  items,
  receipts,
  canEdit,
  showRealization,
  canAssign,
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [draftUrl, setDraftUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const total = items.reduce((sum, it) => sum + Number(it.total), 0);
  const summary = showRealization ? compareRab(items, receipts ?? []) : null;
  const expanded = open || editing;

  function startEditing() {
    setDraft(items.map((it) => newRabItem(it)));
    setDraftUrl(rabUrl ?? "");
    setError("");
    setEditing(true);
  }

  async function handleSave() {
    setError("");
    if (!draft.length) {
      setError("RAB wajib diisi minimal satu baris.");
      return;
    }
    let rows;
    try {
      rows = toRabRows(draft, cashAdvanceId).map((row, i) => ({
        ...row,
        id: draft[i].id ?? crypto.randomUUID(),
      }));
    } catch (err) {
      setError(err.message);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const keptIds = new Set(rows.map((r) => r.id));
    const removedIds = items.map((it) => it.id).filter((id) => !keptIds.has(id));

    try {
      if (removedIds.length) {
        const { error } = await supabase.from("rab_items").delete().in("id", removedIds);
        if (error) throw error;
      }
      if (rows.length) {
        const { error } = await supabase.from("rab_items").upsert(rows);
        if (error) throw error;
      }
      if ((draftUrl.trim() || null) !== (rabUrl ?? null)) {
        const { error } = await supabase
          .from("cash_advances")
          .update({ rab_url: draftUrl.trim() || null })
          .eq("id", cashAdvanceId);
        if (error) throw error;
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(`Gagal menyimpan RAB: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (!items.length && !canEdit && !rabUrl) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 lg:rounded-3xl lg:p-6">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={editing}
          aria-expanded={expanded}
          className="flex-1 min-w-0 flex items-start gap-2 text-left"
        >
          <ChevronDown
            size={18}
            className={`mt-0.5 shrink-0 text-slate-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-700">
              {showRealization ? "RAB vs Realisasi" : "Detail RAB"}
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              {items.length} pos · {formatCurrency(total)}
              {summary && (
                <>
                  {" · "}
                  <span
                    className={
                      summary.totalRemaining < 0
                        ? "text-rose-600"
                        : summary.totalRemaining > 0
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }
                  >
                    {summary.totalRemaining < 0 ? "Lebih " : "Sisa "}
                    {formatCurrency(Math.abs(summary.totalRemaining))}
                  </span>
                </>
              )}
            </span>
            {summary?.unassigned.length > 0 && (
              <span className="block text-xs text-amber-700 mt-0.5">
                {summary.unassigned.length} kwitansi belum ditandai pos RAB
              </span>
            )}
          </span>
        </button>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEditing}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-brand"
          >
            <Pencil size={14} /> {items.length ? "Ubah RAB" : "Isi RAB"}
          </button>
        )}
      </div>

      {expanded && (
        <>

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {editing ? (
        <>
          <RabEditor
            items={draft}
            onItemsChange={setDraft}
            sourceUrl={draftUrl}
            onSourceUrlChange={setDraftUrl}
          />
          <p className="text-xs text-slate-500">
            Nominal diajukan akan mengikuti total RAB.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-60 py-2 text-sm font-medium text-white lg:rounded-full lg:bg-dark-navy lg:font-semibold lg:hover:bg-slate-800"
            >
              {saving ? "Menyimpan..." : "Simpan RAB"}
            </button>
          </div>
        </>
      ) : (
        <>
          {rabUrl && (
            <a
              href={rabUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand"
            >
              Spreadsheet sumber <ExternalLink size={12} />
            </a>
          )}

          {!items.length && (
            <p className="text-sm text-slate-500">Belum ada rincian RAB.</p>
          )}

          {showRealization ? (
            <RabComparison
              items={items}
              receipts={receipts ?? []}
              canAssign={canAssign}
            />
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {index + 1}. {item.description}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatQty(item.quantity)} {item.unit ?? ""} ×{" "}
                        {formatQty(item.frequency)} ×{" "}
                        {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 shrink-0">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                ))}
              </div>
              {items.length > 0 && (
                <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-600">Total RAB</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(total)}
                  </span>
                </div>
              )}
            </>
          )}
        </>
      )}
        </>
      )}
    </div>
  );
}
