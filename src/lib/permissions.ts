import type { User, UserRole } from "@/types";

/**
 * 역할 계층 (숫자가 높을수록 권한이 높음)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  member: 1,
  alumni: 2,
  advisor: 2,
  staff: 3,
  president: 4,
  admin: 5,
};

/** user가 null이면 guest로 취급 */
export function getUserRole(user: User | null): UserRole {
  return user ? user.role : "guest";
}

/** user의 역할이 minimumRole 이상인지 확인 */
export function isAtLeast(user: User | null, minimumRole: UserRole): boolean {
  const role = getUserRole(user);
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
}

/** user의 역할이 allowedRoles 배열에 포함되는지 확인 */
export function hasPermission(user: User | null, allowedRoles: UserRole[]): boolean {
  const role = getUserRole(user);
  return allowedRoles.includes(role);
}

/** staff 이상 (staff, president, admin) */
export function isStaffOrAbove(user: User | null): boolean {
  return isAtLeast(user, "staff");
}

/** president 이상 (president, admin) */
export function isPresidentOrAbove(user: User | null): boolean {
  return isAtLeast(user, "president");
}
