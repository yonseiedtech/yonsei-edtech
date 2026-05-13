/**
 * attendance.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 출석 집계 오류는 성적 처리·수료증 발급에 직접 영향.
 * userId 유무에 따른 key 전환, 미기록/출석/결석 분류 검증.
 */

import { describe, expect, it } from "vitest";
import {
  getEnrollmentAttendanceKey,
  isAttended,
  isAttendanceEnabled,
  summarizeAttendance,
  buildAttendancePayload,
  getCompositeKey,
} from "@/lib/attendance";
import type { ClassSession, CourseEnrollment } from "@/types";

function mkEnrollment(partial: Partial<CourseEnrollment> = {}): CourseEnrollment {
  return {
    id: "e_1",
    courseId: "c_1",
    userId: "u_1",
    role: "student",
    createdAt: "2026-01-01T00:00:00Z",
    ...partial,
  } as unknown as CourseEnrollment;
}

function mkSession(partial: Partial<ClassSession> = {}): ClassSession {
  return {
    id: "s_1",
    courseId: "c_1",
    weekNo: 1,
    date: "2026-03-05",
    mode: "offline",
    attendedUserIds: [],
    attendedStudentIds: [],
    ...partial,
  } as unknown as ClassSession;
}

// ── getEnrollmentAttendanceKey ────────────────────────────────────────────────

describe("getEnrollmentAttendanceKey", () => {
  it("userId 있음 → kind=user", () => {
    const e = mkEnrollment({ userId: "u_abc" });
    expect(getEnrollmentAttendanceKey(e)).toEqual({ kind: "user", key: "u_abc" });
  });

  it("userId 공백만 → kind=enrollment", () => {
    const e = mkEnrollment({ userId: "   " });
    expect(getEnrollmentAttendanceKey(e)).toEqual({ kind: "enrollment", key: "e_1" });
  });

  it("userId 빈 문자열 → kind=enrollment", () => {
    const e = mkEnrollment({ userId: "" });
    expect(getEnrollmentAttendanceKey(e)).toEqual({ kind: "enrollment", key: "e_1" });
  });

  it("userId undefined → kind=enrollment", () => {
    const e = mkEnrollment({ userId: undefined });
    expect(getEnrollmentAttendanceKey(e)).toEqual({ kind: "enrollment", key: "e_1" });
  });
});

// ── isAttended ────────────────────────────────────────────────────────────────

describe("isAttended", () => {
  it("session=undefined → false", () => {
    expect(isAttended(undefined, { kind: "user", key: "u_1" })).toBe(false);
  });

  it("kind=user, userId attendedUserIds에 있음 → true", () => {
    const s = mkSession({ attendedUserIds: ["u_1", "u_2"] });
    expect(isAttended(s, { kind: "user", key: "u_1" })).toBe(true);
  });

  it("kind=user, attendedUserIds에 없음 → false", () => {
    const s = mkSession({ attendedUserIds: ["u_2"] });
    expect(isAttended(s, { kind: "user", key: "u_1" })).toBe(false);
  });

  it("kind=enrollment, attendedStudentIds에 있음 → true", () => {
    const s = mkSession({ attendedStudentIds: ["e_1"] });
    expect(isAttended(s, { kind: "enrollment", key: "e_1" })).toBe(true);
  });

  it("kind=enrollment, attendedStudentIds 없음(undefined) → false", () => {
    const s = mkSession({ attendedStudentIds: undefined });
    expect(isAttended(s, { kind: "enrollment", key: "e_1" })).toBe(false);
  });
});

// ── isAttendanceEnabled ───────────────────────────────────────────────────────

describe("isAttendanceEnabled", () => {
  it("mode=undefined → true (기본 허용)", () => {
    expect(isAttendanceEnabled(undefined)).toBe(true);
  });

  it("mode=offline → true", () => {
    expect(isAttendanceEnabled("offline")).toBe(true);
  });

  it("mode=online → true", () => {
    expect(isAttendanceEnabled("online")).toBe(true);
  });

  it("mode=cancelled → false", () => {
    expect(isAttendanceEnabled("cancelled")).toBe(false);
  });

  it("mode=zoom → false", () => {
    expect(isAttendanceEnabled("zoom")).toBe(false);
  });

  it("mode=assignment → false", () => {
    expect(isAttendanceEnabled("assignment")).toBe(false);
  });
});

