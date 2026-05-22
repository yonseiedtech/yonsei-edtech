import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import type { ApplicantEntry } from "@/types";

/**
 * GET /api/activities/[id]/my-application — 현재 로그인 회원의 신청 항목 1건 조회.
 *
 * activity_applicants/{id} 가 없으면 activities/{id}.applicants 로 fallback.
 * 다른 신청자 정보는 반환하지 않는다.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: activityId } = await ctx.params;
  if (!activityId) {
    return NextResponse.json({ error: "활동 ID가 필요합니다." }, { status: 400 });
  }

  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getAdminDb();
    const splitSnap = await db
      .collection("activity_applicants")
      .doc(activityId)
      .get();
    let applicants: ApplicantEntry[];
    if (splitSnap.exists) {
      applicants = (splitSnap.data()?.applicants as ApplicantEntry[]) ?? [];
    } else {
      // dual-read fallback
      const actSnap = await db.collection("activities").doc(activityId).get();
      applicants = actSnap.exists
        ? ((actSnap.data()?.applicants as ApplicantEntry[]) ?? [])
        : [];
    }
    const mine = applicants.find((a) => a.userId === authResult.uid) ?? null;
    // 본인 데이터이므로 answers/email/phone/studentId 는 포함하되 guestKey 는 제거.
    const application = mine
      ? (() => {
          const { guestKey: _guestKey, ...rest } = mine;
          void _guestKey;
          return rest;
        })()
      : null;
    return NextResponse.json({ application });
  } catch (err) {
    console.error("[/api/activities/[id]/my-application]", err);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}
