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
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "radial-gradient(circle at 85% 15%, rgba(212,175,55,0.12) 0%, transparent 45%), linear-gradient(135deg, #0a1f44 0%, #102a5c 55%, #061635 100%)",
          color: "#f5f1e6",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* 좌측 상단 박스: 학회 메타 */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 64,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 16,
            letterSpacing: "0.18em",
            color: "#d4af37",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 36,
              height: 2,
              background: "#d4af37",
            }}
          />
          Yonsei · Graduate School of Education
        </div>

        {/* 좌측 본문: 타이포 스택 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 64,
            paddingRight: 32,
            width: "62%",
            height: "100%",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.0,
              color: "#ffffff",
              marginBottom: 18,
            }}
          >
            연세교육공학회
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              color: "rgba(245,241,230,0.78)",
              marginBottom: 32,
              fontStyle: "italic",
            }}
          >
            Yonsei Educational Technology Association
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 18,
              color: "rgba(245,241,230,0.65)",
            }}
          >
            <div
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(212,175,55,0.12)",
                border: "1px solid rgba(212,175,55,0.4)",
                color: "#e8c878",
                fontWeight: 500,
                fontSize: 15,
                letterSpacing: "0.02em",
              }}
            >
              학술 커뮤니티
            </div>
            <span style={{ color: "rgba(245,241,230,0.35)" }}>·</span>
            <span>교육의 미래를 함께 설계합니다</span>
          </div>
        </div>

        {/* 우측: 거대한 Y 모노그램 */}
        <div
          style={{
            position: "absolute",
            right: -40,
            top: 0,
            bottom: 0,
            width: "44%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* 외곽 동심원 */}
          <div
            style={{
              position: "absolute",
              width: 520,
              height: 520,
              borderRadius: "50%",
              border: "1px solid rgba(212,175,55,0.18)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 420,
              height: 420,
              borderRadius: "50%",
              border: "1px solid rgba(212,175,55,0.12)",
            }}
          />
          {/* Y 글자 */}
          <div
            style={{
              fontSize: 360,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.08em",
              background:
                "linear-gradient(160deg, #f4d77a 0%, #d4af37 45%, #8a6b1c 100%)",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 8px 40px rgba(212,175,55,0.25)",
              marginTop: -20,
            }}
          >
            Y
          </div>
        </div>

        {/* 좌측 하단 푸터 */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 64,
            right: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 22,
            borderTop: "1px solid rgba(245,241,230,0.12)",
            fontSize: 15,
            color: "rgba(245,241,230,0.55)",
          }}
        >
          <span style={{ letterSpacing: "0.04em" }}>
            연세대학교 교육대학원 · 교육공학전공
          </span>
          <span
            style={{
              fontFamily: "monospace",
              letterSpacing: "0.08em",
              color: "rgba(212,175,55,0.7)",
            }}
          >
            yonsei-edtech.vercel.app
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
