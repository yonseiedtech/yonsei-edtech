import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { checkAuthorEligibility } from "../route";
import { ROLE_HIERARCHY } from "@/lib/permissions";

/**
 * GET /api/learning-guides/authorize
 * 현재 인증된 사용자가 러닝 가이드 저자 자격이 있는지 확인.
 * 자격 조건: staff 이상 OR 스터디 모임장 OR 세미나 연사
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  const eligible = await checkAuthorEligibility(authResult.uid, authResult.role);
  const isStaff = ROLE_HIERARCHY[authResult.role as keyof typeof ROLE_HIERARCHY] >= ROLE_HIERARCHY.staff;

  return Response.json({
    eligible,
    reason: eligible
      ? isStaff
        ? "운영진 자격"
        : "스터디 모임장 또는 세미나 연사 자격"
      : "러닝 가이드 집필은 운영진·스터디 모임장·세미나 연사만 가능합니다.",
  });
}
