import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import type { CronRunMeta } from "@/lib/cron-observability";

/**
 * cron 실패 능동 경보 (v8-H1, 2026-07-20) — 일 1회 04:00 UTC (13:00 KST).
 *
 * cron_runs 를 kind별로 스캔해 **연속 2회+ 실패** kind를 감지하고
 * admin/sysadmin 역할 회원에게 인앱 알림을 발송한다.
 *
 * 소비 완결: v7-M6 이 cron_runs 적재·조회·콘솔 배너까지만 구축한 상태에서
 * "운영진이 콘솔을 열어야만 발견"하는 수동 의존을 능동 알림으로 대체한다.
 *
 * dedup: notifications 컬렉션 refId = `watchdog_{kind}_{ymd}` 로 kind별 1일 1회 보장.
 * 자체도 withCronLog 로 래핑되어 cron_runs 에 실행 기록이 남는다.
 *
 * stale(침묵) 감지 — vercel.json 스케줄 파싱이 복잡해 이번 구현에서는 생략.
 * 연속 실패(consecutive ≥ 2)만 경보 대상. (계획서 §H1 "(b) ... 어려우면 (a)만" 명시)
 */

const CONSECUTIVE_THRESHOLD = 2;
const MAX_RUNS_SCAN = 500;

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

    // 연속 2회+ 실패 kind 감지
    const failingKinds: {
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
          kind,
          consecutiveFailures: consecutive,
          lastErrorMessage: runs[0]?.errorMessage,
        });
      }
    }

    if (failingKinds.length === 0) {
      return Response.json({ ok: true, ymd, alerted: 0, reason: "no failing kinds" });
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

    // ── dedup: 오늘 이미 발송된 kind 제외 ────────────────────────────────
    const refIds = failingKinds.map((f) => `watchdog_${f.kind}_${ymd}`);
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

    const toAlert = failingKinds.filter(
      (f) => !alreadySentRefIds.has(`watchdog_${f.kind}_${ymd}`),
    );

    if (toAlert.length === 0) {
      return Response.json({ ok: true, ymd, alerted: 0, reason: "all already sent today" });
    }

    // ── 알림 배치 발송 (kind × admin) ────────────────────────────────────
    let alerted = 0;
    for (const { kind, consecutiveFailures, lastErrorMessage } of toAlert) {
      const refId = `watchdog_${kind}_${ymd}`;
      const message = `${kind} cron이 ${consecutiveFailures}회 연속 실패했습니다.${
        lastErrorMessage ? ` 오류: ${lastErrorMessage.slice(0, 80)}` : ""
      } 콘솔에서 확인해 주세요.`;

      for (let i = 0; i < adminIds.length; i += 400) {
        const batch = db.batch();
        for (const userId of adminIds.slice(i, i + 400)) {
          const ref = db.collection("notifications").doc();
          batch.set(ref, {
            userId,
            type: "cron_watchdog",
            title: `cron 실패 경보: ${kind}`,
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
      .map((f) => `${f.kind}(${f.consecutiveFailures}회)`)
      .join(", ");

    console.log(
      `[cron/cron-watchdog] ${ymd} alerted=${alerted} kinds=${summary}`,
    );

    return Response.json({ ok: true, ymd, alerted, failingKinds: toAlert, summary });
  } catch (err) {
    console.error("[cron/cron-watchdog]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronLog("cron-watchdog", _handler);
