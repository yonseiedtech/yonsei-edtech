import { describe, it, expect } from "vitest";
import { buildNetwork } from "../build-network";
import type { User } from "@/types";

function makeUser(overrides: Partial<User>): User {
  return {
    id: overrides.id ?? "u",
    username: overrides.username ?? "user",
    name: overrides.name ?? "회원",
    role: overrides.role ?? "member",
    generation: overrides.generation ?? 1,
    field: overrides.field ?? "교육공학",
    approved: overrides.approved ?? true,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as User;
}

describe("buildNetwork", () => {
  it("excludes rejected users and unapproved users", () => {
    const users: User[] = [
      makeUser({ id: "a", approved: true }),
      makeUser({ id: "b", approved: false }),
      makeUser({ id: "c", approved: true, rejected: true }),
    ];
    const g = buildNetwork(users, "a");
    expect(g.nodes.map((n) => n.id)).toEqual(["a"]);
  });

  it("creates cohort edge for same enrollmentYear+enrollmentHalf", () => {
    // identity 매치를 차단하기 위해 occupation 을 모두 다르게 (기본 default 시 identityKey 가 동일해져 identity 매치 됨)
    const users: User[] = [
      makeUser({ id: "a", enrollmentYear: 2024, enrollmentHalf: 1, occupation: "teacher" }),
      makeUser({ id: "b", enrollmentYear: 2024, enrollmentHalf: 1, occupation: "teacher" }),
      makeUser({ id: "c", enrollmentYear: 2024, enrollmentHalf: 2, occupation: "researcher" }),
    ];
    const g = buildNetwork(users, "a");
    const ab = g.edges.find((e) => e.source === "a" && e.target === "b");
    const ac = g.edges.find(
      (e) =>
        (e.source === "a" && e.target === "c") ||
        (e.source === "c" && e.target === "a"),
    );
    expect(ab?.kinds).toContain("cohort");
    // a vs c: 다른 학기 + 다른 occupation → 엣지 자체 없음
    expect(ac).toBeUndefined();
  });

  it("creates identity edge for same occupation+role", () => {
    const users: User[] = [
      makeUser({ id: "a", occupation: "teacher", role: "member" }),
      makeUser({ id: "b", occupation: "teacher", role: "member" }),
      makeUser({ id: "c", occupation: "researcher", role: "member" }),
    ];
    const g = buildNetwork(users, "a");
    const ab = g.edges.find((e) => e.source === "a" && e.target === "b");
    expect(ab?.kinds).toContain("identity");
    expect(ab?.kinds).not.toContain("cohort");
  });

  it("merges kinds when both cohort and identity match", () => {
    const users: User[] = [
      makeUser({
        id: "a",
        enrollmentYear: 2024,
        enrollmentHalf: 1,
        occupation: "teacher",
        role: "member",
      }),
      makeUser({
        id: "b",
        enrollmentYear: 2024,
        enrollmentHalf: 1,
        occupation: "teacher",
        role: "member",
      }),
    ];
    const g = buildNetwork(users, "a");
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].kinds).toEqual(
      expect.arrayContaining(["cohort", "identity"]),
    );
    // weight cap = 3.5 (둘 다 매치 시 1.5+2.5=4.0 → 3.5 cap)
    expect(g.edges[0].weight).toBe(3.5);
  });

  it("flags isMe for currentUser and isFirstDegree for connected peers", () => {
    // stranger 는 me 와 cohort/identity 둘 다 다르도록 — 엣지 없음 → isFirstDegree=false
    const users: User[] = [
      makeUser({ id: "me", enrollmentYear: 2024, enrollmentHalf: 1, occupation: "teacher" }),
      makeUser({ id: "peer", enrollmentYear: 2024, enrollmentHalf: 1, occupation: "teacher" }),
      makeUser({ id: "stranger", enrollmentYear: 2025, enrollmentHalf: 2, occupation: "researcher" }),
    ];
    const g = buildNetwork(users, "me");
    const meNode = g.nodes.find((n) => n.id === "me");
    const peerNode = g.nodes.find((n) => n.id === "peer");
    const strangerNode = g.nodes.find((n) => n.id === "stranger");

    expect(meNode?.isMe).toBe(true);
    expect(peerNode?.isMe).toBe(false);
    expect(peerNode?.isFirstDegree).toBe(true);
    expect(strangerNode?.isFirstDegree).toBe(false);
  });

  it("ignores cohort matching when enrollmentYear or enrollmentHalf is missing", () => {
    const users: User[] = [
      makeUser({ id: "a", enrollmentYear: undefined, enrollmentHalf: undefined }),
      makeUser({ id: "b", enrollmentYear: undefined, enrollmentHalf: undefined }),
    ];
    const g = buildNetwork(users, "a");
    // 둘 다 cohortKey null → cohort 매칭 안 됨, identity (둘 다 default occupation) 만 잠재 매칭
    const ab = g.edges.find((e) => e.source === "a" && e.target === "b");
    if (ab) {
      expect(ab.kinds).not.toContain("cohort");
    }
  });

  it("excludes opt-out users (networkOptIn=false) from nodes but counts them", () => {
    const users: User[] = [
      makeUser({ id: "me" }),
      makeUser({ id: "visible" }),
      makeUser({
        id: "hidden",
        notificationPrefs: { networkOptIn: false },
      }),
    ];
    const g = buildNetwork(users, "me");
    expect(g.nodes.map((n) => n.id).sort()).toEqual(["me", "visible"]);
    expect(g.excludedOptOutCount).toBe(1);
  });

  it("keeps me as a node even if I opted out", () => {
    const users: User[] = [
      makeUser({
        id: "me",
        notificationPrefs: { networkOptIn: false },
      }),
      makeUser({ id: "peer" }),
    ];
    const g = buildNetwork(users, "me");
    const meNode = g.nodes.find((n) => n.id === "me");
    expect(meNode).toBeDefined();
    expect(g.excludedOptOutCount).toBe(0); // me 는 카운트에서 제외
  });

  it("creates school_level edge for same schoolLevel", () => {
    const users: User[] = [
      makeUser({ id: "a", schoolLevel: "elementary", occupation: "teacher", enrollmentYear: 2024, enrollmentHalf: 1 }),
      makeUser({ id: "b", schoolLevel: "elementary", occupation: "researcher", enrollmentYear: 2025, enrollmentHalf: 2 }),
      makeUser({ id: "c", schoolLevel: "middle", occupation: "researcher", enrollmentYear: 2025, enrollmentHalf: 2 }),
    ];
    const g = buildNetwork(users, "a");
    const ab = g.edges.find((e) => e.source === "a" && e.target === "b");
    expect(ab?.kinds).toContain("school_level");
    expect(ab?.kinds).not.toContain("cohort");
    expect(ab?.kinds).not.toContain("identity");
    expect(ab?.weight).toBe(1.5);
    // b vs c: schoolLevel 다름, occupation 동일 → identity 만
    const bc = g.edges.find(
      (e) => (e.source === "b" && e.target === "c") || (e.source === "c" && e.target === "b"),
    );
    expect(bc?.kinds).toContain("identity");
    expect(bc?.kinds).not.toContain("school_level");
  });

  it("ignores school_level matching when one user has no schoolLevel", () => {
    const users: User[] = [
      makeUser({ id: "a", schoolLevel: "high", occupation: "teacher", enrollmentYear: 2024, enrollmentHalf: 1 }),
      makeUser({ id: "b", occupation: "researcher", enrollmentYear: 2025, enrollmentHalf: 2 }),
    ];
    const g = buildNetwork(users, "a");
    const ab = g.edges.find(
      (e) => (e.source === "a" && e.target === "b") || (e.source === "b" && e.target === "a"),
    );
    expect(ab).toBeUndefined();
  });

  it("computes weight 1.5 for identity-only, 2.5 for cohort-only", () => {
    const users: User[] = [
      // identity only
      makeUser({ id: "a", occupation: "teacher", role: "member", enrollmentYear: 2024, enrollmentHalf: 1 }),
      makeUser({ id: "b", occupation: "teacher", role: "member", enrollmentYear: 2024, enrollmentHalf: 2 }),
      // cohort only
      makeUser({ id: "c", occupation: "researcher", role: "member", enrollmentYear: 2024, enrollmentHalf: 1 }),
    ];
    const g = buildNetwork(users, "a");
    const ab = g.edges.find(
      (e) => (e.source === "a" && e.target === "b") || (e.source === "b" && e.target === "a"),
    );
    const ac = g.edges.find(
      (e) => (e.source === "a" && e.target === "c") || (e.source === "c" && e.target === "a"),
    );
    expect(ab?.weight).toBe(1.5);
    expect(ac?.weight).toBe(2.5);
  });
});
