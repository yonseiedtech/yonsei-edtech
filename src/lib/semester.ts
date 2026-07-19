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

/**
 * 현재 학기 키 — "YYYY-1"(전기) | "YYYY-2"(후기).
 * KST 기준이라 클라이언트/서버(UTC) 어디서 호출해도 동일 결과.
 * 학기 자동 진행 cron 의 멱등성 앵커 + 프로필 저장 시 앵커 스탬프에 사용.
 */
export function currentSemesterKey(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  if (m >= 3 && m <= 8) return `${y}-1`;
  // 9~12월: 그 해 후기 / 1~2월: 작년 후기
  return m >= 9 ? `${y}-2` : `${y - 1}-2`;
}

/**
 * 임의 시각(ISO)의 학기 키 — "YYYY-1"(전기) | "YYYY-2"(후기).
 * 모임·행사 저장 시 startAt 으로부터 semesterKey 를 자동 산정하거나,
 * 레거시 이벤트를 표시 시점에 일시로부터 유도할 때 사용(백필 불요, 하위호환).
 * 빈 문자열·파싱 불가 시 null.
 */
export function semesterKeyOf(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return currentSemesterKey(d);
}

/**
 * 회원의 코호트(가입 기수) 학기 키 — "YYYY-1"(전기) | "YYYY-2"(후기) | null.
 * M1(8월 신입 코호트): 신규 컬렉션·필드 강제 없이 기존 회원 문서에서 가입 학기를 파생.
 *  1) enrollmentYear + enrollmentHalf(1|2) 우선 — 연락망 "입학시점"과 동일 소스.
 *  2) 없으면 createdAt(가입일)로부터 학기 키 유도(semesterKeyOf 재사용).
 * 둘 다 없으면 null(코호트 미상).
 */
export function cohortKeyOf(member: {
  enrollmentYear?: number | null;
  enrollmentHalf?: number | null;
  createdAt?: string | null;
}): string | null {
  const { enrollmentYear, enrollmentHalf } = member;
  if (enrollmentYear && (enrollmentHalf === 1 || enrollmentHalf === 2)) {
    return `${enrollmentYear}-${enrollmentHalf}`;
  }
  return semesterKeyOf(member.createdAt);
}

/**
 * 학기 키("YYYY-1" | "YYYY-2") → 표시 라벨. formatSemester 와 동일한 전기/후기 어법.
 * 예: "2026-2" → "2026년 후기". 형식이 아니면 원문 반환.
 */
export function semesterLabelFromKey(key: string | undefined | null): string {
  if (!key) return "";
  const m = /^(\d{4})-([12])$/.exec(key.trim());
  if (!m) return key;
  const year = m[1];
  const half = m[2] === "1" ? "전기" : "후기";
  return `${year}년 ${half}`;
}

/**
 * 학기 키를 delta 학기만큼 이동. "2026-2" +1 → "2027-1", -1 → "2026-1".
 * 형식("YYYY-1" | "YYYY-2")이 아니면 null.
 */
export function shiftSemesterKey(key: string | undefined | null, delta: number): string | null {
  if (!key) return null;
  const m = /^(\d{4})-([12])$/.exec(key.trim());
  if (!m) return null;
  // 학기 인덱스(0-based): year*2 + (half-1)
  const idx = Number(m[1]) * 2 + (Number(m[2]) - 1) + delta;
  const y = Math.floor(idx / 2);
  const half = (idx % 2) + 1;
  return `${y}-${half}`;
}

/**
 * 현재 학기 기준 앞뒤 학기 키 목록(미래→과거 순, 즉 최신이 앞).
 * back=과거 학기 수, forward=미래 학기 수. 학사일정 관행처럼 몇 학기 앞뒤로 생성.
 */
export function listSemesterKeys(back = 4, forward = 1, now: Date = new Date()): string[] {
  const cur = currentSemesterKey(now);
  const keys: string[] = [];
  for (let d = forward; d >= -back; d--) {
    const k = shiftSemesterKey(cur, d);
    if (k) keys.push(k);
  }
  return keys;
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
