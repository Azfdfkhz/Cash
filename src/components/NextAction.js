import { nextAction } from "@/lib/utils";

// Satu baris "langkah berikutnya" di kartu/baris pengajuan.
// act = ada yang harus dikerjakan pembaca (biru, tebal); wait = menunggu pihak lain (amber).
export default function NextAction({ ca, operational = false, as: Tag = "span", className = "" }) {
  const action = nextAction(ca, operational);
  if (!action) return null;
  const tone = action.tone === "act" ? "font-semibold text-brand" : "font-medium text-amber-700";
  return (
    <Tag className={`max-w-[11rem] text-right text-xs leading-snug ${tone} ${className}`}>
      {action.text}
    </Tag>
  );
}
