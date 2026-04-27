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
  // profile 전체를 스프레드해서 학부정보·연구관심사·소셜·연락처·졸업정보 등 모든 DB 필드를 보존.
  // 이후 인증 출처 또는 계산값으로 필수 필드를 덮어씌운다.
  return {
    ...(profile ?? {}),
    id,
    username,
    email: authUser.email || (profile?.email as string | undefined),
    name: (profile?.name as string) ?? authUser.name ?? authUser.displayName ?? "",
    role: (profile?.role as User["role"]) ?? "member",
    generation: (profile?.generation as number) ?? 0,
    field: (profile?.field as string) ?? "",
    approved: (profile?.approved as boolean) ?? false,
    studentId,
    createdAt: (profile?.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (profile?.updatedAt as string) ?? new Date().toISOString(),
  } as User;
}
