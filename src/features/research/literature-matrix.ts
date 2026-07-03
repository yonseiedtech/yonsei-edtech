import type { ResearchPaper } from "@/types";

/**
 * 문헌 리뷰 매트릭스 (R4, 2026-07-03) — 공용 헬퍼
 *
 * '읽은 논문'(ResearchPaper)의 기존 분석 필드를 비교표 열로 재사용한다:
 *   대상(sample) · 설계·방법(methodology) · 주요 결과(findings) · 시사점(insights)
 * 표 텍스트는 논문 에디터(이론적 배경)·연구보고서(선행연구 분석)에 삽입된다.
 */

export const MATRIX_COLUMNS = [
  { key: "sample" as const, label: "대상" },
  { key: "methodology" as const, label: "설계·방법" },
  { key: "findings" as const, label: "주요 결과" },
  { key: "insights" as const, label: "시사점" },
];

export type MatrixColumnKey = (typeof MATRIX_COLUMNS)[number]["key"];

/** 매트릭스 열 중 하나라도 채워진 논문인지 */
export function hasMatrixData(p: ResearchPaper): boolean {
  return MATRIX_COLUMNS.some((c) => !!p[c.key]?.trim());
}

/** 연구자(연도) 라벨 — 저자 없으면 제목 앞부분으로 폴백 */
export function paperLabel(p: ResearchPaper): string {
  const author = (p.authors ?? "").trim();
  const year = p.year ? `(${p.year})` : "";
  if (author) return `${author}${year}`;
  const t = (p.title ?? "").trim();
  return (t.length > 20 ? `${t.slice(0, 20)}…` : t) + year;
}

/** 셀 텍스트 정리 — 줄바꿈·파이프 제거(표 구분자 보호), 빈 값은 ___ */
function cell(v: string | undefined): string {
  const t = (v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
  return t || "___";
}

/**
 * 선행연구 비교표 텍스트 생성 — 파이프 구분(에디터 표 관례와 동일).
 * 매트릭스 데이터가 있는 논문만 포함하고 저자·연도순 정렬.
 */
export function buildMatrixTable(papers: ResearchPaper[]): string {
  const rows = papers
    .filter((p) => !p.isDraft && hasMatrixData(p))
    .sort((a, b) => {
      const an = (a.authors ?? a.title ?? "").localeCompare(b.authors ?? b.title ?? "", "ko");
      if (an !== 0) return an;
      return (a.year ?? 0) - (b.year ?? 0);
    });
  if (rows.length === 0) return "";
  const header = ["연구자(연도)", ...MATRIX_COLUMNS.map((c) => c.label)].join(" | ");
  const body = rows.map((p) =>
    [paperLabel(p), ...MATRIX_COLUMNS.map((c) => cell(p[c.key]))].join(" | "),
  );
  return `<표 _-_> 선행연구 비교\n${header}\n${body.join("\n")}`;
}
