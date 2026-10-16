import { createClient } from "@/lib/supabase/server";
import ScanForm from "@/components/ScanForm";

export default async function ScanPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: ca }, { data: balanceRow }] = await Promise.all([
    supabase.from("cash_advances").select("amount_requested").eq("id", id).single(),
    supabase
      .from("cash_advance_balances")
      .select("balance")
      .eq("cash_advance_id", id)
      .single(),
  ]);

  const balance = balanceRow?.balance ?? ca?.amount_requested ?? null;

  return <ScanForm cashAdvanceId={id} balance={balance} />;
}
