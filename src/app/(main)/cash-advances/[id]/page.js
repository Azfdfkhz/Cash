import { redirect } from "next/navigation";

// Halaman detail sudah digantikan pop up detail di dashboard. Rute ini
// dipertahankan hanya supaya tautan lama (Telegram, kartu, bookmark) tetap
// jalan: diarahkan ke dashboard dengan pop up pengajuan itu terbuka.
export default async function CashAdvanceDetailRedirect({ params }) {
  const { id } = await params;
  redirect(`/dashboard?ca=${encodeURIComponent(id)}`);
}
