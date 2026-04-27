/**
 * CSV 내보내기 유틸리티
 * BOM(Byte Order Mark)을 추가하여 Excel에서 한글이 깨지지 않도록 처리
 */

import { todayYmdLocal } from "./dday";

export function exportCSV(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
) {
  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\n");

  // UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${todayYmdLocal()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
