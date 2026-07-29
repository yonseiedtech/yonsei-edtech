/**
 * 조직도(org_chart) ↔ 대학원 생활 활동 이력(grad_life_positions) 연동 공용 매핑.
 *
 * - 제안서: docs/plans/staff-record-profile-sync.md §3 (권장안 C — 승인형 강화)
 * - OrgRole → GradLifeRole 우선 매핑 + 직책명 추론(inferGradRole) 폴백
 * - 멱등 upsert 키(sourceOrgKey) 생성, 학기 키 → 시작 학기 변환
 *
 * 순수 함수 모듈(클라이언트 지시자 없음). OrgRole 은 타입만 참조하여 런타임 결합 없음.
 */
import type { GradLifeRole, GradLifeSemester } from "@/types";
import type { OrgRole } from "@/features/admin/settings/useOrgChart";

/**
 * 조직도 직책명 → grad-life 역할 추론(불확실하면 society_staff).
 * 프리필/폴백 편의용 — GradLifePositionsList 프리필과 OrgChartEditor 반영에서 공용.
 */
export function inferGradRole(title: string): GradLifeRole {
  const t = title.trim();
  if (t.includes("부학회장") || t.includes("부회장")) return "society_vice_president";
  if (t.includes("학회장") || t.includes("회장")) return "society_president";
  if (t.includes("전공대표")) return "major_rep";
  if (t.includes("조교")) return "ta";
  if (t.includes("자문") || t.includes("지도")) return "student_advisor";
  return "society_staff";
}

/**
 * 조직도 직책(OrgRole 우선, 없으면 직책명 추론) → grad-life 역할.
 * 반영 대상이 아니면 `null`(호출부에서 스킵):
 *  - `professor`(교수) → 스킵 (학생 이력이 아님)
 *  - `direct_aide` 중 "졸업생 대표" → 스킵
 *  - `advisor` 중 교수 자문(직책명에 "교수") → 스킵 (학생 자문위원만 반영)
 *
 * NOTE: `userId` 부재(공석)·비회원 여부는 이 함수가 판정하지 않음 — 호출부에서 `userId` 존재를 별도 확인.
 */
export function mapOrgRoleToGradRole(pos: { role?: OrgRole; title: string }): GradLifeRole | null {
  const title = (pos.title ?? "").trim();
  switch (pos.role) {
    case "professor":
      return null;
    case "president":
      return "society_president";
    case "vice_president":
      return "society_vice_president";
    case "team_member":
      return "society_staff";
    case "direct_aide":
      if (title.includes("졸업생")) return null;
      if (title.includes("전공대표")) return "major_rep";
      if (title.includes("조교")) return "ta";
      return "society_staff";
    case "advisor":
      if (title.includes("교수")) return null;
      return "student_advisor";
    default:
      // 역할 미지정 → 직책명 추론(폴백)
      return inferGradRole(title);
  }
}

/**
 * 멱등 upsert 키. 예: `org_chart:2026-2#pos_123` (학기 + 직책 고유).
 * 이 값으로 이미 반영된 grad_life 문서를 찾아 create 대신 update.
 */
export function buildSourceOrgKey(semesterKey: string, positionId: string): string {
  return `org_chart:${semesterKey}#${positionId}`;
}

/**
 * 학기 키("YYYY-1"|"YYYY-2") → grad-life 시작 학기. 형식이 아니면 `null`.
 * 종료 학기는 매핑하지 않음(진행중) — 자동 종료 금지(제안서 §3·§6).
 */
export function semesterKeyToGradStart(
  semesterKey: string,
): { startYear: number; startSemester: GradLifeSemester } | null {
  const m = /^(\d{4})-([12])$/.exec(semesterKey.trim());
  if (!m) return null;
  return { startYear: Number(m[1]), startSemester: m[2] === "1" ? "first" : "second" };
}
