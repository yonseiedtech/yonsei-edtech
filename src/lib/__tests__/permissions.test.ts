import { describe, it, expect } from "vitest";
import { ROLE_HIERARCHY, getUserRole, isAtLeast, hasPermission, isStaffOrAbove, isPresidentOrAbove } from "../permissions";
import type { User } from "@/types";

function makeUser(role: User["role"]): User {
  return { id: "u1", name: "Test", email: "t@t.com", username: "test", role, approved: true, generation: 1, field: "", createdAt: "", updatedAt: "" };
}

describe("ROLE_HIERARCHY", () => {
  it("guest < member < staff < president < admin", () => {
    expect(ROLE_HIERARCHY.guest).toBeLessThan(ROLE_HIERARCHY.member);
    expect(ROLE_HIERARCHY.member).toBeLessThan(ROLE_HIERARCHY.staff);
    expect(ROLE_HIERARCHY.staff).toBeLessThan(ROLE_HIERARCHY.president);
    expect(ROLE_HIERARCHY.president).toBeLessThan(ROLE_HIERARCHY.admin);
  });

  it("alumni === advisor", () => {
    expect(ROLE_HIERARCHY.alumni).toBe(ROLE_HIERARCHY.advisor);
  });
});

describe("getUserRole", () => {
  it("null → guest", () => {
    expect(getUserRole(null)).toBe("guest");
  });

  it("user → user.role", () => {
    expect(getUserRole(makeUser("staff"))).toBe("staff");
  });
});

describe("isAtLeast", () => {
  it("admin ≥ staff → true", () => {
    expect(isAtLeast(makeUser("admin"), "staff")).toBe(true);
  });

  it("member < staff → false", () => {
    expect(isAtLeast(makeUser("member"), "staff")).toBe(false);
  });

  it("null (guest) < member → false", () => {
    expect(isAtLeast(null, "member")).toBe(false);
  });

  it("staff ≥ staff → true (equal)", () => {
    expect(isAtLeast(makeUser("staff"), "staff")).toBe(true);
  });
});

describe("hasPermission", () => {
  it("staff in [staff, admin] → true", () => {
    expect(hasPermission(makeUser("staff"), ["staff", "admin"])).toBe(true);
  });

  it("member not in [staff, admin] → false", () => {
    expect(hasPermission(makeUser("member"), ["staff", "admin"])).toBe(false);
  });
});

describe("isStaffOrAbove / isPresidentOrAbove", () => {
  it("staff → isStaffOrAbove true, isPresidentOrAbove false", () => {
    expect(isStaffOrAbove(makeUser("staff"))).toBe(true);
    expect(isPresidentOrAbove(makeUser("staff"))).toBe(false);
  });

  it("president → both true", () => {
    expect(isStaffOrAbove(makeUser("president"))).toBe(true);
    expect(isPresidentOrAbove(makeUser("president"))).toBe(true);
  });

  it("member → both false", () => {
    expect(isStaffOrAbove(makeUser("member"))).toBe(false);
    expect(isPresidentOrAbove(makeUser("member"))).toBe(false);
  });
});
