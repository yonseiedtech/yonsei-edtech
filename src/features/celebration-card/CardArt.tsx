"use client";

import type { CelebrationCardData } from "./types";

// ── Color constants (same palette family as card-news/art.tsx) ──
const NAVY_DEEP = "#002060";
const NAVY_BRAND = "#003378";
const WHITE = "#ffffff";
const TEXT_DARK = "#1a1f36";
const TEXT_MUTED = "#6b7488";
const RULE_COLOR = "#cfd6e4";
const NAVY_GRADIENT = `linear-gradient(135deg, ${NAVY_DEEP} 0%, #0038A8 100%)`;

// ── Card native dimensions ──────────────────────────────────────
// Width: 540px · Height: 1026px  ≈ 1 : 1.9 portrait ratio
// Exported at 2× via html2canvas → 1080 × 2052 PNG
export const CARD_W = 540;
export const CARD_H = 1026;

/** Minimal bold parser: **text** → strong element. Only ** is supported. */
function parseBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong
            key={i}
            style={{ fontWeight: 700, color: NAVY_BRAND }}
          >
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** Highlights "연세교육공학" substring in navy within a muted prefix string */
function PrefixWithNavy({ text }: { text: string }) {
  const KEY = "연세교육공학";
  const idx = text.indexOf(KEY);
  if (idx === -1) {
    return (
      <span style={{ fontSize: 14, color: TEXT_MUTED, letterSpacing: 0.3 }}>
        {text}
      </span>
    );
  }
  return (
    <span style={{ fontSize: 14, color: TEXT_MUTED, letterSpacing: 0.3 }}>
      {text.slice(0, idx)}
      <span style={{ color: NAVY_BRAND, fontWeight: 600 }}>{KEY}</span>
      {text.slice(idx + KEY.length)}
    </span>
  );
}

/** Thin horizontal rule */
function Rule({ opacity = 1 }: { opacity?: number }) {
  return (
    <div
      style={{
        height: 1,
        background: RULE_COLOR,
        opacity,
        marginLeft: 8,
        marginRight: 8,
      }}
    />
  );
}

interface CardArtProps {
  data: CelebrationCardData;
  /** Callback for the export ref — attach to the outermost div */
  refCb?: (el: HTMLDivElement | null) => void;
}

export function CardArt({ data, refCb }: CardArtProps) {
  const FONT_SANS = `var(--font-pretendard), "Pretendard", system-ui, -apple-system, sans-serif`;
  const FONT_SERIF = `var(--font-hahmlet), "Hahmlet", var(--font-noto-serif-kr), "Noto Serif KR", serif`;

  return (
    /* Outer container — provides padding-top for emblem overhang */
    <div
      ref={refCb}
      data-celebration-card
      style={{
        position: "relative",
        width: CARD_W,
        height: CARD_H,
        background: WHITE,
        fontFamily: FONT_SANS,
        paddingTop: 36,
        boxSizing: "border-box",
      }}
    >
      {/* ── Emblem: floats at top center, white background breaks the border ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          background: WHITE,
          padding: "0 18px",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/yonsei-emblem.svg"
          alt="연세교육공학 엠블럼"
          crossOrigin="anonymous"
          style={{ width: 72, height: 72, display: "block" }}
        />
      </div>

      {/* ── Card frame with navy border ─────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 0,
          right: 0,
          bottom: 0,
          border: `2px solid ${NAVY_DEEP}`,
          borderRadius: 18,
          background: WHITE,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          paddingTop: 48,
          paddingLeft: 36,
          paddingRight: 36,
          paddingBottom: 22,
          boxSizing: "border-box",
        }}
      >
        {/* ── Headline ─────────────────────────────────────────── */}
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 25,
            fontWeight: 700,
            lineHeight: 1.52,
            color: NAVY_DEEP,
            textAlign: "center",
            whiteSpace: "pre-line",
            letterSpacing: -0.3,
          }}
        >
          {data.headline}
        </div>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div style={{ marginTop: 18, marginBottom: 18 }}>
          <Rule />
        </div>

        {/* ── Recipient block ───────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          <PrefixWithNavy text={data.recipientPrefix} />
          <div style={{ height: 6 }} />
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 44,
              fontWeight: 800,
              color: NAVY_DEEP,
              letterSpacing: -1,
              lineHeight: 1.2,
            }}
          >
            {data.recipientName}
          </div>
          <div style={{ height: 4 }} />
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: TEXT_DARK,
              letterSpacing: 1,
            }}
          >
            {data.recipientHonorific}
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div style={{ marginTop: 18, marginBottom: 18 }}>
          <Rule />
        </div>

        {/* ── Body paragraphs ───────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflow: "hidden",
          }}
        >
          {data.paragraphs.map((para, i) => (
            <p
              key={i}
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.82,
                color: TEXT_DARK,
                wordBreak: "keep-all",
                overflowWrap: "break-word",
              }}
            >
              {parseBold(para)}
            </p>
          ))}
        </div>

        {/* ── Closing ───────────────────────────────────────────── */}
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 13,
              color: TEXT_MUTED,
              textAlign: "right",
              lineHeight: 1.7,
            }}
          >
            {data.closing}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: NAVY_BRAND,
              textAlign: "right",
              marginTop: 2,
              letterSpacing: 0.5,
            }}
          >
            {data.senderSuffix}
          </div>
        </div>

        {/* ── Photo / placeholder zone ──────────────────────────── */}
        <div
          style={{
            marginTop: 16,
            height: 162,
            borderRadius: 10,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {!data.usePhotoPlaceholder && data.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.photoUrl}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />
          ) : (
            /* Navy gradient placeholder with emblem watermark */
            <div
              style={{
                width: "100%",
                height: "100%",
                background: NAVY_GRADIENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/yonsei-emblem.svg"
                alt=""
                aria-hidden
                crossOrigin="anonymous"
                style={{
                  width: 72,
                  height: 72,
                  opacity: 0.22,
                  display: "block",
                  filter: "brightness(10)",
                }}
              />
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px solid ${RULE_COLOR}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/card-news/brand/logo-society.png"
            alt="연세교육공학회"
            crossOrigin="anonymous"
            style={{ height: 30, width: "auto", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}
