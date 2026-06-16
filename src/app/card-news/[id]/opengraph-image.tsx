import { ImageResponse } from "next/og";
import { loadSeries } from "@/features/card-news/loader";
import { BRAND } from "@/lib/brand";

export const runtime = "nodejs";
export const alt = "연세교육공학회 카드뉴스";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function fetchFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      "https://fonts.gstatic.com/s/nanumgothic/v23/PN_3Rfu-cuLQmEsRPRm90Q.woff2",
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OG({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [series, fontData] = await Promise.all([loadSeries(id), fetchFont()]);

  const title = series?.title ?? "카드뉴스";
  const description = series?.description ?? "";
  const category = series?.category ?? "";
  const cardCount = series?.cards?.length ?? 0;
  const publishedAt = series?.publishedAt ?? "";

  const options: ConstructorParameters<typeof ImageResponse>[1] = { ...size };
  if (fontData) {
    options.fonts = [
      { name: "NanumGothic", data: fontData, style: "normal", weight: 400 },
    ];
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, #002a5c 0%, ${BRAND.navy} 55%, #001d40 100%)`,
          color: "#f5f1e6",
          fontFamily: fontData ? "NanumGothic" : "sans-serif",
          position: "relative",
        }}
      >
        {/* 상단 라벨 */}
        <div
          style={{
            position: "absolute",
            top: 52,
            left: 64,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 15,
            letterSpacing: "0.15em",
            color: BRAND.gold,
            fontWeight: 600,
          }}
        >
          <div style={{ width: 32, height: 2, background: BRAND.gold }} />
          연세교육공학회 · 카드뉴스
        </div>

        {/* 본문 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 64,
            paddingRight: 80,
            paddingTop: 100,
            height: "100%",
            width: "72%",
          }}
        >
          {/* 카테고리 배지 */}
          {category && (
            <div
              style={{
                display: "flex",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  background: "rgba(212,175,55,0.15)",
                  border: "1px solid rgba(212,175,55,0.4)",
                  color: "#e8c878",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
              >
                {category}
              </div>
            </div>
          )}

          {/* 제목 */}
          <div
            style={{
              fontSize: title.length > 30 ? 42 : 54,
              fontWeight: 800,
              lineHeight: 1.25,
              color: "#ffffff",
              marginBottom: 18,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>

          {/* 설명 */}
          {description && (
            <div
              style={{
                fontSize: 20,
                lineHeight: 1.6,
                color: "rgba(245,241,230,0.65)",
                marginBottom: 20,
              }}
            >
              {description.length > 80 ? description.slice(0, 80) + "…" : description}
            </div>
          )}

          {/* 메타 정보 */}
          <div style={{ display: "flex", gap: 12 }}>
            {publishedAt && (
              <div
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(245,241,230,0.6)",
                  fontSize: 13,
                }}
              >
                {publishedAt}
              </div>
            )}
            {cardCount > 0 && (
              <div
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(245,241,230,0.6)",
                  fontSize: 13,
                }}
              >
                총 {cardCount}장
              </div>
            )}
          </div>
        </div>

        {/* 우측 Y 모노그램 */}
        <div
          style={{
            position: "absolute",
            right: -20,
            top: 0,
            bottom: 0,
            width: "30%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 380,
              height: 380,
              borderRadius: "50%",
              border: "1px solid rgba(212,175,55,0.14)",
            }}
          />
          <div
            style={{
              fontSize: 260,
              fontWeight: 900,
              lineHeight: 1,
              background: `linear-gradient(160deg, #f4d77a 0%, ${BRAND.gold} 45%, #8a6b1c 100%)`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Y
          </div>
        </div>

        {/* 하단 푸터 */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 64,
            right: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 16,
            borderTop: "1px solid rgba(245,241,230,0.1)",
            fontSize: 14,
            color: "rgba(245,241,230,0.45)",
          }}
        >
          <span>연세대학교 교육대학원 · 교육공학전공</span>
          <span style={{ color: "rgba(212,175,55,0.6)", letterSpacing: "0.06em" }}>
            yonsei-edtech.vercel.app
          </span>
        </div>
      </div>
    ),
    options,
  );
}
