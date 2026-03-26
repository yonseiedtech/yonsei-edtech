import * as XLSX from "xlsx";

export interface SpreadsheetRow {
  [key: string]: string;
}

/**
 * 엑셀/CSV 파일을 파싱하여 행 배열로 반환
 * @param file 업로드된 파일
 * @param columns 기대하는 열 이름 (예: ["이름", "학번"])
 */
export async function parseExcelFile(
  file: File,
  columns: string[],
): Promise<SpreadsheetRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  return mapRows(raw as string[][], columns);
}

/**
 * CSV 텍스트를 파싱하여 행 배열로 반환
 */
export function parseCSVText(
  text: string,
  columns: string[],
): SpreadsheetRow[] {
  const wb = XLSX.read(text, { type: "string" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  return mapRows(raw as string[][], columns);
}

/**
 * 구글 스프레드시트 URL에서 시트 ID 추출
 */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * 구글 시트 CSV export URL 생성
 */
export function getSheetCsvUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
}

// ── 내부 헬퍼 ──

// 동의어 매핑 (구글폼 헤더 ↔ 코드 열 이름)
const SYNONYMS: Record<string, string[]> = {
  "이메일": ["이메일", "email", "메일"],
  "전화번호": ["전화번호", "연락처", "전화", "핸드폰", "phone"],
  "관심분야": ["관심분야", "관심 분야", "분야"],
  "기타 질문사항": ["기타 질문사항", "질문사항", "질문", "메모", "기타"],
  "소속": ["소속", "소속기관", "학교", "affiliation"],
  "누적학기": ["누적학기", "학기"],
  "이름": ["이름", "성명", "name"],
  "학번": ["학번", "학생번호", "studentId"],
};

function normalizeHeader(h: string): string {
  return h.replace(/^\d+\.\s*/, "").replace(/\([^)]*\)\s*/g, "").trim();
}

function findColumnIndex(header: string[], col: string): number {
  // 1. 정확히 일치
  const exact = header.findIndex((h) => h === col);
  if (exact >= 0) return exact;
  // 2. 동의어 매핑: col의 동의어 그룹 찾기
  for (const [, synonyms] of Object.entries(SYNONYMS)) {
    if (synonyms.some((s) => s === col || col.includes(s) || s.includes(col))) {
      // 이 동의어 그룹에서 헤더와 매칭되는 것 찾기
      const idx = header.findIndex((h) =>
        synonyms.some((s) => h === s || h.includes(s) || s.includes(h)),
      );
      if (idx >= 0) return idx;
    }
  }
  // 3. 부분 문자열 매칭
  const partial = header.findIndex((h) => h.includes(col) || col.includes(h));
  return partial;
}

function mapRows(raw: string[][], columns: string[]): SpreadsheetRow[] {
  if (raw.length === 0) return [];

  const header = raw[0].map((h) => normalizeHeader(String(h ?? "")));
  // 헤더행에서 컬럼 매칭 시도 (동의어 매핑 + 정규화)
  const colIndices: number[] = columns.map((col) => findColumnIndex(header, col));

  const hasHeader = colIndices.some((i) => i >= 0);
  const startRow = hasHeader ? 1 : 0;

  // 매칭된 열만 사용, 매칭 실패 시 -1 유지 (빈 값 반환)
  // 단, 모든 열이 매칭 실패하면 순서대로 폴백
  const matchCount = colIndices.filter((i) => i >= 0).length;
  const finalIndices = matchCount > 0
    ? colIndices
    : colIndices.map((_, i) => i);

  const rows: SpreadsheetRow[] = [];
  for (let r = startRow; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.every((c) => !c)) continue; // 빈 행 스킵
    const obj: SpreadsheetRow = {};
    columns.forEach((col, i) => {
      const idx = finalIndices[i];
      const val = idx >= 0 ? row[idx] : undefined;
      obj[col] = val != null ? String(val).trim() : "";
    });
    if (obj[columns[0]]) rows.push(obj); // 첫 번째 열(이름)이 있어야 유효
  }
  return rows;
}
