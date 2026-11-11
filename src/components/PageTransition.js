"use client";

import { usePathname } from "next/navigation";

// Membungkus isi halaman; key berganti tiap pindah halaman sehingga animasi
// masuk (.page-enter) diputar ulang. Pindah tab/filter di halaman yang sama
// (hanya query berubah) tidak memutar ulang animasi.
export default function PageTransition({ children }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
