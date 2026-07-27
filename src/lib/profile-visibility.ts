/**
 * 프로필 페이지 접근 권한 + 섹션별 가시성 판정 (PR5)
 *
 * 핵심 원칙:
 * - 비로그인 외부인은 일반 회원 페이지를 절대 볼 수 없다.
 * - 운영진 페이지(role === "staff" | "president")만 일부 공개 허용.
 * - 섹션별 4단계: members(기본) / staff / shared(공유자까지) / private
 */

import type { SectionKey, SectionVisibility, User, UserRole } from "@/types";

export type ViaParam = "qr" | "link" | null;

export interface ViewerInfo {
  id?: string;
  role?: UserRole;
}

/** 페이지 접근 게이트 결과 */
export type PageAccess =
  | "full"               // 로그인 회원: 모든 섹션 가시성 규칙대로 접근
  | "staff-public-only"  // 비로그인이 운영진 페이지에 접근: 일부 노출
  | "blocked";           // 비로그인이 일반 회원 페이지: 차단

/** 운영진 여부 (staff / president) */
export function isStaffRole(role?: UserRole): boolean {
  return role === "staff" || role === "president";
}

/**
 * 페이지 접근 게이트.
 * - 로그인 회원 → "full"
 * - 비로그인 + via=qr|link → "staff-public-only" (명함 교환 컨텍스트 — 기본 정보만 노출)
 * - 비로그인 + 운영진 페이지 → "staff-public-only"
 * - 그 외 비로그인 → "blocked"
 *
 * Sprint 67: QR/링크 명함 교환 시 비로그인도 기본 정보를 볼 수 있어야 명함 기능이 동작.
 */
export function canAccessProfilePage(
  viewer: ViewerInfo | null,
  owner: User,
  via: ViaParam,
): PageAccess {
  if (viewer?.id) return "full";
  // QR/링크 명함 교환 컨텍스트 — 비로그인도 기본 정보(이름·사진·연락처 일부) 노출
  if (via === "qr" || via === "link") return "staff-public-only";
  if (isStaffRole(owner.role)) return "staff-public-only";
  return "blocked";
}

/**
 * 섹션 단위 가시성 판정.
 * - 본인 → 항상 true
 * - level === "private" → false (본인 외 모두 차단)
 * - level === "staff" → 운영진만
 * - level === "members" (기본) → 로그인 회원만
 * - level === "shared" → 로그인 회원 + (운영진 페이지 한정) ?via=qr|link 보유 비로그인
 */
export function canViewSection(
  section: SectionKey,
  viewer: ViewerInfo | null,
  owner: User,
  via: ViaParam,
): boolean {
  if (viewer?.id && viewer.id === owner.id) return true;

  // Sprint 67-G: 섹션별 기본 공개 범위 — 명함 핵심 정보(이메일/전화/SNS)는 공유자까지 기본 공개
  const SECTION_DEFAULT: Partial<Record<SectionKey, SectionVisibility>> = {
    email: "shared",
    phone: "shared",
    socials: "shared",
  };
  const level: SectionVisibility =
    owner.sectionVisibility?.[section] ?? SECTION_DEFAULT[section] ?? "members";
  const viewerStaff = isStaffRole(viewer?.role);
  const hasVia = via === "qr" || via === "link";

  switch (level) {
    case "private":
      return false;
    case "staff":
      return viewerStaff;
    case "members":
      // 로그인 회원만 — 운영진 페이지 비로그인 게스트는 차단
      return !!viewer?.id;
    case "shared":
      // 로그인 회원은 무조건 노출.
      // 비로그인은 운영진 페이지에 접근한 경우(canAccessProfilePage가 staff-public-only)
      // + via=qr|link 일 때만 노출.
      if (viewer?.id) return true;
      if (isStaffRole(owner.role) && hasVia) return true;
      return false;
    default:
      return false;
  }
}

/**
 * 운영진 페이지의 비로그인 외부인에게 항상 보이는 기본 정보 여부.
 * (canAccessProfilePage === "staff-public-only" 일 때 적용)
 */
export function isAlwaysPublicForStaff(
  field:
    | "name"
    | "role"
    | "position"
    | "profileImage"
    | "enrollment"
    | "graduateInfo"
    | "bio"
    | "officialEmail",
): boolean {
  return [
    "name",
    "role",
    "position",
    "profileImage",
    "enrollment",
    "graduateInfo",
    "bio",
    "officialEmail",
  ].includes(field);
}

const isStr = (x: unknown): x is string => typeof x === "string";
const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null;

/** 배열이 아니면 [], 배열이면 술어를 통과하는 원소만 유지. 레거시/손상 문서 방어. */
function safeArray<T>(v: unknown, keep: (x: unknown) => x is T): T[] {
  return Array.isArray(v) ? v.filter(keep) : [];
}

/**
 * 사용자 입력값 안전 처리: 기본값 채움 + 프로필 렌더 크래시 방어.
 *
 * 레거시/부분 저장 문서에서 배열·문자열 필드가 누락되거나 잘못된 타입(예: 문자열
 * 배열 자리에 객체, 문자열 자리에 숫자·Timestamp)으로 들어오면, 프로필 자식
 * 컴포넌트의 `.map`/`.split`/`.trim`/`.length` 접근이 SSR/CSR 렌더 중 throw →
 * 라우트 error 경계가 트립되어 프로필 페이지 전체가 붕괴한다.
 * owner 는 SSR initialOwner 와 CSR refetch 양쪽에서 이 함수를 거치므로, 여기서
 * 타입을 한 번에 정규화해 모든 소비 컴포넌트를 보호한다. (seminar-normalize 선례)
 */
export function withGraduateDefaults(user: User): User {
  return {
    ...user,
    university: user.university || "연세대학교",
    graduateSchool: user.graduateSchool || "교육대학원",
    graduateMajor: user.graduateMajor || "교육공학전공",
    // 문자열 배열 필드 — 배열 + 원소까지 문자열 보장 (element-level .split/.map 방어)
    researchInterests: safeArray(user.researchInterests, isStr),
    interestKeywords: safeArray(user.interestKeywords, isStr),
    researchTopics: safeArray(user.researchTopics, isStr),
    mentorTopics: safeArray(user.mentorTopics, isStr),
    thesisReadingList: safeArray(user.thesisReadingList, isStr),
    onboardingBadges: safeArray(
      user.onboardingBadges,
      isStr,
    ) as User["onboardingBadges"],
    // 객체 배열 필드 — 배열 보장 (.map/.length 방어)
    socials: safeArray(user.socials, isObj) as unknown as User["socials"],
    recentPapers: safeArray(user.recentPapers, isObj) as unknown as User["recentPapers"],
    // 문자열 필드 — 문자열 아니면 안전값으로 (.trim/.slice 방어)
    bio: isStr(user.bio) ? user.bio : undefined,
    field: isStr(user.field) ? user.field : "",
  };
}
