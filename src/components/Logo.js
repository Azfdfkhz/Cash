// Brand mark for the Cash Advance app: a wallet glyph drawn in `currentColor`
// with the clasp punched out via the even-odd fill rule, so it sits cleanly
// inside a colored badge (e.g. `bg-brand text-white`).
export default function Logo({ size = 24, className = "" }) {
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