// ── summarizeAttendance ───────────────────────────────────────────────────────

describe("summarizeAttendance", () => {
  it("session=undefined → 전부 unmarked", () => {
    const enrollments = [mkEnrollment({ id: "e_1" }), mkEnrollment({ id: "e_2" })];
    const result = summarizeAttendance(undefined, enrollments);
    expect(result).toEqual({ attended: 0, absent: 0, unmarked: 2, total: 2 });
  });

  it("attendedUserIds/StudentIds 모두 undefined → 전부 unmarked", () => {
    const s = mkSession({ attendedUserIds: undefined, attendedStudentIds: undefined });
    const enrollments = [mkEnrollment()];
    const result = summarizeAttendance(s, enrollments);
    expect(result).toEqual({ attended: 0, absent: 0, unmarked: 1, total: 1 });
  });

  it("출석 2명, 결석 1명 집계", () => {
    const s = mkSession({ attendedUserIds: ["u_1", "u_2"], attendedStudentIds: [] });
    const enrollments = [
      mkEnrollment({ id: "e_1", userId: "u_1" }),
      mkEnrollment({ id: "e_2", userId: "u_2" }),
      mkEnrollment({ id: "e_3", userId: "u_3" }),
    ];
    const result = summarizeAttendance(s, enrollments);
    expect(result).toEqual({ attended: 2, absent: 1, unmarked: 0, total: 3 });
  });

  it("빈 enrollments → 모두 0", () => {
    const s = mkSession({ attendedUserIds: ["u_1"] });
    const result = summarizeAttendance(s, []);
    expect(result).toEqual({ attended: 0, absent: 0, unmarked: 0, total: 0 });
  });
});

// ── buildAttendancePayload ────────────────────────────────────────────────────

describe("buildAttendancePayload", () => {
  it("출석 표시된 userId → attendedUserIds에 포함", () => {
    const e = mkEnrollment({ id: "e_1", userId: "u_1" });
    const payload = buildAttendancePayload(
      [e],
      new Set(["user:u_1"]),
      {},
      "actor_1",
    );
    expect(payload.attendedUserIds).toContain("u_1");
    expect(payload.attendedStudentIds).toHaveLength(0);
    expect(payload.attendanceUpdatedBy).toBe("actor_1");
  });

  it("출석 표시된 enrollmentId → attendedStudentIds에 포함", () => {
    const e = mkEnrollment({ id: "e_anon", userId: "" });
    const payload = buildAttendancePayload(
      [e],
      new Set(["enrollment:e_anon"]),
      {},
      "actor_1",
    );
    expect(payload.attendedStudentIds).toContain("e_anon");
    expect(payload.attendedUserIds).toHaveLength(0);
  });

  it("결석 + 사유 기록 → absenceNotes에 포함", () => {
    const e = mkEnrollment({ id: "e_1", userId: "u_1" });
    const payload = buildAttendancePayload(
      [e],
      new Set(), // 출석 없음
      { "user:u_1": "병결" },
      "actor_1",
    );
    expect(payload.attendedUserIds).toHaveLength(0);
    expect(payload.absenceNotes["user:u_1"]).toBe("병결");
  });

  it("빈 사유(공백) → absenceNotes에서 제외", () => {
    const e = mkEnrollment({ id: "e_1", userId: "u_1" });
    const payload = buildAttendancePayload(
      [e],
      new Set(),
      { "user:u_1": "   " },
      "actor_1",
    );
    expect(payload.absenceNotes["user:u_1"]).toBeUndefined();
  });
});

// ── getCompositeKey ───────────────────────────────────────────────────────────

describe("getCompositeKey", () => {
  it("userId 있음 → 'user:userId'", () => {
    const e = mkEnrollment({ userId: "u_xyz" });
    expect(getCompositeKey(e)).toBe("user:u_xyz");
  });

  it("userId 없음 → 'enrollment:id'", () => {
    const e = mkEnrollment({ id: "e_xyz", userId: "" });
    expect(getCompositeKey(e)).toBe("enrollment:e_xyz");
  });
});
