import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * 개강 리마인더 Cron (매일 09:00 KST) — 방학 이탈 회원 회수 안전망.
 *
 * 관례 개강일(1학기 3/1, 2학기 9/1) 기준 D-7·D-1 에 승인 회원 전원에게 인앱 알림.
 * 학기 키(YYYY-N) + D-값을 refId 로 사용자 단위 중복 가드.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const today = kstNow.toISOString().split("T")[0];
    const y = kstNow.getUTCFullYear();

    // 올해와 이듬해의 개강일 후보 (연말 12월에 이듬해 3/1 D-x 대응)
    const starts: { date: string; label: string; semKey: string }[] = [
      { date: `${y}-03-01`, label: `${y}년 1학기`, semKey: `${y}-1` },
      { date: `${y}-09-01`, label: `${y}년 2학기`, semKey: `${y}-2` },
      { date: `${y + 1}-03-01`, label: `${y + 1}년 1학기`, semKey: `${y + 1}-1` },
    ];

    const target = starts
      .map((s) => ({ ...s, daysLeft: diffDays(today, s.date) }))
      .find((s) => s.daysLeft === 7 || s.daysLeft === 1);

    if (!target) {
      return Response.json({ ok: true, date: today, notifCount: 0, reason: "not D-7/D-1" });
    }

    const db = getAdminDb();
    const refId = `${target.semKey}_d${target.daysLeft}`;

    // 중복 가드 — 같은 학기·같은 D-값으로 이미 발송된 수신자 제외
    const existing = await db
      .collection("notifications")
      .where("type", "==", "class_reminder")
      .where("refId", "==", refId)
      .get();
    const sent = new Set(existing.docs.map((d) => (d.data() as { userId?: string }).userId));

    const usersSnap = await db.collection("users").where("approved", "==", true).get();
    const targets = usersSnap.docs.map((d) => d.id).filter((id) => !sent.has(id));

    const nowIso = new Date().toISOString();
    let notifCount = 0;
    // Firestore 배치 500 제한 — 400 단위 커밋
    for (let i = 0; i < targets.length; i += 400) {
      const batch = db.batch();
      for (const userId of targets.slice(i, i + 400)) {
        const ref = db.collection("notifications").doc();
        batch.set(ref, {
          userId,
          type: "class_reminder",
          title: `${target.label} 개강 D-${target.daysLeft}`,
          message:
            target.daysLeft === 7
              ? `${target.label}가 일주일 뒤 시작됩니다. 수강 과목과 시간표를 미리 확인해 보세요.`
              : `내일 ${target.label}가 시작됩니다. 시간표를 확인하세요.`,
          link: "/courses?tab=mine",
          refId,
          read: false,
          createdAt: nowIso,
        });
        notifCount++;
      }
      await batch.commit();
    }

    return Response.json({ ok: true, date: today, semester: target.semKey, daysLeft: target.daysLeft, notifCount });
  } catch (err) {
    console.error("[cron/semester-start-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

/** to - from 일수 (YYYY-MM-DD) */
function diffDays(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}
