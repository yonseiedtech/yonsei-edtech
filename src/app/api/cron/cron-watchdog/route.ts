import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { CRON_KIND_INTERVALS, isStaleKind } from "@/lib/cron-stale";
import type { CronRunMeta } from "@/lib/cron-observability";

/**
 * cron 실패 능동 경보 + stale(침묵) 감지 — v8-H1 + v9-M1 (2026-07-20).
 *
 * [v8-H1] 연속 2회+ 실패 kind 감지 → admin/sysadmin 인앱 알림.
 * [v9-M1] 기대 주기(vercel.json) × 2 초과 침묵 kind 감지 → 동일 채널 stale 알림.
 *
 * ## stale 판정 규칙
 * - CRON_KIND_INTERVALS(vercel.json 기반)에서 kind별 최대 기대 간격을 가져온다.
 * - cron_runs 최신 실행이 기대 간격 × 2 초과 → stale 경보.
 * - cron_runs 기록이 아예 없는 kind → 오탐 방지로 스킵 (관측 도입 전 케이스).
 * - 자기 자신(cron-watchdog)은 stale 체크에서 제외.
 *
 * ## dedup
 * - 연속 실패: refId = `watchdog_{kind}_{ymd}` (kind별 1일 1회)
 * - stale 침묵: refId = `stale_{kind}_{ymd}` (kind별 1일 1회)
 */

const CONSECUTIVE_THRESHOLD = 2;
const MAX_RUNS_SCAN = 500;
/** stale 자기 자신 체크 제외 — watchdog이 실행 중이라면 스스로를 stale로 보고할 수 없음 */
const SELF_KIND = "cron-watchdog";

