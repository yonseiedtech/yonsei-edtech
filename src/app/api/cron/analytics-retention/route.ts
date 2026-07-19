import { NextRequest, NextResponse } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { requireAuth } from "@/lib/api-auth";

/**
 * 적재 컬렉션 보존 정책 cron (v7-H3, 2026-07-20) — 주 1회 (월요일 02:00 UTC = 11:00 KST).
 *
 * 로그성 대용량 컬렉션의 오래된 문서를 배치 삭제해 Firestore 읽기/저장 비용을 방어한다.
 *
 * 대상 컬렉션 · 보존 기간:
 *   - user_activity_logs : createdAt 180일 초과 삭제
 *   - daily_visits       : date(YYYY-MM-DD) 180일 초과 삭제
 *   - search_misses      : lastAt 365일 초과 삭제
 *   - cron_runs          : createdAt 90일 초과 삭제 (v8-M6, 2026-07-20)
 *
 * 안전 보장:
 *   - 회원 데이터·기록성 컬렉션(weekly_goal_records·adoption_history·adoption_snapshots 등)은 건드리지 않는다.
 *   - 컬렉션당 1회 최대 2,000건 삭제(BATCH_LIMIT) — 초과분은 다음 주기에 처리(타임아웃 방어).
 *   - ?dryRun=true 시 삭제 예정 건수만 보고, 실제 삭제 없음.
 */

const BATCH_LIMIT = 2000; // 컬렉션당 1회 삭제 상한 (타임아웃 방어)
const CHUNK = 500;        // Firestore writeBatch 최대 500건

async function _handler(req: NextRequest) {
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "true";

  if (!verifyCronAuth(req)) {
    // dry-run(조회만)은 관리자 세션으로도 확인 가능 — 실제 삭제는 cron 시크릿 전용
    if (!dryRun) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authResult = await requireAuth(req, "admin");
    if (authResult instanceof NextResponse) return authResult;
  }

  try {
    const db = getAdminDb();
    const now = Date.now();

    // ── 기준일 계산 ─────────────────────────────────────────────────────────
    // user_activity_logs.createdAt 는 ISO 문자열 (visit-tracker.ts trackUserActivity)
    const cutoff180Iso = new Date(now - 180 * 86_400_000).toISOString();
    // daily_visits 문서 ID 및 date 필드는 YYYY-MM-DD 형식 (visit-tracker.ts ymd)
    const cutoff180Ymd = cutoff180Iso.slice(0, 10);
    // search_misses.lastAt 는 serverTimestamp() → Firestore Timestamp
    // Admin SDK where 절에 Date 전달 시 내부 변환됨
    const cutoff365Date = new Date(now - 365 * 86_400_000);
    // cron_runs.createdAt 는 ISO 문자열 (cron-observability.ts logCronRun) — v8-M6
    const cutoff90Iso = new Date(now - 90 * 86_400_000).toISOString();

    // ── 후보 쿼리 (병렬) ────────────────────────────────────────────────────
    const [activitySnap, visitsSnap, missesSnap, cronRunsSnap] = await Promise.all([
      db
        .collection("user_activity_logs")
        .where("createdAt", "<", cutoff180Iso)
        .limit(BATCH_LIMIT)
        .get(),
      db
        .collection("daily_visits")
        .where("date", "<", cutoff180Ymd)
        .limit(BATCH_LIMIT)
        .get(),
      db
        .collection("search_misses")
        .where("lastAt", "<", cutoff365Date)
        .limit(BATCH_LIMIT)
        .get(),
      // v8-M6: cron 관측 컬렉션 — 90일 초과 삭제로 무한 증가 방어
      db
        .collection("cron_runs")
        .where("createdAt", "<", cutoff90Iso)
        .limit(BATCH_LIMIT)
        .get(),
    ]);

    const counts = {
      user_activity_logs: activitySnap.size,
      daily_visits: visitsSnap.size,
      search_misses: missesSnap.size,
      cron_runs: cronRunsSnap.size,
    };

    console.log(
      `[cron/analytics-retention] ${dryRun ? "DRY-RUN" : "DELETE"} candidates`,
      counts,
    );

    if (!dryRun) {
      // 각 컬렉션을 500건 단위 배치로 삭제
      for (const snap of [activitySnap, visitsSnap, missesSnap, cronRunsSnap]) {
        for (let i = 0; i < snap.docs.length; i += CHUNK) {
          const batch = db.batch();
          for (const d of snap.docs.slice(i, i + CHUNK)) batch.delete(d.ref);
          await batch.commit();
        }
      }
      console.log("[cron/analytics-retention] deleted", counts);
    }

    return Response.json({ ok: true, dryRun, deleted: counts });
  } catch (err) {
    console.error("[cron/analytics-retention]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronLog("analytics-retention", _handler);
