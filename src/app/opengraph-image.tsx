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
            width: 100,
            height: 100,
            borderRadius: 24,
            background: "rgba(255,255,255,0.2)",
            fontSize: 44,
            fontWeight: 700,
            marginBottom: 32,
          }}
        >
          YE
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          연세교육공학회
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 400,
            opacity: 0.9,
            marginBottom: 8,
          }}
        >
          Yonsei Educational Technology Society
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 300,
            opacity: 0.7,
            marginTop: 24,
          }}
        >
          교육의 미래를 함께 설계합니다
        </div>
      </div>
    ),
    { ...size }
  );
}
