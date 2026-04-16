import type { User } from "@/types";

/** Firebase/bkend 인증 정보 + 프로필 데이터를 User 타입으로 합침 */
export function mergeToUser(
  authUser: { id?: string; uid?: string; email: string | null; name?: string; displayName?: string | null },
  profile?: Record<string, unknown>,
): User {
  const id = (profile?.id as string) ?? authUser.id ?? authUser.uid ?? "";
  const username = (profile?.username as string) ?? (authUser.email?.split("@")[0] || "");
  // studentId 우선 → 없으면 username을 fallback (회원가입 시 학번이 username으로 저장되는 관행)
  const studentId = (profile?.studentId as string) || username || undefined;
  return {
    id,
    username,
    email: authUser.email || undefined,
    name: (profile?.name as string) ?? authUser.name ?? authUser.displayName ?? "",
    role: (profile?.role as User["role"]) ?? "member",
    generation: (profile?.generation as number) ?? 0,
    field: (profile?.field as string) ?? "",
    profileImage: profile?.profileImage as string | undefined,
    bio: profile?.bio as string | undefined,
    approved: (profile?.approved as boolean) ?? false,
    consents: profile?.consents as User["consents"],
    privacyAgreedAt: profile?.privacyAgreedAt as string | undefined,
    studentId,
    phone: profile?.phone as string | undefined,
    enrollmentYear: profile?.enrollmentYear as number | undefined,
    enrollmentHalf: profile?.enrollmentHalf as 1 | 2 | undefined,
    enrollmentStatus: profile?.enrollmentStatus as User["enrollmentStatus"],
    createdAt: (profile?.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (profile?.updatedAt as string) ?? new Date().toISOString(),
  };
}
