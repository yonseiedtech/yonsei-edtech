import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import type { CronRunMeta } from "@/lib/cron-observability";

/**
 * cron_runs 일별 성공률 추세 API (admin 전용) — v12-H2
 *
 * 최근 N일(기본 14, 최대 30) cron_runs를 kind × KST 날짜별로 집계해
 * kind별 성공률 시계열을 반환한다.
 *
 * - 읽기 상한: 최근 1000건 (cron_runs 비용 주의)
 * - 신규 컬렉션 없음 — 기존 cron_runs 재사용
 * - M5(열화 임계 경보·알림) 는 범위 외 — reader(가시화)만
 */

export interface DayBucket {
  /** KST "YYYY-MM-DD" */
  date: string;
  total: number;
  success: number;
  /** 0~100, -1 = 실행 없음 */
  successRate: number;
  avgMs: number;
}

export interface KindTrend {
  kind: string;
  days: DayBucket[];
  /** 전체 기간 성공률 0~100, -1 = 데이터 없음 */
  overallSuccessRate: number;
  /**
   * 후반 절반 성공률 < 전반 절반 성공률 - 10%p
   * (각 절반 실행 3건 이상일 때만 판정)
   */
  degraded: boolean;
}

/** ISO → KST "YYYY-MM-DD" */
function toKstDate(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** 최근 N일 KST 날짜 배열 (과거→오늘 오름차순) */
function lastNDays(n: number): string[] {
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(nowKst.getTime() - i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const days = Math.min(30, Math.max(7, parseInt(url.searchParams.get("days") ?? "14", 10)));

  try {
    const db = getAdminDb();

    // 최근 1000건 — kind별 수 주치 시계열 커버
    const snap = await db
      .collection("cron_runs")
      .orderBy("startedAt", "desc")
      .limit(1000)
      .get();

    const dateSlots = lastNDays(days);
    const dateSet = new Set(dateSlots);

    // kind × date → { total, success, sumMs } 집계
    const kindDateMap = new Map<
      string,
      Map<string, { total: number; success: number; sumMs: number }>
    >();

    for (const doc of snap.docs) {
      const data = doc.data() as CronRunMeta;
      const kind = data.kind ?? "(unknown)";
      const date = toKstDate(data.startedAt);
      if (!dateSet.has(date)) continue; // 기간 범위 밖

      if (!kindDateMap.has(kind)) kindDateMap.set(kind, new Map());
      const dm = kindDateMap.get(kind)!;
      const prev = dm.get(date) ?? { total: 0, success: 0, sumMs: 0 };
      dm.set(date, {
        total: prev.total + 1,
        success: prev.success + (data.success ? 1 : 0),
        sumMs: prev.sumMs + (data.durationMs ?? 0),
      });
    }

    const half = Math.floor(days / 2);
    const trends: KindTrend[] = [];

    for (const [kind, dm] of kindDateMap) {
      const dayBuckets: DayBucket[] = dateSlots.map((date) => {
        const b = dm.get(date);
        if (!b || b.total === 0) {
          return { date, total: 0, success: 0, successRate: -1, avgMs: 0 };
        }
        return {
          date,
          total: b.total,
          success: b.success,
          successRate: Math.round((b.success / b.total) * 100),
          avgMs: Math.round(b.sumMs / b.total),
        };
      });

      // 전체 성공률
      const totalRuns = dayBuckets.reduce((s, d) => s + d.total, 0);
      const totalSuccess = dayBuckets.reduce((s, d) => s + d.success, 0);
      const overallSuccessRate =
        totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : -1;

      // 열화 감지: 전반 vs 후반 비교
      const firstHalf = dayBuckets.slice(0, half);
      const secondHalf = dayBuckets.slice(half);
      const fTotal = firstHalf.reduce((s, d) => s + d.total, 0);
      const fSuccess = firstHalf.reduce((s, d) => s + d.success, 0);
      const sTotal = secondHalf.reduce((s, d) => s + d.total, 0);
      const sSuccess = secondHalf.reduce((s, d) => s + d.success, 0);

      let degraded = false;
      if (fTotal >= 3 && sTotal >= 3) {
        const fRate = (fSuccess / fTotal) * 100;
        const sRate = (sSuccess / sTotal) * 100;
        degraded = sRate < fRate - 10;
      }

      trends.push({ kind, days: dayBuckets, overallSuccessRate, degraded });
    }

    // 불안정(degraded) 우선, 그 다음 성공률 오름차순
    trends.sort((a, b) => {
      if (a.degraded !== b.degraded) return a.degraded ? -1 : 1;
      return a.overallSuccessRate - b.overallSuccessRate;
    });

    return NextResponse.json({ ok: true, trends, days });
  } catch (err) {
    console.error("[api/console/cron-runs/trend]", err);
    return NextResponse.json({ error: "cron 추세 조회 실패" }, { status: 500 });
  }
}
