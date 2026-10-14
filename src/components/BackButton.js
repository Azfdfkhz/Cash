"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
    >
      <ArrowLeft size={18} />
      Kembali
    </button>
  );
}
