import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadReceiptToDrive } from "@/lib/google/drive";

export const runtime = "nodejs";

// Ubah nama orang jadi potongan aman untuk nama file Drive:
// buang aksen, ganti karakter non-alfanumerik dengan "-", batasi panjangnya.
function slugForFilename(name) {
  const slug = String(name || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || "tanpa-nama";
}

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const cashAdvanceId = formData.get("cashAdvanceId");
  const kind = formData.get("kind") || "kwitansi";

  if (!file || !cashAdvanceId) {
    return NextResponse.json(
      { error: "file dan cashAdvanceId wajib diisi" },
      { status: 400 }
    );
  }

  const { data: cashAdvance } = await supabase
    .from("cash_advances")
    .select("purpose, created_at, profiles:requester_id(full_name)")
    .eq("id", cashAdvanceId)
    .single();

  if (!cashAdvance) {
    return NextResponse.json(
      { error: "Pengajuan tidak ditemukan." },
      { status: 404 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = (file.type?.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const shortId = cashAdvanceId.slice(0, 8);
  const datePrefix = cashAdvance.created_at?.slice(0, 10) || "";
  const nameSlug = slugForFilename(cashAdvance.profiles?.full_name);
  const filename = `${kind}_${nameSlug}_${datePrefix}_${shortId}_${Date.now()}.${ext}`;
  const folderName = `${datePrefix} ${cashAdvance.purpose} (${shortId})`
    .trim()
    .slice(0, 120);

  try {
    const { fileId, viewUrl } = await uploadReceiptToDrive({
      buffer,
      filename,
      mimeType: file.type || "image/jpeg",
      folderName,
    });
    return NextResponse.json({ ok: true, fileId, viewUrl });
  } catch (err) {
    console.error("Drive upload failed", err);
    return NextResponse.json(
      { error: "Gagal mengunggah foto ke Google Drive." },
      { status: 500 }
    );
  }
}
