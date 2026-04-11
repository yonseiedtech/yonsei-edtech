import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 세미나 사전 알림 Cron (매일 09:00 KST 실행)
 * D-3, D-1 세미나에 대해 참석 예정 회원에게 알림을 생성한다.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    // KST 기준 오늘 날짜
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = kstNow.toISOString().split("T")[0]; // YYYY-MM-DD

    // D+1, D+3 날짜 계산
    const d1 = addDays(kstNow, 1);
    const d3 = addDays(kstNow, 3);

    // upcoming 세미나 전체 조회
    const seminarsSnapshot = await db
      .collection("seminars")
      .where("status", "in", ["upcoming", "ongoing"])
      .get();

    let sentCount = 0;

    for (const doc of seminarsSnapshot.docs) {
      const seminar = doc.data();
      const seminarDate = seminar.date; // "YYYY-MM-DD" 형식

      let daysLeft: number | null = null;
      if (seminarDate === d1) daysLeft = 1;
      else if (seminarDate === d3) daysLeft = 3;

      if (daysLeft === null) continue;

      // 참석 예정자 (attendeeIds) 에게 알림 생성
      const attendeeIds: string[] = seminar.attendeeIds ?? [];
      if (attendeeIds.length === 0) continue;

      // 이미 발송된 알림 중복 방지: 같은 세미나+같은 D-day 조합 체크
      const existingSnapshot = await db
        .collection("notifications")
        .where("type", "==", "seminar_reminder")
        .where("link", "==", `/seminars/${doc.id}`)
        .where("title", "==", `세미나 D-${daysLeft} 리마인더`)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) continue; // 이미 발송됨

      const batch = db.batch();
      for (const userId of attendeeIds) {
        const ref = db.collection("notifications").doc();
        batch.set(ref, {
          userId,
          type: "seminar_reminder",
          title: `세미나 D-${daysLeft} 리마인더`,
          message: `"${seminar.title}" 세미나가 ${daysLeft}일 후 진행됩니다.`,
          link: `/seminars/${doc.id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
        sentCount++;
      }
      await batch.commit();
    }

    return Response.json({
      ok: true,
      date: today,
      sentCount,
    });
  } catch (err) {
    console.error("[cron/seminar-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
