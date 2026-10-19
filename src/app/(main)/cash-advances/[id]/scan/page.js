import ScanForm from "@/components/ScanForm";
import { createClient } from "@/lib/supabase/server";
import { flattenReceiptLines, rabItemVolume } from "@/lib/rab";

export default async function ScanPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: rabItems }, { data: receipts }, { data: ca }, { data: balanceRow }] = await Promise.all([
    supabase
      .from("rab_items")
      .select("id, description, unit, quantity, frequency")
      .eq("cash_advance_id", id)
      .order("position"),
    supabase
      .from("receipts")
      .select("id, amount, rab_item_id, outside_rab, quantity, receipt_lines(*)")
      .eq("cash_advance_id", id),
    supabase.from("cash_advances").select("kind, amount_requested").eq("id", id).single(),
    supabase
      .from("cash_advance_balances")
      .select("balance")
      .eq("cash_advance_id", id)
      .single(),
  ]);

  // Sisa volume per pos = volume RAB - volume kwitansi yang sudah ada.
  const lines = flattenReceiptLines(receipts);
  const items = (rabItems ?? []).map((item) => {
    const used = lines
      .filter((l) => l.rab_item_id === item.id)
      .reduce((sum, l) => sum + Number(l.quantity ?? 1), 0);
    const volume = rabItemVolume(item);
    return {
      id: item.id,
      description: item.description,
      unit: item.unit,
      volume,
      remainingVolume: Math.max(0, volume - used),
    };
  });

  const balance = balanceRow?.balance ?? ca?.amount_requested ?? null;

  return <ScanForm cashAdvanceId={id} rabItems={items} kind={ca?.kind} balance={balance} />;
}
