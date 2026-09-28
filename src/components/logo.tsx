/** The Signal Desk mark: a signal that settles into a line of writing. Mirrors src/app/icon.svg. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ flex: "none" }}>
      <rect width="64" height="64" rx="14" fill="#2c40bd" />
      <path
        d="M11 32 C14 32 14.5 19 18.5 19 C22.5 19 22.5 45 26.5 45 C30 45 30.5 32 33 32 H42"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="46.5" y="21" width="5" height="22" rx="2" fill="#f0eeea" fillOpacity="0.55" />
    </svg>
  );
}
