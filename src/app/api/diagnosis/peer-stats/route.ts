import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { computePeerStats } from "@/features/diagnosis/peer-stats";
import type { DiagnosticResult } from "@/types/diagnostic";

/**
 * 진단 피어 비교 — 익명 동료 분포 API (M4).
 *
 * 로그인 회원이 자신의 진단 결과를 "동료 대비 어디쯤"인지 비교할 수 있도록,
 * 전체 응시자의 영역별 정답률·준비도 분포를 익명 집계해 반환한다.
 *
 * ⚠️ firestore.rules 는 일반 회원의 diagnostic_results 전체 read 를 막는다(본인+운영진만).
 *    따라서 집계는 서버(Admin SDK)에서만 수행하고, 응답에는 개별 userId·이름 등
 *    식별 정보를 포함하지 않는다(평균·중앙값·정렬된 익명 분포만).
 *    표본이 최소치 미만인 분포는 보류한다(개인 추정·노이즈 방지).
 *
 * - GET: 로그인 회원(member+) 전용. 인증 토큰(Bearer) 필요.
 */
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "member");
  if (auth instanceof NextResponse) return auth;

  try {
    const db = getAdminDb();
    const snap = await db
      .collection("diagnostic_results")
      .orderBy("createdAt", "desc")
      .limit(5000)
      .get();

    const results: DiagnosticResult[] = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as DiagnosticResult,
    );

    const stats = computePeerStats(results);
    return NextResponse.json(stats, {
      // 분포는 자주 바뀌지 않으므로 짧게 캐시(개인화 없음 — 익명 집계).
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    console.error("[api/diagnosis/peer-stats]", err);
    return NextResponse.json(
      { error: "동료 분포 집계에 실패했습니다." },
      { status: 500 },
    );
  }
}
