import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "연세교육공학회 세미나";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PROJECT_ID = "yonsei-edtech";

interface FirestoreStringValue { stringValue: string }
interface FirestoreDocument {
  fields?: {
    title?: FirestoreStringValue;
    date?: FirestoreStringValue;
    time?: FirestoreStringValue;
    location?: FirestoreStringValue;
    speaker?: FirestoreStringValue;
    speakers?: { arrayValue?: { values?: Array<{ mapValue?: { fields?: { name?: FirestoreStringValue } } }> } };
    description?: FirestoreStringValue;
    status?: FirestoreStringValue;
  };
}

async function fetchSeminar(id: string): Promise<{
  title: string;
  date: string;
  location: string;
  speakerName: string;
  description: string;
} | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/seminars/${id}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const doc: FirestoreDocument = await res.json();
    const f = doc.fields;
    if (!f) return null;

    // 다중 연사 우선, fallback 단일 연사
    let speakerName = f.speaker?.stringValue ?? "";
    const speakersArr = f.speakers?.arrayValue?.values;
    if (speakersArr && speakersArr.length > 0) {
      const names = speakersArr
        .map((v) => v.mapValue?.fields?.name?.stringValue)
        .filter((n): n is string => Boolean(n));
      if (names.length > 0) speakerName = names.join(", ");
    }

    return {
      title: f.title?.stringValue ?? "세미나",
      date: f.date?.stringValue ?? "",
      location: f.location?.stringValue ?? "",
      speakerName,
      description: f.description?.stringValue ?? "",
    };
  } catch {
    return null;
  }
}

async function fetchPretendardFont(): Promise<ArrayBuffer | null> {
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
  const [seminar, fontData] = await Promise.all([
    fetchSeminar(id),
    fetchPretendardFont(),
  ]);

  const title = seminar?.title ?? "세미나";
  const date = seminar?.date ?? "";
  const location = seminar?.location ?? "";
  const speakerName = seminar?.speakerName ?? "";

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
          // 브랜드 표준 네이비 #003378(연세 공식 엠블럼 / --primary 토큰) anchor
          background:
            "linear-gradient(135deg, #002a5c 0%, #003378 55%, #001d40 100%)",
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
            color: "#d4af37",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          <div style={{ width: 32, height: 2, background: "#d4af37" }} />
          연세교육공학회 · Seminar
        </div>

        {/* 본문 중앙 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 64,
            paddingRight: 64,
            paddingTop: 100,
            height: "100%",
            width: "72%",
          }}
        >
          <div
            style={{
              fontSize: title.length > 30 ? 42 : 54,
              fontWeight: 800,
              lineHeight: 1.25,
              color: "#ffffff",
              marginBottom: 24,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>

          {speakerName && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 22,
                color: "#e8c878",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 22,
                  background: "#d4af37",
                  borderRadius: 2,
                }}
              />
              {speakerName}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 8,
            }}
          >
            {date && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: "rgba(212,175,55,0.12)",
                  border: "1px solid rgba(212,175,55,0.35)",
                  color: "#e8c878",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                {date}
              </div>
            )}
            {location && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(245,241,230,0.75)",
                  fontSize: 15,
                  fontWeight: 400,
                }}
              >
                {location}
              </div>
            )}
          </div>
        </div>

        {/* 우측 Y 모노그램 */}
        <div
          style={{
            position: "absolute",
            right: -30,
            top: 0,
            bottom: 0,
            width: "32%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 400,
              height: 400,
              borderRadius: "50%",
              border: "1px solid rgba(212,175,55,0.15)",
            }}
          />
          <div
            style={{
              fontSize: 280,
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
            paddingTop: 18,
            borderTop: "1px solid rgba(245,241,230,0.1)",
            fontSize: 14,
            color: "rgba(245,241,230,0.5)",
          }}
        >
          <span>연세대학교 교육대학원 · 교육공학전공</span>
          <span style={{ color: "rgba(212,175,55,0.65)", letterSpacing: "0.06em" }}>
            yonsei-edtech.vercel.app
          </span>
        </div>
      </div>
    ),
    options,
  );
}
