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

/** YYYY-MM 형식의 from/to 범위 */
export interface SemesterRange {
  from: string;
  to: string;
  label: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 특정 연도/학기 범위
 * - first: YYYY-03 ~ YYYY-08
 * - second: YYYY-09 ~ (YYYY+1)-02
 */
export function semesterRange(year: number, semester: Semester): SemesterRange {
  if (semester === "first") {
    return {
      from: `${year}-03`,
      to: `${year}-08`,
      label: `${String(year).slice(2)}-1학기 (${year}.03~${year}.08)`,
    };
  }
  return {
    from: `${year}-09`,
    to: `${year + 1}-02`,
    label: `${String(year).slice(2)}-2학기 (${year}.09~${year + 1}.02)`,
  };
}

export function currentSemesterRange(now: Date = new Date()): SemesterRange {
  const { year, semester } = inferCurrentSemester(now);
  return semesterRange(year, semester);
}

export function previousSemesterRange(now: Date = new Date()): SemesterRange {
  const { year, semester } = inferCurrentSemester(now);
  if (semester === "first") {
    // 직전: 작년 후기
    return semesterRange(year - 1, "second");
  }
  // 후기 → 같은 해 전기
  return semesterRange(year, "first");
}

/** 올해 1~12월 전체 (YYYY-01 ~ YYYY-12) */
export function thisYearRange(now: Date = new Date()): SemesterRange {
  const y = now.getFullYear();
  return {
    from: `${y}-01`,
    to: `${y}-12`,
    label: `${y}년 전체 (${y}.01~${y}.12)`,
  };
}

/** YYYY-MM 두 개를 받아 그 사이의 일수(양 끝 포함) */
export function monthRangeDays(fromYM: string | null | undefined, toYM: string | null | undefined): number {
  const parse = (s: string | null | undefined) => {
    if (!s) return null;
    const m = /^(\d{4})-(\d{1,2})$/.exec(s.trim());
    if (!m) return null;
    return { y: Number(m[1]), m: Number(m[2]) };
  };
  const a = parse(fromYM);
  const b = parse(toYM);
  if (!a || !b) return 0;
  const start = new Date(Date.UTC(a.y, a.m - 1, 1));
  const endExclusive = new Date(Date.UTC(b.y, b.m, 1));
  if (endExclusive <= start) return 0;
  return Math.round((endExclusive.getTime() - start.getTime()) / 86400000);
}

/** 입학 시점 기준 1년차~N년차 범위 배열 */
export function enrollmentYearRanges(
  enrollmentYear: number,
  enrollmentHalf: number,
  now: Date = new Date(),
): SemesterRange[] {
  const ranges: SemesterRange[] = [];
  const startMonth = enrollmentHalf === 1 ? 3 : 9;

  for (let n = 0; ; n++) {
    const baseYear = enrollmentYear + n;
    const from = `${baseYear}-${pad(startMonth)}`;

    let endMonth = startMonth - 1;
    let endYear = baseYear + 1;
    if (endMonth === 0) {
      endMonth = 12;
      endYear = baseYear;
    }
    const to = `${endYear}-${pad(endMonth)}`;

    if (new Date(baseYear, startMonth - 1, 1) > now) break;

    ranges.push({
      from,
      to,
      label: `${n + 1}년차 (${baseYear}.${pad(startMonth)}~${endYear}.${pad(endMonth)})`,
    });
  }

  return ranges;
}

void pad;
