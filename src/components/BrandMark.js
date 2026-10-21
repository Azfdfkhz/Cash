import Image from "next/image";

// Logo kotak gelap (mark Sharing Happiness) + nama aplikasi.
// Dipakai di sidebar desktop & top bar mobile (Beranda, Profil, dst.).
// Ukuran mengikuti Figma: desktop 34px / radius 10, mobile 40px / radius 12.
// `label`: teks nama aplikasi (sidebar desktop memakai singkatan "CA & RE").
export default function BrandMark({ size = "md", label = "Cash Advance" }) {
  const lg = size === "lg";
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${
          lg ? "h-10 w-10 rounded-xl" : "h-[34px] w-[34px] rounded-[10px]"
        } flex shrink-0 items-center justify-center bg-[#0f172a] shadow-[0_4px_6px_rgba(37,99,235,0.25)]`}
      >
        <Image
          src="/brand/sh-mark.png"
          alt="Sharing Happiness"
          width={256}
          height={256}
          priority
          className={lg ? "h-6 w-6" : "h-5 w-5"}
        />
      </div>
      <span
        className={`font-bold tracking-[-0.5px] text-[#0f172a] ${
          lg ? "text-xl" : "text-xl"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
