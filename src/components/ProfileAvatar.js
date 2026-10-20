import Image from "next/image";

// Foto profil: mark Sharing Happiness (/brand/sh-mark.png) di lingkaran navy,
// menggantikan inisial nama. `size` = sisi lingkaran (px); mark mengisi ±55%.
export default function ProfileAvatar({ size = 36, className = "" }) {
  const mark = Math.round(size * 0.55);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-dark-navy ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/brand/sh-mark.png"
        alt=""
        width={256}
        height={256}
        style={{ width: mark, height: mark }}
      />
    </span>
  );
}
