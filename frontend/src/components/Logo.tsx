/**
 * מפא״ת mark, drawn inline.
 *
 * The design handoff points at `assets/mafat-logo.webp`, which is not in this
 * repo — this is a vector recreation of it so the shell is not waiting on an
 * asset. To swap the real file in later, drop it in `frontend/public/` and
 * replace the <svg> below with an <img>; the props (size / withWordmark) are
 * the only thing callers depend on.
 */
export function Logo({ size = 52, withWordmark = false }: { size?: number; withWordmark?: boolean }) {
  // The mark alone is 960×800; the wordmark adds another 234 below it.
  const viewBox = withWordmark ? "0 0 960 1034" : "0 0 960 800";
  const ratio = withWordmark ? 960 / 1034 : 960 / 800;

  return (
    <svg
      viewBox={viewBox}
      height={size}
      width={size * ratio}
      role="img"
      aria-label="מפא״ת"
      style={{ flex: "none" }}
    >
      <defs>
        {/* Each wing runs deep red at the apex, pale at the fold, red again at the tip. */}
        <linearGradient id="mafat-wing-r" gradientUnits="userSpaceOnUse" x1="480" y1="45" x2="95" y2="730">
          <stop offset="0" stopColor="#E31E24" />
          <stop offset="0.55" stopColor="#FBE3DE" />
          <stop offset="0.78" stopColor="#EE6A5C" />
          <stop offset="1" stopColor="#E8453B" />
        </linearGradient>
        <linearGradient id="mafat-wing-l" gradientUnits="userSpaceOnUse" x1="480" y1="45" x2="865" y2="730">
          <stop offset="0" stopColor="#E31E24" />
          <stop offset="0.55" stopColor="#FBE3DE" />
          <stop offset="0.78" stopColor="#EE6A5C" />
          <stop offset="1" stopColor="#E8453B" />
        </linearGradient>
        <linearGradient id="mafat-ring" gradientUnits="userSpaceOnUse" x1="215" y1="700" x2="745" y2="330">
          <stop offset="0" stopColor="#1B3F8F" />
          <stop offset="1" stopColor="#3AA0DC" />
        </linearGradient>
      </defs>

      <circle cx="480" cy="545" r="250" fill="none" stroke="url(#mafat-ring)" strokeWidth="46" />

      <path d="M480 45 L95 730 L257 686 L327 500 L404 273 Z" fill="url(#mafat-wing-r)" />
      <path d="M480 45 L865 730 L703 686 L633 500 L556 273 Z" fill="url(#mafat-wing-l)" />
      <path d="M175 675 L795 675 L855 733 L105 733 Z" fill="#DA1B22" />

      {withWordmark && (
        <>
          <text
            x="480"
            y="928"
            textAnchor="middle"
            fill="#1B2A63"
            fontFamily="Rubik, Heebo, sans-serif"
            fontWeight="700"
            fontSize="150"
          >
            מפא״ת
          </text>
          <text
            x="480"
            y="1016"
            textAnchor="middle"
            fill="#1B2A63"
            fontFamily="Heebo, sans-serif"
            fontWeight="500"
            fontSize="76"
          >
            הופכים חזון לביטחון
          </text>
        </>
      )}
    </svg>
  );
}
