/**
 * host-helpers.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 호스트 권한 오류 시 비호스트 회원이 연사 대시보드에 접근하거나,
 * 세미나 운영 정보가 누출될 수 있음.
 */

import { describe, expect, it } from "vitest";
import {
  roleForActivity,
  isSeminarHost,
  canAccessSeminarHostDashboard,
  HOST_ROLE_CONFIG,
} from "@/lib/host-helpers";
import type { Seminar, User } from "@/types";

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

function mkSeminar(partial: Partial<Seminar> = {}): Seminar {
  return {
    id: "s_1",
    title: "테스트 세미나",
    date: "2026-05-20",
    time: "19:00",
    location: "비대면",
    status: "upcoming",
    hostUserIds: [],
    ...partial,
  } as unknown as Seminar;
}

// ── HOST_ROLE_CONFIG ──────────────────────────────────────────────────────────

describe("HOST_ROLE_CONFIG", () => {
  it("speaker → 활동유형 seminar", () => {
    expect(HOST_ROLE_CONFIG.speaker.activityType).toBe("seminar");
    expect(HOST_ROLE_CONFIG.speaker.label).toBe("연사");
  });

  it("host → 활동유형 study", () => {
    expect(HOST_ROLE_CONFIG.host.activityType).toBe("study");
  });

  it("pm → 활동유형 project", () => {
    expect(HOST_ROLE_CONFIG.pm.activityType).toBe("project");
  });

  it("coordinator → 활동유형 external", () => {
    expect(HOST_ROLE_CONFIG.coordinator.activityType).toBe("external");
  });
});

// ── roleForActivity ───────────────────────────────────────────────────────────

describe("roleForActivity", () => {
  it("seminar → speaker", () => expect(roleForActivity("seminar")).toBe("speaker"));
  it("study → host", () => expect(roleForActivity("study")).toBe("host"));
  it("project → pm", () => expect(roleForActivity("project")).toBe("pm"));
  it("external → coordinator", () => expect(roleForActivity("external")).toBe("coordinator"));
});

// ── isSeminarHost ─────────────────────────────────────────────────────────────

describe("isSeminarHost", () => {
  it("hostUserIds에 포함 → true", () => {
    const s = mkSeminar({ hostUserIds: ["u_1", "u_2"] });
    expect(isSeminarHost(s, "u_1")).toBe(true);
  });

  it("hostUserIds에 없음 → false", () => {
    const s = mkSeminar({ hostUserIds: ["u_2"] });
    expect(isSeminarHost(s, "u_1")).toBe(false);
  });

  it("seminar=undefined → false", () => {
    expect(isSeminarHost(undefined, "u_1")).toBe(false);
  });

  it("seminar=null → false", () => {
    expect(isSeminarHost(null, "u_1")).toBe(false);
  });

  it("userId=undefined → false", () => {
    const s = mkSeminar({ hostUserIds: ["u_1"] });
    expect(isSeminarHost(s, undefined)).toBe(false);
  });

  it("hostUserIds가 배열이 아님(undefined) → false", () => {
    const s = mkSeminar({ hostUserIds: undefined });
    expect(isSeminarHost(s, "u_1")).toBe(false);
  });
});

// ── canAccessSeminarHostDashboard ─────────────────────────────────────────────

describe("canAccessSeminarHostDashboard", () => {
  it("user=null → false", () => {
    const s = mkSeminar({ hostUserIds: ["u_1"] });
    expect(canAccessSeminarHostDashboard(s, null)).toBe(false);
  });

  it("호스트 본인(member) → true", () => {
    const s = mkSeminar({ hostUserIds: ["u_1"] });
    const u = mkUser({ id: "u_1", role: "member" });
    expect(canAccessSeminarHostDashboard(s, u)).toBe(true);
  });

  it("호스트 아닌 일반 회원 → false", () => {
    const s = mkSeminar({ hostUserIds: ["u_2"] });
    const u = mkUser({ id: "u_1", role: "member" });
    expect(canAccessSeminarHostDashboard(s, u)).toBe(false);
  });

  it("staff → true (호스트 여부 무관)", () => {
    const s = mkSeminar({ hostUserIds: [] });
    const u = mkUser({ role: "staff" });
    expect(canAccessSeminarHostDashboard(s, u)).toBe(true);
  });

  it("president → true", () => {
    const s = mkSeminar({ hostUserIds: [] });
    const u = mkUser({ role: "president" });
    expect(canAccessSeminarHostDashboard(s, u)).toBe(true);
  });

  it("admin → true", () => {
    const s = mkSeminar({ hostUserIds: [] });
    const u = mkUser({ role: "admin" });
    expect(canAccessSeminarHostDashboard(s, u)).toBe(true);
  });

  it("seminar=null + 운영진 → true (seminar 없어도 운영진 접근 가능)", () => {
    const u = mkUser({ role: "staff" });
    expect(canAccessSeminarHostDashboard(null, u)).toBe(true);
  });

  it("seminar=null + 일반 회원 → false", () => {
    const u = mkUser({ id: "u_1", role: "member" });
    expect(canAccessSeminarHostDashboard(null, u)).toBe(false);
  });
});
