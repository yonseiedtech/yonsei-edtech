import type { AlumniThesis } from "@/types";

export const STOPWORDS = new Set([
  "연구",
  "교육",
  "교육공학",
  "학습",
  "분석",
  "사례",
  "효과",
  "관계",
  "영향",
  "방안",
  "모형",
  "프로그램",
  "활용",
  "탐색",
  "고찰",
  "개발",
  "적용",
  "설계",
  "수행",
  "조사",
  "비교",
  "검증",
  "구조",
  "변인",
  "특성",
  "수업",
  "학생",
  "학교",
  "학",
  "을",
  "를",
  "의",
]);

export function normalizeKeyword(raw: string): string {
  return raw.replace(/[\s·,()<>「」『』\[\]'"]/g, "").trim();
}

export function yearFrom(t: AlumniThesis): number | null {
  const m = (t.awardedYearMonth ?? "").match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

export function thesesYearRange(
  theses: AlumniThesis[],
  fallback: { min: number; max: number } = { min: 2000, max: new Date().getFullYear() },
): { min: number; max: number } {
  const ys = theses
    .map(yearFrom)
    .filter((y): y is number => y != null)
    .sort((a, b) => a - b);
  if (ys.length === 0) return fallback;
  return { min: ys[0], max: ys[ys.length - 1] };
}

/** 운영진 권한 — 분석 제한 논문 모아보기, 내부 메타데이터 등에 사용 */
export const STAFF_ROLES = ["sysadmin", "admin", "president", "staff", "advisor"] as const;
export function isStaffUser(user: { role?: string } | null | undefined): boolean {
  if (!user?.role) return false;
  return (STAFF_ROLES as readonly string[]).includes(user.role);
}

/** 시대 단위 옵션 (1년 / 3년 / 5년 / 10년) */
export const STEP_OPTIONS = [1, 3, 5, 10] as const;
export type StepYears = (typeof STEP_OPTIONS)[number];

export interface EraBucket {
  label: string;
  from: number;
  to: number;
}

/**
 * 연도 범위와 step에 따라 시대 버킷 생성.
 * step=1: 매년, step>=3: 그룹 (예: 5년 → "2000–04")
 * step의 배수에 맞춰 시작 정렬 (2003 + step 5 → 2000부터 시작)
 */
export function dynamicEras(
  yearMin: number,
  yearMax: number,
  step: StepYears,
): EraBucket[] {
  if (yearMax < yearMin) return [];
  const out: EraBucket[] = [];
  if (step === 1) {
    for (let y = yearMin; y <= yearMax; y++) {
      out.push({ label: String(y), from: y, to: y });
    }
    return out;
  }
  // step 배수 정렬: yearMin 이하의 배수에서 시작하되, 실제 첫 버킷은 yearMin부터 시작
  const alignedStart = Math.floor(yearMin / step) * step;
  const start = alignedStart < yearMin ? yearMin : alignedStart;
  for (let s = start; s <= yearMax; s += step) {
    const e = s + step - 1;
    const label = step >= 5 ? `${s}–${String(e).slice(-2)}` : `${s}–${e}`;
    out.push({ label, from: s, to: Math.min(e, yearMax) });
  }
  return out;
}

/** 주어진 buckets에서 year가 속하는 인덱스 — 해당 없음 시 -1 */
export function bucketIndexOf(buckets: EraBucket[], year: number): number {
  for (let i = 0; i < buckets.length; i++) {
    if (year >= buckets[i].from && year <= buckets[i].to) return i;
  }
  return -1;
}
