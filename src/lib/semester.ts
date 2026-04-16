export type Semester = "first" | "second";

export function formatSemester(
  year: number | undefined | null,
  semester: Semester | undefined | null
): string {
  if (!year && !semester) return "";
  const y = year ? `${year}년` : "";
  const s = semester === "first" ? "전기" : semester === "second" ? "후기" : "";
  return [y, s].filter(Boolean).join(" ");
}

/** 현재 KST 기준 추정 학기 (3~8월=전기, 9~2월=후기) */
export function inferCurrentSemester(now: Date = new Date()): {
  year: number;
  semester: Semester;
} {
  const month = now.getMonth() + 1; // 1~12
  if (month >= 3 && month <= 8) {
    return { year: now.getFullYear(), semester: "first" };
  }
  // 9~12월: 그 해 후기 / 1~2월: 작년 후기
  const year = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return { year, semester: "second" };
}
