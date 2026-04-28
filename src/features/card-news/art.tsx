"use client";

import type { CardSpec } from "./types";

const NAVY_DEEP = "#002060";
const NAVY_MID = "#002369";
const BLUE_BRIGHT = "#0038A8";
const TEXT_DARK = "#1a1f36";
const TEXT_MUTED = "#6b7488";
const RULE_LIGHT = "#cfd6e4";
const WHITE = "#ffffff";
const NAVY_GRADIENT = `linear-gradient(90deg, ${NAVY_DEEP} 0%, ${BLUE_BRIGHT} 100%)`;

interface CardArtProps {
  spec: CardSpec;
  refCb?: (el: HTMLDivElement | null) => void;
}

export function CardArt({ spec, refCb }: CardArtProps) {
  return (
    <div
      ref={refCb}
      data-card-art
      style={{
        width: 1080,
        height: 1080,
        position: "relative",
        background: WHITE,
        color: TEXT_DARK,
        fontFamily:
          "var(--font-pretendard), system-ui, -apple-system, 'Segoe UI', sans-serif",
        overflow: "hidden",
      }}
    >
      <BrandHeader />
      <ShieldWatermark />
      {spec.kind === "cover" && <CoverCard spec={spec} />}
      {spec.kind === "intro" && <IntroCard spec={spec} />}
      {spec.kind === "feature" && <FeatureCard spec={spec} />}
      {spec.kind === "cta" && <CtaCard spec={spec} />}
    </div>
  );
}

function BrandHeader() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 110,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 60px",
        zIndex: 5,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/card-news/brand/logo-society.png"
        alt="연세교육공학회"
        style={{ height: 44, width: "auto", display: "block" }}
        crossOrigin="anonymous"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/card-news/brand/tagline.png"
        alt="교육공학의 변화와 혁신의 시작 연세교육공학"
        style={{ height: 28, width: "auto", display: "block" }}
        crossOrigin="anonymous"
      />
    </div>
  );
}

function ShieldWatermark({ size = 760, opacity = 0.14 }: { size?: number; opacity?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/card-news/brand/shield.png"
      alt=""
      aria-hidden
      style={{
        position: "absolute",
        right: -size * 0.18,
        bottom: -size * 0.12,
        width: size,
        height: size,
        opacity,
        zIndex: 1,
        userSelect: "none",
        pointerEvents: "none",
      }}
      crossOrigin="anonymous"
    />
  );
}

function FlankedBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        color: NAVY_MID,
      }}
    >
      <div style={{ height: 1.5, width: 110, background: NAVY_MID }} />
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div style={{ height: 1.5, width: 110, background: NAVY_MID }} />
    </div>
  );
}

function GradientHeading({
  text,
  size = 96,
  weight = 800,
}: {
  text: string;
  size?: number;
  weight?: number;
}) {
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.18,
        letterSpacing: -2,
        background: NAVY_GRADIENT,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: NAVY_DEEP,
        whiteSpace: "pre-line",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function FooterStrip({ url, page }: { url: string; page?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: 60,
        right: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 5,
        fontSize: 18,
        color: TEXT_MUTED,
        letterSpacing: 1,
      }}
    >
      <span style={{ fontWeight: 600 }}>
        {url}
        {page ?? ""}
      </span>
      <span
        style={{
          color: NAVY_MID,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: "uppercase",
          fontSize: 16,
        }}
      >
        Yonsei EdTech · 2026
      </span>
    </div>
  );
}

function CoverCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: 220,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        zIndex: 3,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 56, alignItems: "center" }}>
        <FlankedBadge label={spec.badge ?? ""} />
        <GradientHeading text={spec.title ?? ""} size={108} />
        <div
          style={{
            fontSize: 24,
            color: TEXT_MUTED,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {spec.english}
        </div>
        <div
          style={{
            marginTop: 32,
            padding: "16px 36px",
            background: NAVY_DEEP,
            color: WHITE,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 1,
            borderRadius: 999,
          }}
        >
          {spec.body}
        </div>
      </div>
      <FooterStrip url="yonsei-edtech.vercel.app" />
    </div>
  );
}

function IntroCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: 200,
        paddingLeft: 80,
        paddingRight: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 50,
        zIndex: 3,
      }}
    >
      <FlankedBadge label={spec.badge ?? ""} />
      <GradientHeading text={spec.title ?? ""} size={88} />
      <div
        style={{
          fontSize: 28,
          color: TEXT_DARK,
          lineHeight: 1.65,
          textAlign: "center",
          whiteSpace: "pre-line",
          maxWidth: 880,
        }}
      >
        {spec.body}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          justifyContent: "center",
          marginTop: 16,
        }}
      >
        {(spec.bullets ?? []).map((b) => (
          <span
            key={b}
            style={{
              padding: "12px 26px",
              fontSize: 22,
              fontWeight: 700,
              color: NAVY_DEEP,
              border: `1.5px solid ${NAVY_DEEP}`,
              borderRadius: 999,
              letterSpacing: 1,
              background: WHITE,
            }}
          >
            {b}
          </span>
        ))}
      </div>
      <FooterStrip url="yonsei-edtech.vercel.app" />
    </div>
  );
}

function FeatureCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: 150,
        paddingLeft: 70,
        paddingRight: 70,
        paddingBottom: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 30,
        zIndex: 3,
      }}
    >
      <FlankedBadge label={spec.badge ?? ""} />
      <GradientHeading text={spec.title ?? ""} size={62} />
      {spec.screenshot && (
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 880,
            height: 410,
            borderRadius: 12,
            overflow: "hidden",
            background: "#f6f8fc",
            border: `1px solid ${RULE_LIGHT}`,
            boxShadow: `0 18px 40px ${NAVY_DEEP}1f`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/card-news/screenshots/${spec.screenshot}.png`}
            alt={spec.title ?? ""}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              display: "block",
            }}
            crossOrigin="anonymous"
          />
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "flex-start",
          width: "100%",
          maxWidth: 880,
          marginTop: 8,
        }}
      >
        {(spec.bullets ?? []).map((b, i) => (
          <div
            key={b}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 23,
              color: TEXT_DARK,
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: NAVY_GRADIENT,
                color: WHITE,
                fontSize: 14,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span>{b}</span>
          </div>
        ))}
      </div>
      <FooterStrip url="yonsei-edtech.vercel.app" page={spec.page} />
    </div>
  );
}

function CtaCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: 240,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 56,
        zIndex: 3,
      }}
    >
      <FlankedBadge label={spec.badge ?? ""} />
      <GradientHeading text={spec.title ?? ""} size={130} />
      <div
        style={{
          fontSize: 26,
          color: TEXT_DARK,
          lineHeight: 1.6,
          textAlign: "center",
          maxWidth: 820,
        }}
      >
        {spec.english}
      </div>
      <div
        style={{
          marginTop: 24,
          padding: "20px 44px",
          background: NAVY_DEEP,
          color: WHITE,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 1,
          borderRadius: 999,
        }}
      >
        {spec.body}
      </div>
      <FooterStrip url="yonsei-edtech.vercel.app" />
    </div>
  );
}
