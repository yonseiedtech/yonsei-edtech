import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { requireAuth } from "@/lib/api-auth";
import { snapshotMemberMetrics } from "@/features/insights/snapshotMemberMetrics";
import type {
  LoyaltySnapshot,
  MemberSegment,
} from "@/features/insights/loyalty-snapshot-types";

/**
 * 로얄티 스냅샷 적재 Cron (Sprint 71) — 주 1회 (월요일 00:00 UTC = 09:00 KST).
 *
 * 승인 회원 전체의 로얄티 점수·세그먼트를 산출해 `loyalty_snapshots/{YYYY-MM-DD}` 에 적재.
 * 스냅샷이 누적되면 회원 보고서가 로얄티 추이 그래프·세그먼트 이동 추적에 사용한다.
 *
 * - GET: Vercel cron 전용 (verifyCronAuth)
 * - POST: 운영진(admin+) 수동 캡처 — 회원 보고서 "지금 캡처" 버튼
 * - 같은 날 재실행 시 문서를 덮어쓰므로 idempotent.
 */
export const maxDuration = 60;

/** KST 기준 오늘 날짜 YYYY-MM-DD */
function todayKst(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

interface CaptureResult {
  period: string;
  totalMembers: number;
  avgLoyalty: number;
}

async function captureSnapshot(): Promise<CaptureResult> {
  const db = getAdminDb();
  const rows = await snapshotMemberMetrics(db);
  const period = todayKst();

  const segmentCounts: Record<MemberSegment, number> = {
    champion: 0,
    active: 0,
    new: 0,
    at_risk: 0,
    dormant: 0,
  };
  const memberSegments: Record<string, MemberSegment> = {};
  let sumLoyalty = 0;
  for (const r of rows) {
    segmentCounts[r.segment] += 1;
    memberSegments[r.userId] = r.segment;
    sumLoyalty += r.loyaltyScore;
  }
  const avgLoyalty = rows.length ? Math.round(sumLoyalty / rows.length) : 0;

  const snapshot: LoyaltySnapshot = {
    period,
    capturedAt: new Date().toISOString(),
    totalMembers: rows.length,
    avgLoyalty,
    segmentCounts,
    memberSegments,
  };
  // 같은 날 재실행 시 덮어쓰기 (idempotent)
  await db.collection("loyalty_snapshots").doc(period).set(snapshot);
  return { period, totalMembers: rows.length, avgLoyalty };
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await captureSnapshot();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/loyalty-snapshot]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await captureSnapshot();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/loyalty-snapshot] POST", err);
    return NextResponse.json(
      { error: "스냅샷 캡처에 실패했습니다." },
      { status: 500 },
    );
  }
}
