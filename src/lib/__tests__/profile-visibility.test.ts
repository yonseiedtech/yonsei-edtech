/**
 * profile-visibility.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 프로필 접근 게이트 + 섹션 가시성은 회원 개인정보 보호의 핵심 로직.
 * 비로그인/QR/링크/운영진 경우의 수를 모두 검증.
 */

import { describe, expect, it } from "vitest";
import {
  canAccessProfilePage,
  canViewSection,
  isAlwaysPublicForStaff,
  isStaffRole,
  withGraduateDefaults,
} from "@/lib/profile-visibility";
import type { User } from "@/types";

function mkUser(partial: Partial<User> = {}): User {
  return {
    id: "u_test",
    name: "테스트",
    email: "test@yonsei.ac.kr",
    role: "member",
    approved: true,
    rejected: false,
    createdAt: "2026-01-01T00:00:00Z",
    ...partial,
  } as unknown as User;
}

// ── isStaffRole ──────────────────────────────────────────────────────────────

describe("isStaffRole", () => {
  it("staff → true", () => expect(isStaffRole("staff")).toBe(true));
  it("president → true", () => expect(isStaffRole("president")).toBe(true));
  it("member → false", () => expect(isStaffRole("member")).toBe(false));
  it("admin → false", () => expect(isStaffRole("admin")).toBe(false));
  it("undefined → false", () => expect(isStaffRole(undefined)).toBe(false));
});

// ── canAccessProfilePage ─────────────────────────────────────────────────────

describe("canAccessProfilePage", () => {
  const staffOwner = mkUser({ role: "staff" });
  const memberOwner = mkUser({ role: "member" });

  it("로그인 회원 → full (어떤 페이지든)", () => {
    const viewer = { id: "v_1", role: "member" as const };
    expect(canAccessProfilePage(viewer, memberOwner, null)).toBe("full");
    expect(canAccessProfilePage(viewer, staffOwner, null)).toBe("full");
  });

  it("비로그인 + via=qr → staff-public-only", () => {
    expect(canAccessProfilePage(null, memberOwner, "qr")).toBe("staff-public-only");
  });

  it("비로그인 + via=link → staff-public-only", () => {
    expect(canAccessProfilePage(null, memberOwner, "link")).toBe("staff-public-only");
  });

  it("비로그인 + 운영진 페이지 → staff-public-only", () => {
    expect(canAccessProfilePage(null, staffOwner, null)).toBe("staff-public-only");
  });

  it("비로그인 + 일반 회원 페이지 → blocked", () => {
    expect(canAccessProfilePage(null, memberOwner, null)).toBe("blocked");
  });

  it("비로그인(viewer=null) + president 페이지 → staff-public-only", () => {
    const presidentOwner = mkUser({ role: "president" });
    expect(canAccessProfilePage(null, presidentOwner, null)).toBe("staff-public-only");
  });
});

// ── canViewSection ───────────────────────────────────────────────────────────

describe("canViewSection", () => {
  const staffOwner = mkUser({ id: "o_staff", role: "staff" });
  const memberOwner = mkUser({ id: "o_member", role: "member" });
  const loggedViewer = { id: "v_1", role: "member" as const };
  const staffViewer = { id: "v_staff", role: "staff" as const };

  it("본인 → 항상 true (어떤 섹션이든)", () => {
    const self = { id: "o_member" };
    expect(canViewSection("email", self, memberOwner, null)).toBe(true);
    expect(canViewSection("phone", self, memberOwner, null)).toBe(true);
  });

  it("level=private → 본인 제외 항상 false", () => {
    const ownerWithPrivate = mkUser({
      id: "o_priv",
      role: "member",
      sectionVisibility: { phone: "private" } as never,
    });
    expect(canViewSection("phone", loggedViewer, ownerWithPrivate, null)).toBe(false);
    expect(canViewSection("phone", staffViewer, ownerWithPrivate, null)).toBe(false);
  });

  it("level=staff → 운영진만 true", () => {
    const ownerWithStaff = mkUser({
      id: "o_sv",
      role: "member",
      sectionVisibility: { bio: "staff" } as never,
    });
    expect(canViewSection("bio", staffViewer, ownerWithStaff, null)).toBe(true);
    expect(canViewSection("bio", loggedViewer, ownerWithStaff, null)).toBe(false);
    expect(canViewSection("bio", null, ownerWithStaff, null)).toBe(false);
  });

  it("level=members → 로그인 회원만 true", () => {
    // bio 기본값은 members
    expect(canViewSection("bio", loggedViewer, memberOwner, null)).toBe(true);
    expect(canViewSection("bio", null, memberOwner, null)).toBe(false);
    expect(canViewSection("bio", null, memberOwner, "qr")).toBe(false);
  });

  it("level=shared(email 기본) → 로그인 회원 true", () => {
    expect(canViewSection("email", loggedViewer, memberOwner, null)).toBe(true);
  });

  it("level=shared + 비로그인 + via=qr + 운영진 페이지 → true", () => {
    expect(canViewSection("email", null, staffOwner, "qr")).toBe(true);
  });

  it("level=shared + 비로그인 + via=null + 운영진 페이지 → false", () => {
    expect(canViewSection("email", null, staffOwner, null)).toBe(false);
  });

  it("level=shared + 비로그인 + via=link + 일반 회원 페이지 → false", () => {
    // 일반 회원 페이지는 via=link여도 shared 공개 안 됨 (isStaffRole false)
    expect(canViewSection("email", null, memberOwner, "link")).toBe(false);
  });

  it("phone 기본값 shared — 운영진 페이지 + QR 비로그인 → true", () => {
    expect(canViewSection("phone", null, staffOwner, "qr")).toBe(true);
  });

  it("socials 기본값 shared — 로그인 회원 → true", () => {
    expect(canViewSection("socials", loggedViewer, memberOwner, null)).toBe(true);
  });
});

// ── isAlwaysPublicForStaff ───────────────────────────────────────────────────

describe("isAlwaysPublicForStaff", () => {
  const publicFields = [
    "name", "role", "position", "profileImage",
    "enrollment", "graduateInfo", "bio", "officialEmail",
  ] as const;

  publicFields.forEach((f) => {
    it(`${f} → true`, () => expect(isAlwaysPublicForStaff(f)).toBe(true));
  });
});

// ── withGraduateDefaults ─────────────────────────────────────────────────────

describe("withGraduateDefaults", () => {
  it("빈 필드에 기본값 채움", () => {
    const user = mkUser({ university: "", graduateSchool: "", graduateMajor: "" });
    const result = withGraduateDefaults(user);
    expect(result.university).toBe("연세대학교");
    expect(result.graduateSchool).toBe("교육대학원");
    expect(result.graduateMajor).toBe("교육공학전공");
  });

  it("기존 값이 있으면 유지", () => {
    const user = mkUser({
      university: "고려대학교",
      graduateSchool: "일반대학원",
      graduateMajor: "교육학과",
    });
    const result = withGraduateDefaults(user);
    expect(result.university).toBe("고려대학교");
    expect(result.graduateSchool).toBe("일반대학원");
    expect(result.graduateMajor).toBe("교육학과");
  });

  it("원본 객체를 변경하지 않음 (immutable)", () => {
    const user = mkUser({ university: "" });
    const result = withGraduateDefaults(user);
    expect(user.university).toBe("");
    expect(result.university).toBe("연세대학교");
  });
});
