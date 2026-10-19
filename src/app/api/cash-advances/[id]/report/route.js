import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateClosureReport, ReportError } from "@/lib/report/closureReport";
import { uploadReceiptToDrive } from "@/lib/google/drive";
import { caDriveFilename, caDriveFolder } from "@/lib/google/driveNames";

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireUser(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function errorResponse(err) {
  if (err instanceof ReportError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("Closure report failed", err);
  return NextResponse.json({ error: "Gagal membuat laporan." }, { status: 500 });
}

// GET: unduh laporan penutupan (PDF) yang dibuat ulang dari data terbaru.
// Akses mengikuti RLS: requester pemilik atau Tim Operasional.
export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!(await requireUser(supabase))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ca, bytes, realizedAt } = await generateClosureReport(supabase, id);
    const date = String(realizedAt).slice(0, 10).replace(/-/g, "");
    const prefix = ca.kind === "reimbursement" ? "RB" : "CA";
    const filename = `${prefix}-${id.slice(0, 8)}_LAPORAN_${date}.pdf`;
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST: simpan laporan ke folder Drive pengajuan, dipanggil otomatis saat
// pengajuan selesai. Kalau sudah pernah disimpan, link yang ada dikembalikan
// (tidak membuat duplikat) kecuali `?force=1`.
export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!(await requireUser(supabase))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const force = new URL(request.url).searchParams.get("force") === "1";

  try {
    if (!force) {
      const { data: existing } = await supabase
        .from("cash_advances")
        .select("report_drive_url")
        .eq("id", id)
        .single();
      if (existing?.report_drive_url) {
        return NextResponse.json({ ok: true, viewUrl: existing.report_drive_url });
      }
    }

    const { ca, bytes } = await generateClosureReport(supabase, id);
    const { folderName, legacyFolderNames } = caDriveFolder(id, ca);
    const { fileId, viewUrl } = await uploadReceiptToDrive({
      buffer: Buffer.from(bytes),
      filename: caDriveFilename(id, ca, { kind: "laporan", ext: "pdf" }),
      mimeType: "application/pdf",
      folderName,
      legacyFolderNames,
    });

    const { error } = await supabase.rpc("set_cash_advance_report", {
      target_id: id,
      file_id: fileId,
      view_url: viewUrl,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, viewUrl });
  } catch (err) {
    return errorResponse(err);
  }
}
