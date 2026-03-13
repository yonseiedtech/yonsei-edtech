import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "연세교육공학회 - 교육의 미래를 함께 설계합니다";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #003876 0%, #0066cc 50%, #4a9eff 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "white",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 60,
            border: "3px solid rgba(255,255,255,0.4)",
            background: "rgba(255,255,255,0.15)",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 36,
            letterSpacing: "0.05em",
          }}
        >
          YONSEI
        </div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: 12,
          }}
        >
          연세교육공학회
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 400,
            opacity: 0.85,
            marginBottom: 8,
          }}
        >
          Yonsei Educational Technology Association
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 300,
            opacity: 0.6,
            marginTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.2)",
            paddingTop: 20,
          }}
        >
          연세대학교 교육공학 전공 · 교육의 미래를 함께 설계합니다
        </div>
      </div>
    ),
    { ...size }
  );
}
