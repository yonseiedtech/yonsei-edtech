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

/** 사용자 입력값 안전 처리: 기본값 채움 */
export function withGraduateDefaults(user: User): User {
  return {
    ...user,
    university: user.university || "연세대학교",
    graduateSchool: user.graduateSchool || "교육대학원",
    graduateMajor: user.graduateMajor || "교육공학전공",
  };
}
