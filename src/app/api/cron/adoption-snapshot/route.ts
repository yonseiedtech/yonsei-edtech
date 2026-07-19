import { NextRequest, NextResponse } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { requireAuth } from "@/lib/api-auth";
import { computeAdoption, type AdoptionSnapshot } from "@/features/insights/adoption-metrics";
import { currentWeekKey } from "@/lib/weekly-goal";

/**
 * 채택률 스냅샷 적재 Cron (v6-H1) — 주 1회 (월요일 00:00 UTC = 09:00 KST).
 *
 * 기능 채택률(진단·암기카드·주간목표·멘토링·검수 큐 포함) 전량을 산출해
 * `adoption_snapshots/{weekKey}` 에 적재한다. 스냅샷이 누적되면 콘솔 인사이트가
 * 최근 N주 채택 추세를 스냅샷 컬렉션만 읽어(저비용) 표·스파크라인으로 보여준다.
 *
 * - GET: Vercel cron 전용 (verifyCronAuth)
 * - POST: 운영진(admin+) 수동 캡처
 * - weekKey(월요일) 문서 id 로 같은 주 재실행 시 덮어쓰므로 idempotent.
 */
export const maxDuration = 60;

interface CaptureResult {
  weekKey: string;
  active7d: number;
  diagnosticsCompleted30d: number;
}

async function captureSnapshot(): Promise<CaptureResult> {
  const db = getAdminDb();
  const metrics = await computeAdoption(db);
  const weekKey = currentWeekKey();

  const snapshot: AdoptionSnapshot = {
    ...metrics,
    weekKey,
    capturedAt: new Date().toISOString(),
  };
  // 같은 주 재실행 시 덮어쓰기 (idempotent)
  await db.collection("adoption_snapshots").doc(weekKey).set(snapshot);
  return {
    weekKey,
    active7d: metrics.members.active7d,
    diagnosticsCompleted30d: metrics.diagnostics.completed30d,
  };
}

async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await captureSnapshot();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/adoption-snapshot]", err);
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
    console.error("[cron/adoption-snapshot] POST", err);
    return NextResponse.json(
      { error: "스냅샷 캡처에 실패했습니다." },
      { status: 500 },
    );
  }
}

export const GET = withCronLog("adoption-snapshot", _handler);
