import Logo from "@/components/Logo";

// Logo kotak gelap + nama aplikasi (dipakai di sidebar & top bar mobile).
export default function BrandMark({ size = "md" }) {
  const box =
    size === "lg"
      ? "h-11 w-11 rounded-2xl"
      : "h-9 w-9 rounded-xl"; // sm: sidebar desktop
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${box} bg-[#0e1726] flex items-center justify-center shadow-[0_1px_1px_rgba(0,0,0,0.05)]`}
      >
        <Logo variant="outline" size={size === "lg" ? 24 : 20} className="text-white" />
      </div>
      <span
        className={`font-bold tracking-tight text-[#0e1726] ${
          size === "lg" ? "text-xl" : "text-lg"
        }`}
      >
        CashAdvance
      </span>
    </div>
  );
}
