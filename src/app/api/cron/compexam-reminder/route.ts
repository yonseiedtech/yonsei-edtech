import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers } from "@/lib/push-admin";

/**
 * 종합시험 리마인더 크론 (RT-1, 2026-07-04) — 매일 1회.
 *
 * 배경: 종합시험 D-day 는 대시보드 위젯에만 존재해(접속해야 보임) 응시 계획자가
 * 시험 임박을 알 길이 없었다 (리텐션 재감사 High).
 * 운영진 일정(comprehensive_exam_schedules.examDate) × 본인 응시 계획
 * (comprehensive_exam_records, status planning|applied, plannedYear/Term 매칭)으로
 * D-30 / D-7 / D-1 에 인앱 + 웹푸시 발송. refId 멱등 가드로 중복 방지,
 * 크론 1회 실패에 대비해 범위 보정(D-30~8→d30, D-7~2→d7, D-1→d1).
 */
async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const today = kstNow.toISOString().split("T")[0];
    const db = getAdminDb();

    const schedSnap = await db.collection("comprehensive_exam_schedules").limit(50).get();
    const results: unknown[] = [];

    for (const doc of schedSnap.docs) {
      const sched = doc.data() as { year?: number; term?: string; examDate?: string };
      if (!sched.year || !sched.term || !sched.examDate) continue;
      const daysLeft = diffDays(today, sched.examDate);
      // 범위 보정 버킷
      const bucket = daysLeft === 1 ? 1 : daysLeft >= 2 && daysLeft <= 7 ? 7 : daysLeft >= 8 && daysLeft <= 30 ? 30 : null;
      if (bucket === null) continue;

      const refId = `compexam_${sched.year}-${sched.term}_d${bucket}`;

      // 응시 계획자 (planning | applied)
      const recSnap = await db
        .collection("comprehensive_exam_records")
        .where("plannedYear", "==", sched.year)
        .where("plannedTerm", "==", sched.term)
        .limit(500)
        .get();
      const targets = Array.from(
        new Set(
          recSnap.docs
            .map((d) => d.data() as { userId?: string; status?: string })
            .filter((r) => r.status === "planning" || r.status === "applied")
            .map((r) => r.userId)
            .filter((id): id is string => !!id),
        ),
      );
      if (targets.length === 0) continue;

      // 멱등 가드 — 같은 시험×버킷으로 이미 발송된 수신자 제외
      const existing = await db
        .collection("notifications")
        .where("type", "==", "activity_reminder")
        .where("refId", "==", refId)
        .get();
      const sent = new Set(existing.docs.map((d) => (d.data() as { userId?: string }).userId));
      const fresh = targets.filter((id) => !sent.has(id));
      if (fresh.length === 0) {
        results.push({ refId, skipped: "already sent" });
        continue;
      }

      const dLabel = daysLeft === 0 ? "D-Day" : `D-${daysLeft}`;
      const title = `종합시험 ${dLabel}`;
      const message =
        bucket === 30
          ? `${sched.year}년 ${sched.term === "spring" ? "1" : "2"}학기 종합시험(${sched.examDate})이 한 달 앞으로 — 과목별 준비 계획을 세워보세요.`
          : bucket === 7
            ? `종합시험(${sched.examDate})이 일주일 앞입니다 — 기출·아카이브 개념 정리로 마무리하세요.`
            : `내일이 종합시험일입니다 — 시험장·시간을 다시 확인하세요.`;

      const nowIso = new Date().toISOString();
      const batch = db.batch();
      for (const userId of fresh) {
        const ref = db.collection("notifications").doc();
        batch.set(ref, {
          userId,
          type: "activity_reminder",
          title,
          message,
          link: "/courses",
          refId,
          read: false,
          createdAt: nowIso,
        });
      }
      await batch.commit();

      let pushResult: unknown = null;
      try {
        pushResult = await sendPushToUsers(fresh, {
          title,
          body: message,
          link: "/courses",
          tag: refId,
        });
      } catch (e) {
        console.error("[compexam-reminder] push failed", e);
      }
      results.push({ refId, notifCount: fresh.length, pushResult });
    }

    return Response.json({ ok: true, date: today, results });
  } catch (err) {
    console.error("[cron/compexam-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

function diffDays(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

export const GET = withCronLog("compexam-reminder", _handler);
