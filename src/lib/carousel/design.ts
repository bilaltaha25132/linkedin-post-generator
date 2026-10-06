// One source for the slide design, shared by the PDF renderer and the on-screen
// preview. Sizes are canvas px on the 1080×1350 page. Palette and type follow
// the EdgeFirm site: warm paper, near-black Season Sans set tight, and a tail
// that drops to neutral-400 grey on its own line.

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;
export const MARGIN = 88;

export const GREEN = "#0eca7b";

export interface SlideTheme {
  bg: string;
  /** Heading lead. */
  ink: string;
  /** Heading continuation, the site's neutral-400 fade. */
  tail: string;
  body: string;
  label: string;
  counter: string;
  hairline: string;
  buttonBg: string;
  buttonText: string;
}

// Content slides sit on the site's warm paper. The cover and the closing slide
// are the site's dark bands, so the deck opens and closes on the same frame.
export const THEMES: Record<"light" | "dark", SlideTheme> = {
  light: {
    bg: "#f0eeea",
    ink: "#171717",
    tail: "#a3a3a3",
    body: "#5c5c5b",
    label: "#737373",
    counter: "#a3a3a3",
    hairline: "#dfddda",
    buttonBg: "#1c1c1c",
    buttonText: "#ffffff",
  },
  dark: {
    bg: "#171717",
    ink: "#ffffff",
    tail: "#7d7d7d",
    body: "#b3b3b3",
    label: "#a3a3a3",
    counter: "#737373",
    hairline: "#2e2e2e",
    buttonBg: "#f0eeea",
    buttonText: "#171717",
  },
};

export type SlideKind = "cover" | "body" | "cta";

export function slideKind(index: number, total: number): SlideKind {
  if (index === 0) return "cover";
  return index === total - 1 && total > 1 ? "cta" : "body";
}

export function themeFor(kind: SlideKind): SlideTheme {
  return kind === "body" ? THEMES.light : THEMES.dark;
}

export interface TextStyle {
  weight: number;
  size: number;
  lineHeight: number;
  /** Letter-spacing in em. */
  track: number;
}

export const TYPE = {
  coverHeading: { weight: 400, size: 100, lineHeight: 1.04, track: -0.035 },
  heading: { weight: 400, size: 80, lineHeight: 1.06, track: -0.035 },
  body: { weight: 400, size: 40, lineHeight: 1.45, track: -0.01 },
  label: { weight: 400, size: 28, lineHeight: 1.2, track: 0 },
  button: { weight: 500, size: 28, lineHeight: 1.2, track: 0 },
  caption: { weight: 400, size: 24, lineHeight: 1.2, track: 0 },
} satisfies Record<string, TextStyle>;

/** Space between heading and body, and above the CTA button. */
export const GAP = { body: 52, button: 80 };

/**
 * A source's figure sits on a white panel: figures are drawn for white pages,
 * and the warm paper behind a chart reads as a stain. Heading and body get a
 * smaller size on these slides so the figure can take most of the page.
 */
export const FIGURE = {
  panel: "#ffffff",
  pad: 28,
  gap: 40,
  heading: { weight: 400, size: 64, lineHeight: 1.06, track: -0.035 },
  body: { weight: 400, size: 34, lineHeight: 1.4, track: -0.01 },
} satisfies Record<string, unknown>;

/** The credit under a figure: "Figure 3 from the paper", "From mistral.ai". */
export function figureLabel(figure: { caption: string; credit?: string }): string {
  if (figure.credit) return figure.credit;
  // Decks saved before credits existed held only arXiv figures.
  const n = /^(?:Figure|Fig\.?)\s*(\d+)/i.exec(figure.caption)?.[1];
  return n ? `Figure ${n} from the paper` : "Figure from the paper";
}

/**
 * Where the browser loads a figure from. arXiv sends CORS headers, so the
 * canvas can draw its images directly; anything else goes through /api/figure
 * so the canvas sees it as same-origin and can export the PDF.
 */
export function figureSrc(src: string): string {
  return src.startsWith("https://arxiv.org/") ? src : `/api/figure?src=${encodeURIComponent(src)}`;
}

/** CSS stack: the licensed brand font, else the Inter Tight webfont. */
export const SLIDE_FONT_CSS = `"Season Sans", var(--font-slide), system-ui, sans-serif`;