function kstYmd(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const ymd = kstYmd();

    // ── cron_runs 최근 스캔 (최신순) ─────────────────────────────────────
    const snap = await db
      .collection("cron_runs")
      .orderBy("startedAt", "desc")
      .limit(MAX_RUNS_SCAN)
      .get();

    // kind별 최신순 그룹핑 (이미 startedAt desc 정렬됨)
    const byKind = new Map<string, CronRunMeta[]>();
    for (const doc of snap.docs) {
      const data = doc.data() as CronRunMeta;
      const kind = data.kind ?? "(unknown)";
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind)!.push(data);
    }

    // ── [v8-H1] 연속 2회+ 실패 감지 ─────────────────────────────────────
    const failingKinds: {
      alertType: "failure";
      kind: string;
      consecutiveFailures: number;
      lastErrorMessage?: string;
    }[] = [];

    for (const [kind, runs] of byKind) {
      let consecutive = 0;
      for (const run of runs) {
        if (!run.success) consecutive++;
        else break;
      }
      if (consecutive >= CONSECUTIVE_THRESHOLD) {
        failingKinds.push({
          alertType: "failure",
          kind,
          consecutiveFailures: consecutive,
          lastErrorMessage: runs[0]?.errorMessage,
        });
      }
    }

    // ── [v9-M1] stale(침묵) 감지: 기대 주기 × 2 초과 kind ───────────────
    const staleKinds: {
      alertType: "stale";
      kind: string;
      elapsedH: number;
    }[] = [];

    for (const [kind] of CRON_KIND_INTERVALS) {
      if (kind === SELF_KIND) continue; // 자기 자신 제외
      const runs = byKind.get(kind);
      if (!runs || runs.length === 0) continue; // 기록 없음 → 오탐 방지 스킵
      const latestRunAt = runs[0]?.startedAt;
      if (!latestRunAt) continue;
      if (isStaleKind(kind, latestRunAt)) {
        const elapsedMs = Date.now() - new Date(latestRunAt).getTime();
        staleKinds.push({
          alertType: "stale",
          kind,
          elapsedH: Math.floor(elapsedMs / 3_600_000),
        });
      }
    }

    // 이상 없으면 조기 종료
    if (failingKinds.length === 0 && staleKinds.length === 0) {
      return Response.json({ ok: true, ymd, alerted: 0, reason: "no issues detected" });
    }

    // ── admin/sysadmin 수신자 조회 ────────────────────────────────────────
    const [adminSnap, sysadminSnap] = await Promise.all([
      db.collection("users").where("role", "==", "admin").get(),
      db.collection("users").where("role", "==", "sysadmin").get(),
    ]);
    const adminIds = [
      ...adminSnap.docs.map((d) => d.id),
      ...sysadminSnap.docs.map((d) => d.id),
    ];

    if (adminIds.length === 0) {
      return Response.json({ ok: true, ymd, alerted: 0, reason: "no admin users" });
    }

    const nowIso = new Date().toISOString();

    // ── dedup 확인 (failing + stale 통합) ─────────────────────────────────
    type AlertItem = (typeof failingKinds)[number] | (typeof staleKinds)[number];
    const allAlerts: AlertItem[] = [...failingKinds, ...staleKinds];

    const refIds = allAlerts.map((a) =>
      a.alertType === "failure"
        ? `watchdog_${a.kind}_${ymd}`
        : `stale_${a.kind}_${ymd}`,
    );

    const existingSnaps = await Promise.all(
      refIds.map((refId) =>
        db
          .collection("notifications")
          .where("type", "==", "cron_watchdog")
          .where("refId", "==", refId)
          .limit(1)
          .get(),
      ),
    );
    const alreadySentRefIds = new Set(
      refIds.filter((_, i) => !existingSnaps[i].empty),
    );

    const toAlert = allAlerts.filter((_, i) => !alreadySentRefIds.has(refIds[i]));

    if (toAlert.length === 0) {
      return Response.json({ ok: true, ymd, alerted: 0, reason: "all already sent today" });
    }

    // ── 알림 배치 발송 (kind × admin) ────────────────────────────────────
    let alerted = 0;
    for (const alert of toAlert) {
      const refId =
        alert.alertType === "failure"
          ? `watchdog_${alert.kind}_${ymd}`
          : `stale_${alert.kind}_${ymd}`;

      const title =
        alert.alertType === "failure"
          ? `cron 실패 경보: ${alert.kind}`
          : `cron 침묵 경보: ${alert.kind}`;

      const message =
        alert.alertType === "failure"
          ? `${alert.kind} cron이 ${alert.consecutiveFailures}회 연속 실패했습니다.${
              alert.lastErrorMessage ? ` 오류: ${alert.lastErrorMessage.slice(0, 80)}` : ""
            } 콘솔에서 확인해 주세요.`
          : `${alert.kind} cron이 ${alert.elapsedH}시간째 실행 기록이 없습니다(침묵). 콘솔에서 확인해 주세요.`;

      for (let i = 0; i < adminIds.length; i += 400) {
        const batch = db.batch();
        for (const userId of adminIds.slice(i, i + 400)) {
          const ref = db.collection("notifications").doc();
          batch.set(ref, {
            userId,
            type: "cron_watchdog",
            title,
            message,
            link: "/console/cron-logs",
            refId,
            read: false,
            createdAt: nowIso,
          });
          alerted++;
        }
        await batch.commit();
      }
    }

    const summary = toAlert
      .map((a) =>
        a.alertType === "failure"
          ? `${a.kind}(${a.consecutiveFailures}회 실패)`
          : `${a.kind}(침묵 ${a.elapsedH}h)`,
      )
      .join(", ");

    console.log(`[cron/cron-watchdog] ${ymd} alerted=${alerted} ${summary}`);

    return Response.json({
      ok: true,
      ymd,
      alerted,
      failingKinds: toAlert.filter((a) => a.alertType === "failure"),
      staleKinds: toAlert.filter((a) => a.alertType === "stale"),
      summary,
    });
  } catch (err) {
    console.error("[cron/cron-watchdog]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronLog("cron-watchdog", _handler);
