import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const runtime = "edge";
export const alt = "연세교육공학회 아카이브";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PROJECT_ID = "yonsei-edtech";

type ArchiveItemType = "concept" | "variable" | "measurement";

const COLLECTION_MAP: Record<ArchiveItemType, string> = {
  concept: "archive_concepts",
  variable: "archive_variables",
  measurement: "archive_measurements",
};

const TYPE_LABELS: Record<ArchiveItemType, string> = {
  concept: "개념",
  variable: "변인",
  measurement: "측정도구",
};

const TYPE_ACCENT: Record<ArchiveItemType, string> = {
  concept: "#7c6fcd",
  variable: "#3b82f6",
  measurement: "#10b981",
};

interface FirestoreStringValue { stringValue: string }
interface FirestoreDocument {
  fields?: {
    name?: FirestoreStringValue;
    nameEn?: FirestoreStringValue;
    description?: FirestoreStringValue;
    definition?: FirestoreStringValue;
    tags?: { arrayValue?: { values?: Array<{ stringValue?: string }> } };
    keywords?: { arrayValue?: { values?: Array<{ stringValue?: string }> } };
  };
}

async function fetchArchiveItem(type: ArchiveItemType, id: string): Promise<{
  name: string;
  nameEn: string;
  description: string;
  tags: string[];
} | null> {
  const collection = COLLECTION_MAP[type];
  if (!collection) return null;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${id}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const doc: FirestoreDocument = await res.json();
    const f = doc.fields;
    if (!f) return null;

    const tagValues = f.tags?.arrayValue?.values ?? f.keywords?.arrayValue?.values ?? [];
    const tags = tagValues
      .map((v) => v.stringValue)
      .filter((t): t is string => Boolean(t))
      .slice(0, 5);

    return {
      name: f.name?.stringValue ?? "아카이브 항목",
      nameEn: f.nameEn?.stringValue ?? "",
      description: (f.description?.stringValue ?? f.definition?.stringValue ?? "").slice(0, 120),
      tags,
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
  params: Promise<{ type: string; id: string }>;
}) {
  const { type: rawType, id } = await params;
  const type = rawType as ArchiveItemType;
  const isValidType = type === "concept" || type === "variable" || type === "measurement";

  const [item, fontData] = await Promise.all([
    isValidType ? fetchArchiveItem(type, id) : Promise.resolve(null),
    fetchFont(),
  ]);

  const typeLabel = isValidType ? TYPE_LABELS[type] : "아카이브";
  const accentColor = isValidType ? TYPE_ACCENT[type] : BRAND.gold;
  const name = item?.name ?? "교육공학 아카이브";
  const nameEn = item?.nameEn ?? "";
  const description = item?.description ?? "";
  const tags = item?.tags ?? [];

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
          background: `linear-gradient(135deg, #002a5c 0%, ${BRAND.navy} 50%, #001d40 100%)`,
          color: "#f0ece2",
          fontFamily: fontData ? "NanumGothic" : "sans-serif",
          position: "relative",
        }}
      >
        {/* 좌측 강조 선 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            background: `linear-gradient(180deg, ${accentColor}cc 0%, ${accentColor}44 100%)`,
          }}
        />

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
            letterSpacing: "0.12em",
            color: BRAND.gold,
            fontWeight: 600,
          }}
        >
          <div style={{ width: 28, height: 2, background: BRAND.gold }} />
          연세교육공학회 · 교육공학 아카이브
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
            width: "76%",
          }}
        >
          {/* 유형 배지 */}
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
                background: `${accentColor}22`,
                border: `1px solid ${accentColor}66`,
                color: accentColor,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              {typeLabel}
            </div>
          </div>

          {/* 이름 */}
          <div
            style={{
              fontSize: name.length > 25 ? 48 : 60,
              fontWeight: 800,
              lineHeight: 1.2,
              color: "#ffffff",
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            {name}
          </div>

          {/* 영문명 */}
          {nameEn && (
            <div
              style={{
                fontSize: 20,
                color: "rgba(240,236,226,0.5)",
                marginBottom: 18,
                fontStyle: "italic",
                letterSpacing: "0.01em",
              }}
            >
              {nameEn}
            </div>
          )}

          {/* 설명 */}
          {description && (
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.6,
                color: "rgba(240,236,226,0.7)",
                marginBottom: 20,
                display: "-webkit-box",
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          )}

          {/* 태그 */}
          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    padding: "4px 11px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(240,236,226,0.5)",
                    fontSize: 12,
                  }}
                >
                  #{tag}
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
            width: "28%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.7,
          }}
        >
          <div
            style={{
              fontSize: 240,
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
            borderTop: "1px solid rgba(240,236,226,0.08)",
            fontSize: 14,
            color: "rgba(240,236,226,0.4)",
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
