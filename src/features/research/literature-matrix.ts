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

/** 고도화(2026-07-04): 선택형 추가 열 — 기존 논문 필드 재사용 (편집 가능 열만 textarea) */
export const EXTRA_MATRIX_COLUMNS = [
  { key: "myConnection" as const, label: "내 연구와의 연결", editable: true },
  { key: "variables" as const, label: "변인", editable: false },
  { key: "rating" as const, label: "평점", editable: false },
] as const;

export type ExtraMatrixColumnKey = (typeof EXTRA_MATRIX_COLUMNS)[number]["key"];
export type AnyMatrixColumnKey = MatrixColumnKey | ExtraMatrixColumnKey;

export const ALL_MATRIX_COLUMNS: { key: AnyMatrixColumnKey; label: string; editable: boolean }[] = [
  ...MATRIX_COLUMNS.map((c) => ({ ...c, editable: true })),
  ...EXTRA_MATRIX_COLUMNS.map((c) => ({ key: c.key, label: c.label, editable: c.editable })),
];

/** 읽기 전용 열의 표시값 */
export function readonlyCellValue(p: ResearchPaper, key: AnyMatrixColumnKey): string {
  if (key === "variables") {
    const v = p.variables;
    if (!v) return "";
    const parts: string[] = [];
    if (v.independent?.length) parts.push(`독립: ${v.independent.join(", ")}`);
    if (v.dependent?.length) parts.push(`종속: ${v.dependent.join(", ")}`);
    if (v.mediator?.length) parts.push(`매개: ${v.mediator.join(", ")}`);
    if (v.moderator?.length) parts.push(`조절: ${v.moderator.join(", ")}`);
    return parts.join(" / ");
  }
  if (key === "rating") return p.rating ? "★".repeat(p.rating) : "";
  return (p[key as MatrixColumnKey | "myConnection"] as string | undefined) ?? "";
}

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
 * columns 미지정 시 기본 4열 (에디터 삽입 파이프 호환).
 */
export function buildMatrixTable(
  papers: ResearchPaper[],
  columns: { key: AnyMatrixColumnKey; label: string }[] = MATRIX_COLUMNS,
): string {
  const rows = papers
    .filter((p) => !p.isDraft && hasMatrixData(p))
    .sort((a, b) => {
      const an = (a.authors ?? a.title ?? "").localeCompare(b.authors ?? b.title ?? "", "ko");
      if (an !== 0) return an;
      return (a.year ?? 0) - (b.year ?? 0);
    });
  if (rows.length === 0) return "";
  const header = ["연구자(연도)", ...columns.map((c) => c.label)].join(" | ");
  const body = rows.map((p) =>
    [paperLabel(p), ...columns.map((c) => cell(readonlyCellValue(p, c.key)))].join(" | "),
  );
  return `<표 _-_> 선행연구 비교\n${header}\n${body.join("\n")}`;
}

/** CSV 생성 — Excel 호환(BOM은 호출부에서), 수식 인젝션 중화 */
export function buildMatrixCsv(
  papers: ResearchPaper[],
  columns: { key: AnyMatrixColumnKey; label: string }[],
): string {
  const esc = (v: string): string => {
    let t = (v ?? "").replace(/\r?\n/g, " ").trim();
    if (/^[=+\-@]/.test(t)) t = `'${t}`;
    if (/[",]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
    return t;
  };
  const rows = papers.filter((p) => !p.isDraft);
  const header = ["연구자", "연도", "제목", ...columns.map((c) => c.label)].map(esc).join(",");
  const body = rows.map((p) =>
    [p.authors ?? "", p.year ? String(p.year) : "", p.title ?? "", ...columns.map((c) => readonlyCellValue(p, c.key))]
      .map(esc)
      .join(","),
  );
  return [header, ...body].join("\n");
}
