import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "연세교육공학회 졸업생 논문";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PROJECT_ID = "yonsei-edtech";

interface FirestoreStringValue { stringValue: string }
interface FirestoreDocument {
  fields?: {
    title?: FirestoreStringValue;
    authorName?: FirestoreStringValue;
    awardedYearMonth?: FirestoreStringValue;
    graduationType?: FirestoreStringValue;
    keywords?: { arrayValue?: { values?: Array<{ stringValue?: string }> } };
  };
}

const GRADUATION_TYPE_LABELS: Record<string, string> = {
  thesis: "석사학위논문",
  research_report: "연구보고서",
};

async function fetchThesis(id: string): Promise<{
  title: string;
  authorName: string;
  awardedYearMonth: string;
  graduationType: string;
  keywords: string[];
} | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/alumni_theses/${id}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const doc: FirestoreDocument = await res.json();
    const f = doc.fields;
    if (!f) return null;

    const keywords = (f.keywords?.arrayValue?.values ?? [])
      .map((v) => v.stringValue)
      .filter((k): k is string => Boolean(k))
      .slice(0, 5);

    return {
      title: f.title?.stringValue ?? "학위논문",
      authorName: f.authorName?.stringValue ?? "",
      awardedYearMonth: f.awardedYearMonth?.stringValue ?? "",
      graduationType: f.graduationType?.stringValue ?? "thesis",
      keywords,
    };
  } catch {
    return null;
  }
}

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
  const [thesis, fontData] = await Promise.all([fetchThesis(id), fetchFont()]);

  const title = thesis?.title ?? "학위논문";
  const authorName = thesis?.authorName ?? "";
  const awardedYearMonth = thesis?.awardedYearMonth ?? "";
  const graduationType = thesis?.graduationType ?? "thesis";
  const keywords = thesis?.keywords ?? [];
  const typeLabel = GRADUATION_TYPE_LABELS[graduationType] ?? "학위논문";

  // 연도만 추출 (YYYY-MM → YYYY)
  const year = awardedYearMonth ? awardedYearMonth.slice(0, 4) : "";

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
          background:
            "linear-gradient(135deg, #0f1e3a 0%, #162545 50%, #0a1628 100%)",
          color: "#f0ece2",
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
            color: "#d4af37",
            fontWeight: 600,
          }}
        >
          <div style={{ width: 32, height: 2, background: "#d4af37" }} />
          연세교육공학회 · 학위논문 아카이브
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
            width: "78%",
          }}
        >
          {/* 유형 배지 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: "5px 13px",
                borderRadius: 999,
                background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.4)",
                color: "#e8c878",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              {typeLabel}
            </div>
            {year && (
              <div
                style={{
                  padding: "5px 13px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(240,236,226,0.65)",
                  fontSize: 13,
                }}
              >
                {year}
              </div>
            )}
          </div>

          {/* 제목 */}
          <div
            style={{
              fontSize: title.length > 35 ? 36 : title.length > 20 ? 44 : 52,
              fontWeight: 800,
              lineHeight: 1.3,
              color: "#ffffff",
              marginBottom: 20,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>

          {/* 저자 */}
          {authorName && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 20,
                color: "rgba(240,236,226,0.75)",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 18,
                  background: "#d4af37",
                  borderRadius: 2,
                }}
              />
              {authorName}
            </div>
          )}

          {/* 키워드 */}
          {keywords.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {keywords.map((kw) => (
                <div
                  key={kw}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(240,236,226,0.55)",
                    fontSize: 13,
                  }}
                >
                  {kw}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 우측 장식 */}
        <div
          style={{
            position: "absolute",
            right: -20,
            top: 0,
            bottom: 0,
            width: "26%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 340,
              height: 340,
              borderRadius: "50%",
              border: "1px solid rgba(212,175,55,0.12)",
            }}
          />
          <div
            style={{
              fontSize: 240,
              fontWeight: 900,
              lineHeight: 1,
              background: "linear-gradient(160deg, #f4d77a 0%, #d4af37 45%, #8a6b1c 100%)",
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
            borderTop: "1px solid rgba(240,236,226,0.1)",
            fontSize: 14,
            color: "rgba(240,236,226,0.45)",
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
