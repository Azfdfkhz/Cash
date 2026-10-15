// Brand mark for the Cash Advance app: a wallet glyph.
// - default ("solid"): drawn in `currentColor`, clasp punched out via even-odd
//   fill, sits inside a colored badge (e.g. `bg-brand text-white`).
// - variant="outline": stroke-only version used on the auth screens' dark header.
export default function Logo({ size = 24, className = "", variant = "solid" }) {
  if (variant === "outline") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <rect x="2.5" y="7" width="19" height="13" rx="4" />
        <path d="M7 7V6.5A2.5 2.5 0 0 1 9.5 4h5A2.5 2.5 0 0 1 17 6.5V7" />
        <circle cx="16.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 4h11a3 3 0 0 1 3 3H6a1.5 1.5 0 0 0 0 3h13a2 2 0 0 1 2 2v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Zm10.5 8.75a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z"
      />
    </svg>
  );
}
