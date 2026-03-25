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

function mapRows(raw: string[][], columns: string[]): SpreadsheetRow[] {
  if (raw.length === 0) return [];

  const header = raw[0].map((h) => String(h ?? "").trim());
  // 헤더행에서 컬럼 매칭 시도
  const colIndices: number[] = columns.map((col) => {
    const idx = header.findIndex(
      (h) => h === col || h.includes(col) || col.includes(h),
    );
    return idx;
  });

  const hasHeader = colIndices.some((i) => i >= 0);
  const startRow = hasHeader ? 1 : 0;

  // 헤더 매칭 실패 시 순서대로 (A열, B열...)
  const finalIndices = colIndices.map((idx, i) =>
    idx >= 0 ? idx : i,
  );

  const rows: SpreadsheetRow[] = [];
  for (let r = startRow; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.every((c) => !c)) continue; // 빈 행 스킵
    const obj: SpreadsheetRow = {};
    columns.forEach((col, i) => {
      obj[col] = String(row[finalIndices[i]] ?? "").trim();
    });
    if (obj[columns[0]]) rows.push(obj); // 첫 번째 열(이름)이 있어야 유효
  }
  return rows;
}
