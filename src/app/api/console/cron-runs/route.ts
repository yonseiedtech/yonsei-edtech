import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import type { CronRunMeta } from "@/lib/cron-observability";

/**
 * cron_runs 컬렉션 조회 API (admin 전용) — v7-M6
 *
 * cron_runs 는 Admin SDK 로만 적재되므로 클라이언트 Firestore SDK 대신
 * 이 서버 라우트를 통해 읽는다 (보안 규칙 변경 불필요).
 *
 * 반환: kind별 최신 실행 상태 + 연속 실패 수
 */

export interface KindStatus {
  kind: string;
  lastRunAt: string;
  lastSuccess: boolean;
  lastDurationMs: number;
  consecutiveFailures: number;
  lastErrorMessage?: string;
  lastSummary: Record<string, number>;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (auth instanceof NextResponse) return auth;

  try {
    const db = getAdminDb();

    // 최근 500건 (최신순) — kind별 연속 실패 판정에 충분한 depth
    const snap = await db
      .collection("cron_runs")
      .orderBy("startedAt", "desc")
      .limit(500)
      .get();

    // kind별 최신순 그룹핑 (이미 startedAt desc 정렬됨)
    const byKind = new Map<string, (CronRunMeta & { id: string })[]>();
    for (const doc of snap.docs) {
      const data = doc.data() as CronRunMeta;
      const kind = data.kind ?? "(unknown)";
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind)!.push({ id: doc.id, ...data });
    }

    const statuses: KindStatus[] = [];
    for (const [kind, runs] of byKind) {
      const latest = runs[0]; // 이미 최신순

      // 연속 실패 수 — 최신부터 첫 성공 전까지 카운트
      let consecutiveFailures = 0;
      for (const run of runs) {
        if (!run.success) consecutiveFailures++;
        else break;
      }

      statuses.push({
        kind,
        lastRunAt: latest.startedAt,
        lastSuccess: latest.success,
        lastDurationMs: latest.durationMs ?? 0,
        consecutiveFailures,
        lastErrorMessage: latest.errorMessage,
        lastSummary: latest.summary ?? {},
      });
    }

    // 마지막 실행 최신순 정렬
    statuses.sort((a, b) => b.lastRunAt.localeCompare(a.lastRunAt));

    return NextResponse.json({ ok: true, statuses, total: snap.size });
  } catch (err) {
    console.error("[api/console/cron-runs]", err);
    return NextResponse.json({ error: "cron_runs 조회 실패" }, { status: 500 });
  }
}
