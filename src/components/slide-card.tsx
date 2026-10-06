"use client";

import { CAROUSEL_HANDLE, headingRuns } from "@/lib/carousel/heading";
import { FIGURE, GAP, MARGIN, SLIDE_FONT_CSS, SLIDE_W, TYPE, figureLabel, slideKind, themeFor } from "@/lib/carousel/design";
import type { Slide } from "@/lib/llm/prompts";

/** The PDF page in miniature: every size is the page's px scaled to `width`. */
export function SlideCard({
  slide,
  index,
  total,
  width = 200,
}: {
  slide: Slide;
  index: number;
  total: number;
  width?: number;
}) {
  const px = (canvasPx: number) => `${(canvasPx * width) / SLIDE_W}px`;
  const kind = slideKind(index, total);
  const isCover = kind === "cover";
  const isCta = kind === "cta";
  const theme = themeFor(kind);
  const figure = kind === "body" ? slide.figure : undefined;
  const heading = figure ? FIGURE.heading : isCover ? TYPE.coverHeading : TYPE.heading;
  const body = figure ? FIGURE.body : TYPE.body;

  return (
    <div
      style={{
        flex: "0 0 auto",
        width,
        aspectRatio: "1080 / 1350",
        background: theme.bg,
        color: theme.ink,
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: px(MARGIN),
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: SLIDE_FONT_CSS,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: px(TYPE.label.size), color: theme.label }}>
        {CAROUSEL_HANDLE}
        {!isCover && (
          <span style={{ marginLeft: "auto", color: theme.counter }}>
            {index + 1} / {total}
          </span>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: figure ? px(16) : 0,
          paddingBottom: px(48),
        }}
      >
        <div
          style={{
            fontWeight: heading.weight,
            fontSize: px(heading.size),
            lineHeight: heading.lineHeight,
            letterSpacing: `${heading.track}em`,
          }}
        >
          {headingRuns(slide.heading).map((run, i) =>
            run.muted ? (
              <span key={i} style={{ display: "block", color: theme.tail }}>
                {run.text}
              </span>
            ) : (
              <span key={i}>{run.text}</span>
            ),
          )}
        </div>
        {figure && (
          <>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                marginTop: px(FIGURE.gap),
                background: FIGURE.panel,
                padding: px(FIGURE.pad),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* A remote arXiv figure at thumbnail size; next/image would proxy it for nothing. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={figure.src}
                alt={figure.caption}
                crossOrigin="anonymous"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </div>
            <div style={{ marginTop: px(16), fontSize: px(TYPE.caption.size), color: theme.label }}>
              {figureLabel(figure.caption)}
            </div>
          </>
        )}
        {slide.body && (
          <div
            style={{
              marginTop: px(figure ? FIGURE.gap : GAP.body),
              fontSize: px(body.size),
              lineHeight: body.lineHeight,
              letterSpacing: `${body.track}em`,
              color: theme.body,
              whiteSpace: "pre-line",
            }}
          >
            {slide.body}
          </div>
        )}
        {isCta && (
          <div
            style={{
              marginTop: px(GAP.button),
              alignSelf: "flex-start",
              background: theme.buttonBg,
              color: theme.buttonText,
              fontWeight: TYPE.button.weight,
              fontSize: px(TYPE.button.size),
              padding: `${px(20)} ${px(36)}`,
            }}
          >
            Follow {CAROUSEL_HANDLE} for more
          </div>
        )}
      </div>

      {isCover && (
        <div
          style={{
            borderTop: `${px(2)} solid ${theme.hairline}`,
            paddingTop: px(26),
            fontSize: px(TYPE.label.size),
            textAlign: "right",
          }}
        >
          Swipe &rarr;
        </div>
      )}
    </div>
  );
}

export async function downloadDeck(slides: Slide[], title: string): Promise<void> {
  const { downloadCarouselPdf } = await import("@/lib/carousel/pdf");
  await downloadCarouselPdf(slides, title);
}
