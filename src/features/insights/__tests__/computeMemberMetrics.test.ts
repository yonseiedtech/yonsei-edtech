/**
 * computeMemberMetrics 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 회원 로얄티 점수(0~100)가 champion/active/at_risk/dormant/new 분류와
 * 운영진 저활동 경보를 결정. 산식 오류가 운영 대시보드 전체를 오도.
 */

import { describe, expect, it } from "vitest";
import { computeMemberMetrics } from "@/features/insights/computeMemberMetrics";
import type { User } from "@/types";

function mkMember(partial: Partial<User> = {}): User {
  return {
    id: "u_test",
    name: "테스트",
    email: "test@yonsei.ac.kr",
    role: "member" as const,
    approved: true,
    generation: 20,
    createdAt: new Date(Date.now() - 60 * 86_400_000).toISOString(), // 60일 전
    ...partial,
  } as User;
}

// 고정 기준 시각 (2026-05-13 KST)
const NOW_MS = new Date("2026-05-13T00:00:00Z").getTime();

describe("computeMemberMetrics — 점수 및 segment", () => {
  it("만점(100) 케이스 — champion", () => {
    const result = computeMemberMetrics({
      member: mkMember({ role: "staff", createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString() }),
      attendanceCount: 5,   // 15점 (cap 15)
      activityCount: 3,     // 15점 (cap 15) → engagement 30
      postCount: 4,         // 12점 (cap 12)
      commentCount: 8,      // 8점 (cap 8)
      interviewResponseCount: 4, // min(5, 6) = 5 → content 25
      studyMinutes: 3000,   // 50h → min(10, 10) = 10
      writingChars: 5000,   // min(10, 10) = 10
      hasResearchProposal: true, // 5 → research 25
      gradLifeOngoingCount: 1,   // 5 + 5 = staff 10
      seminarReviewCount: 3,     // min(6,6) = 6
      courseReviewCount: 2,      // min(4,4) = 4 → review 10
      nowMs: NOW_MS,
    });
    expect(result.loyaltyScore).toBe(100);
    expect(result.segment).toBe("champion");
    expect(result.staffLowActivity).toBe(false);
  });

  it("완전 무활동 — dormant (점수 0)", () => {
    const result = computeMemberMetrics({
      member: mkMember({
        role: "member",
        createdAt: new Date(NOW_MS - 60 * 86_400_000).toISOString(),
      }),
      attendanceCount: 0,
      activityCount: 0,
      postCount: 0,
      commentCount: 0,
      interviewResponseCount: 0,
      studyMinutes: 0,
      writingChars: 0,
      hasResearchProposal: false,
      gradLifeOngoingCount: 0,
      seminarReviewCount: 0,
      courseReviewCount: 0,
      nowMs: NOW_MS,
    });
    expect(result.loyaltyScore).toBe(0);
    expect(result.segment).toBe("dormant");
    expect(result.staffLowActivity).toBe(false);
  });

  it("신규 가입 30일 이내 → segment=new (점수 무관)", () => {
    const result = computeMemberMetrics({
      member: mkMember({
        role: "member",
        createdAt: new Date(NOW_MS - 15 * 86_400_000).toISOString(), // 15일 전
      }),
      attendanceCount: 0,
      activityCount: 0,
      gradLifeOngoingCount: 0,
      nowMs: NOW_MS,
    });
    expect(result.segment).toBe("new");
  });

  it("staff 저활동 경보 — loyaltyScore < 30 인 staff", () => {
    const result = computeMemberMetrics({
      member: mkMember({
        role: "staff",
        createdAt: new Date(NOW_MS - 90 * 86_400_000).toISOString(),
      }),
      attendanceCount: 0,
      activityCount: 0,
      gradLifeOngoingCount: 0,
      nowMs: NOW_MS,
    });
    // staff base = 5, ongoing = 0 → loyaltyScore = 5 < 30
    expect(result.staffLowActivity).toBe(true);
  });

  it("카테고리별 cap 검증 — attendance/post 초과 입력", () => {
    const result = computeMemberMetrics({
      member: mkMember({ createdAt: new Date(NOW_MS - 90 * 86_400_000).toISOString() }),
      attendanceCount: 100, // cap 15
      activityCount: 0,
      postCount: 100,       // cap 12
      commentCount: 0,
      gradLifeOngoingCount: 0,
      nowMs: NOW_MS,
    });
    expect(result.scoreBreakdown.engagement).toBeLessThanOrEqual(30);
    expect(result.scoreBreakdown.content).toBeLessThanOrEqual(25);
  });

  it("loyaltyScore 40~69 → active", () => {
    // attendanceCount=5(15) + activityCount=3(15) + postCount=4(12) = 42
    const result = computeMemberMetrics({
      member: mkMember({ createdAt: new Date(NOW_MS - 60 * 86_400_000).toISOString() }),
      attendanceCount: 5,
      activityCount: 3,
      postCount: 4,
      commentCount: 0,
      gradLifeOngoingCount: 0,
      nowMs: NOW_MS,
    });
    expect(result.loyaltyScore).toBeGreaterThanOrEqual(40);
    expect(result.loyaltyScore).toBeLessThan(70);
    expect(result.segment).toBe("active");
  });
});

describe("computeMemberMetrics — 출력 구조", () => {
  it("scoreBreakdown 합 = loyaltyScore", () => {
    const result = computeMemberMetrics({
      member: mkMember({ createdAt: new Date(NOW_MS - 60 * 86_400_000).toISOString() }),
      attendanceCount: 3,
      activityCount: 2,
      postCount: 2,
      commentCount: 3,
      gradLifeOngoingCount: 0,
      nowMs: NOW_MS,
    });
    const { engagement, content, research, staff, review } = result.scoreBreakdown;
    const sum = Math.round(engagement + content + research + staff + review);
    expect(result.loyaltyScore).toBe(sum);
  });
});
