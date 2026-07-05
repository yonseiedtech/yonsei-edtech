import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";

/**
 * GET /api/conference/[programId]/roundup (QA-v3, 2026-07-05)
 *
 * 학회 후기 라운드업 데이터. user_session_plans 의 read 룰은 "본인 또는 staff"라
 * 클라이언트의 programId 단독 list 쿼리는 비-staff 전원 거부 → 라운드업이 빈 화면이었다.
 * 후기 공유는 회원 간 공개가 의도이므로, 서버에서 후기(reflection)가 있는 plan 만
 * 라운드업에 필요한 필드로 투영해 반환한다 (개인 일정 선택 내역은 노출하지 않음).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string }> },
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { programId } = await ctx.params;
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("user_session_plans")
      .where("programId", "==", programId)
      .limit(2000)
      .get();

    const data = snap.docs
      .map((d) => {
        const x = d.data() as Record<string, unknown>;
        if (!x.reflection) return null;
        return {
          id: d.id,
          userId: x.userId ?? null,
          userName: x.userName ?? null,
          sessionId: x.sessionId ?? null,
          programId: x.programId ?? programId,
          reflection: x.reflection,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[/api/conference/roundup]", err);
    return NextResponse.json({ error: "후기를 불러오지 못했습니다." }, { status: 500 });
  }
}
