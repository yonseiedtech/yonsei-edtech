/**
 * Sprint 67-AE: 인터뷰 대상자 필터 매칭 헬퍼.
 *
 * 사용처: InterviewPlayer (응답 권한 검증) + InterviewBuilder (대상자 미리보기)
 */

import type {
  InterviewTargetCriteria,
  InterviewTargetRole,
  User,
} from "@/types";

/** 회원의 입학연도 추출 — user.entryYear → studentId 앞 4자리 fallback */
export function getUserEntryYear(user: User): number | null {
  const fromField = (user as { entryYear?: number }).entryYear;
  if (typeof fromField === "number" && fromField > 1900) return fromField;
  if (user.studentId) {
    const m = String(user.studentId).match(/^(\d{4})/);
    if (m) {
      const y = parseInt(m[1], 10);
      if (y >= 1980 && y <= 2100) return y;
    }
  }
  return null;
}

/**
 * 회원의 누적 학기차 (1=첫 학기, 2=두 번째 학기, …).
 * 현재 시점 기준으로 입학 후 몇 학기차인지.
 * 학기 구분: 3~8월=1학기, 9~익년 2월=2학기 (한국 학사 기준).
 */
export function getUserCumulativeSemesterCount(
  user: User,
  now: Date = new Date(),
): number | null {
  const entry = getUserEntryYear(user);
  if (!entry) return null;
  const entrySemester = (user as { entrySemester?: "first" | "second" }).entrySemester ?? "first";
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1; // 1~12
  const nowSemester: "first" | "second" = nowMonth >= 3 && nowMonth <= 8 ? "first" : "second";
  const yearDiff = nowYear - entry;
  let count = yearDiff * 2;
  // 입학 학기 → 현재 학기 보정
  if (entrySemester === "first" && nowSemester === "second") count += 1;
  if (entrySemester === "second" && nowSemester === "first")
    count = count - 1 + 1; // 9월 입학 → 익년 3월 = +1 학기
  // 같은 학기면 1학기차
  if (entrySemester === nowSemester && yearDiff === 0) count = 0;
  return count + 1; // 1-indexed
}

/** 회원이 어느 계층(role)에 속하는지 판정 */
export function getUserInterviewRoles(user: User): InterviewTargetRole[] {
  const roles: InterviewTargetRole[] = [];
  const academicLevel = (user as { academicLevel?: string }).academicLevel;
  const occupation = (user as { occupation?: string }).occupation;
  const role = (user as { role?: string }).role;

  if (academicLevel === "masters" || academicLevel === "ms") roles.push("masters");
  if (academicLevel === "doctoral" || academicLevel === "phd") roles.push("doctoral");
  if (academicLevel === "alumni" || (user as { isAlumni?: boolean }).isAlumni)
    roles.push("alumni");
  if (occupation === "professor" || academicLevel === "professor")
    roles.push("professor");
  if (role === "staff" || role === "admin" || role === "sysadmin")
    roles.push("staff");
  // 회원 정보 부족 시 guest 폴백
  if (roles.length === 0) roles.push("guest");

  return roles;
}

/**
 * 인터뷰 대상자 필터 매칭 — OR 조건.
 * criteria 가 없거나 모든 필드가 비어있으면 모든 회원이 매칭 (true).
 */
export function matchesInterviewTarget(
  user: User | null | undefined,
  criteria: InterviewTargetCriteria | undefined,
): boolean {
  if (!user) return false;
  if (!criteria) return true;

  const hasAnyFilter =
    !!(criteria.userIds && criteria.userIds.length > 0) ||
    !!(criteria.entryYears && criteria.entryYears.length > 0) ||
    !!(criteria.semesterCounts && criteria.semesterCounts.length > 0) ||
    !!(criteria.roles && criteria.roles.length > 0);
  if (!hasAnyFilter) return true;

  // userIds: 매칭되면 즉시 통과 — userId 또는 studentId 둘 다 검사 (운영자가 학번으로 지정 가능)
  if (criteria.userIds?.includes(user.id)) return true;
  if (user.studentId && criteria.userIds?.includes(String(user.studentId))) return true;

  // entryYears
  if (criteria.entryYears && criteria.entryYears.length > 0) {
    const y = getUserEntryYear(user);
    if (y != null && criteria.entryYears.includes(y)) return true;
  }

  // semesterCounts (1~6, 7+ 처리)
  if (criteria.semesterCounts && criteria.semesterCounts.length > 0) {
    const c = getUserCumulativeSemesterCount(user);
    if (c != null) {
      if (criteria.semesterCounts.includes(c)) return true;
      // 7+ (7 또는 그 이상)
      if (criteria.semesterCounts.includes(7) && c >= 7) return true;
    }
  }

  // roles
  if (criteria.roles && criteria.roles.length > 0) {
    const userRoles = getUserInterviewRoles(user);
    if (userRoles.some((r) => criteria.roles!.includes(r))) return true;
  }

  return false;
}

/** 사람이 읽을 수 있는 대상자 요약 문자열 */
export function describeInterviewTarget(criteria: InterviewTargetCriteria | undefined): string {
  if (!criteria) return "모든 회원";
  const parts: string[] = [];
  if (criteria.userIds && criteria.userIds.length > 0)
    parts.push(`특정 회원 ${criteria.userIds.length}명`);
  if (criteria.entryYears && criteria.entryYears.length > 0)
    parts.push(`입학 ${criteria.entryYears.join("·")}`);
  if (criteria.semesterCounts && criteria.semesterCounts.length > 0)
    parts.push(
      `${criteria.semesterCounts.map((c) => (c >= 7 ? "7학기차+" : `${c}학기차`)).join("·")}`,
    );
  if (criteria.roles && criteria.roles.length > 0) parts.push(criteria.roles.join("·"));
  return parts.length > 0 ? parts.join(" / ") : "모든 회원";
}

/** Builder UI 용 학기차 옵션 */
export const SEMESTER_COUNT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: "1학기차" },
  { value: 2, label: "2학기차" },
  { value: 3, label: "3학기차" },
  { value: 4, label: "4학기차" },
  { value: 5, label: "5학기차" },
  { value: 6, label: "6학기차" },
  { value: 7, label: "7학기차+" },
];
