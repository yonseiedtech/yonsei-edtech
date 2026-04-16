import type { User, UserRole, Lab } from "@/types";

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
  sysadmin: 6,
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

/** user의 역할이 allowedRoles 배열에 포함되는지 확인.
 *  sysadmin은 admin을 상위 포함 — admin이 허용된 곳이면 sysadmin도 허용. */
export function hasPermission(user: User | null, allowedRoles: UserRole[]): boolean {
  const role = getUserRole(user);
  if (allowedRoles.includes(role)) return true;
  if (role === "sysadmin" && allowedRoles.includes("admin")) return true;
  return false;
}

/** admin 또는 sysadmin인지 확인 */
export function isAdminOrSysadmin(user: User | null): boolean {
  return isAtLeast(user, "admin");
}

/** staff 이상 (staff, president, admin) */
export function isStaffOrAbove(user: User | null): boolean {
  return isAtLeast(user, "staff");
}

/** president 이상 (president, admin) */
export function isPresidentOrAbove(user: User | null): boolean {
  return isAtLeast(user, "president");
}

/** 실험실 접근 권한: staff 이상 또는 labsAccess 부여받은 회원 (lab별 allowedUserIds 존중) */
export function canAccessLabs(
  user: User | null,
  lab?: Pick<Lab, "allowedUserIds">,
): boolean {
  if (!user) return false;
  if (isStaffOrAbove(user)) return true;
  if (!user.labsAccess) return false;
  if (lab?.allowedUserIds?.length) return lab.allowedUserIds.includes(user.id);
  return true;
}

/** 실험실 생성/수정/삭제 권한 */
export function canManageLabs(user: User | null): boolean {
  return isStaffOrAbove(user);
}

/** 실험실 승격(approved 등) 권한 */
export function canPromoteLab(user: User | null): boolean {
  return isPresidentOrAbove(user);
}
