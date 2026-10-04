/**
 * The Signal Desk mark: a signal that settles into a line of writing, on the
 * blue-to-indigo tile the ANTELUS family shares. Same drawing as src/app/icon.svg.
 *
 * The tile is a CSS gradient rather than an SVG <linearGradient>: the mark
 * appears several times per page (sidebar, drawer, account chip), and a shared
 * gradient id stops rendering when its first copy sits inside a hidden sidebar.
 */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-grid",
        flex: "none",
        width: size,
        height: size,
        borderRadius: size * (18 / 64),
        background: "linear-gradient(135deg, #4c98fd 0%, #4f507f 100%)",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64">
        <path
          d="M11 32 C14 32 14.5 19 18.5 19 C22.5 19 22.5 45 26.5 45 C30 45 30.5 32 33 32 H42"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="46.5" y="21" width="5" height="22" rx="2" fill="#ffffff" fillOpacity="0.55" />
      </svg>
    </span>
  );
}
