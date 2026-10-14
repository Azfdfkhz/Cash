import ScanForm from "@/components/ScanForm";

export default async function ScanPage({ params }) {
  const { id } = await params;
  return <ScanForm cashAdvanceId={id} />;
}
