/**
 * 데이터 붙여넣기 파서 (2026-06-13, 사이클 41 — DataAnalyzer 에서 분리)
 *
 * 엑셀/CSV 클립보드 텍스트를 열 단위 구조로 파싱한다.
 *  - 첫 행 = 변수명 (빈 헤더는 "변수N" 폴백)
 *  - 구분자: 첫 행에 탭이 있으면 탭, 없으면 쉼표
 *  - 타입 추론: 열의 80% 이상이 숫자면 numeric
 *  - 빈 셀은 NaN (결측)
 * 순수 함수 — 경계 케이스는 테스트로 검증.
 */

export interface ParsedData {
  headers: string[];
  /** 열 단위 원자료 (문자열) */
  columns: string[][];
  /** 열별 숫자 변환 (실패·결측 NaN) */
  numeric: number[][];
  /** 열별 타입 추론 */
  isNumeric: boolean[];
  rowCount: number;
}

export function parseClipboard(text: string): ParsedData | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const rows = lines.map((l) => l.split(delim).map((c) => c.trim()));
  const headers = rows[0].map((h, i) => h || `변수${i + 1}`);
  const body = rows.slice(1).filter((r) => r.some((c) => c.length > 0));
  if (body.length < 2) return null;
  const colCount = headers.length;
  const columns: string[][] = Array.from({ length: colCount }, (_, j) =>
    body.map((r) => r[j] ?? ""),
  );
  const numeric = columns.map((col) => col.map((v) => (v === "" ? NaN : Number(v))));
  const isNumeric = numeric.map(
    (col) => col.filter((v) => !Number.isNaN(v)).length >= col.length * 0.8,
  );
  return { headers, columns, numeric, isNumeric, rowCount: body.length };
}
