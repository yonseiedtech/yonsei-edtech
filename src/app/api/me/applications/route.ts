import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import type { ApplicantEntry } from "@/types";

interface MyApplication {
  activityId: string;
  status: ApplicantEntry["status"];
  participantType?: ApplicantEntry["participantType"];
  appliedAt: string;
  name: string;
}

/**
 * GET /api/me/applications — 현재 로그인 회원의 모든 활동 신청 내역 조회.
 *
 * activity_applicants 전체 문서 + (split doc 이 없는) activities.applicants 를 스캔하여
 * 현재 사용자 uid 와 일치하는 항목을 모은다. 활동 수가 많지 않으므로 전체 스캔 허용.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const uid = authResult.uid;

  try {
    const db = getAdminDb();
    const result: MyApplication[] = [];
    const seenActivityIds = new Set<string>();

    // 1) activity_applicants (분리된 비공개 문서)
    const splitSnap = await db.collection("activity_applicants").get();
    for (const docSnap of splitSnap.docs) {
      const applicants = (docSnap.data()?.applicants as ApplicantEntry[]) ?? [];
      const mine = applicants.find((a) => a.userId === uid);
      seenActivityIds.add(docSnap.id);
      if (mine) {
        result.push({
          activityId: docSnap.id,
          status: mine.status,
          participantType: mine.participantType,
          appliedAt: mine.appliedAt,
          name: mine.name,
        });
      }
    }

    // 2) dual-read fallback — split doc 이 없는 activities 의 임베드 applicants
    const actSnap = await db.collection("activities").get();
    for (const docSnap of actSnap.docs) {
      if (seenActivityIds.has(docSnap.id)) continue;
      const applicants = (docSnap.data()?.applicants as ApplicantEntry[]) ?? [];
      const mine = applicants.find((a) => a.userId === uid);
      if (mine) {
        result.push({
          activityId: docSnap.id,
          status: mine.status,
          participantType: mine.participantType,
          appliedAt: mine.appliedAt,
          name: mine.name,
        });
      }
    }

    return NextResponse.json({ applications: result });
  } catch (err) {
    console.error("[/api/me/applications]", err);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}
