import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function sendReminderEmails(
  db: FirebaseFirestore.Firestore,
  seminar: FirebaseFirestore.DocumentData,
  seminarId: string,
  attendeeIds: string[],
  daysLeft: number,
) {
  const Resend = (await import("resend")).Resend;
  const key = process.env.RESEND_API_KEY;
  if (!key || attendeeIds.length === 0) return 0;

  // 이메일 중복 발송 방지
  const emailLogSnap = await db
    .collection("email_logs")
    .where("type", "==", "reminder")
    .where("targetId", "==", `${seminarId}_d${daysLeft}`)
    .limit(1)
    .get();
  if (!emailLogSnap.empty) return 0;

  const resend = new Resend(key);

  // 참석자 이메일 수집
  const emails: string[] = [];
  for (const userId of attendeeIds) {
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      const email = userDoc.data()?.email || userDoc.data()?.contactEmail;
      if (email) emails.push(email);
    } catch (e) { console.warn("[reminder] user fetch error:", userId, e); }
  }

  if (emails.length === 0) return 0;

  const locationInfo = seminar.isOnline
    ? `온라인 (ZOOM)${seminar.onlineUrl ? ` - ${seminar.onlineUrl}` : ""}`
    : (seminar.location || "미정");

  const subject = daysLeft === 0
    ? `[연세교육공학회] 오늘 세미나가 진행됩니다 - ${seminar.title}`
    : daysLeft === 1
    ? `[연세교육공학회] 내일 세미나가 있습니다 - ${seminar.title}`
    : `[연세교육공학회] 세미나 D-${daysLeft} 안내 - ${seminar.title}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #003876;">연세교육공학회</h2>
      <p>안녕하세요, 세미나 참석 안내 드립니다.</p>
      <div style="margin: 20px 0; padding: 16px; background: #eef3ff; border-left: 4px solid #003876; border-radius: 4px;">
        <p style="margin: 0 0 8px; font-size: 16px; font-weight: bold; color: #003876;">${escapeHtml(seminar.title)}</p>
        <p style="margin: 4px 0; font-size: 14px;">📅 일시: ${escapeHtml(seminar.date)} ${escapeHtml(seminar.time || "")}</p>
        <p style="margin: 4px 0; font-size: 14px;">📍 장소: ${escapeHtml(locationInfo)}</p>
        <p style="margin: 4px 0; font-size: 14px;">🎤 발표자: ${escapeHtml(seminar.speaker || "")}</p>
      </div>
      ${daysLeft === 0
        ? '<p style="color: #dc2626; font-weight: bold;">🎯 오늘 세미나가 진행됩니다. 시간 맞춰 참석해 주세요!</p>'
        : daysLeft === 1
        ? '<p style="color: #d97706; font-weight: bold;">⏰ 내일 세미나가 진행됩니다. 시간에 맞춰 참석해 주세요!</p>'
        : `<p>세미나가 <strong>${daysLeft}일 후</strong> 진행됩니다.</p>`}
      <p><a href="https://yonsei-edtech.vercel.app/seminars/${seminarId}" style="display: inline-block; padding: 10px 20px; background: #003876; color: white; text-decoration: none; border-radius: 6px;">세미나 상세 보기</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #888; font-size: 12px;">연세교육공학회 | yonsei.edtech@gmail.com</p>
    </div>
  `;

  // BCC로 일괄 발송 (한 번에 최대 50명씩)
  let sentCount = 0;
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    try {
      await resend.emails.send({
        from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
        to: "noreply@yonsei-edtech.vercel.app",
        bcc: batch,
        subject,
        html,
      });
      sentCount += batch.length;
    } catch (e) {
      console.error("[email] reminder send error:", e);
    }
  }

  // 발송 이력 저장
  await db.collection("email_logs").add({
    type: "reminder",
    targetId: `${seminarId}_d${daysLeft}`,
    recipientCount: sentCount,
    sentAt: new Date().toISOString(),
    sentBy: "system",
  });

  return sentCount;
}

/**
 * 세미나 사전 알림 Cron (매일 09:00 KST 실행)
 * D-3, D-1 세미나에 대해 참석 예정 회원에게 알림 + 이메일 발송
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = kstNow.toISOString().split("T")[0];

    const d0 = today;
    const d1 = addDays(kstNow, 1);
    const d3 = addDays(kstNow, 3);

    const seminarsSnapshot = await db
      .collection("seminars")
      .where("status", "in", ["upcoming", "ongoing"])
      .get();

    let notifCount = 0;
    let emailCount = 0;

    for (const doc of seminarsSnapshot.docs) {
      const seminar = doc.data();
      const seminarDate = seminar.date;

      let daysLeft: number | null = null;
      if (seminarDate === d0) daysLeft = 0;
      else if (seminarDate === d1) daysLeft = 1;
      else if (seminarDate === d3) daysLeft = 3;

      if (daysLeft === null) continue;

      const attendeeIds: string[] = seminar.attendeeIds ?? [];
      if (attendeeIds.length === 0) continue;

      // Sprint 69 핫픽스: 사용자 단위 가드 (기존: 1건이라도 있으면 전체 skip → 후속 attendee 누락)
      const existingSnapshot = await db
        .collection("notifications")
        .where("type", "==", "seminar_reminder")
        .where("link", "==", `/seminars/${doc.id}`)
        .where("title", "==", `세미나 D-${daysLeft} 리마인더`)
        .get();
      const sentUserIds = new Set(existingSnapshot.docs.map((d) => d.data().userId as string));
      const newRecipients = attendeeIds.filter((uid) => !sentUserIds.has(uid));

      if (newRecipients.length === 0) continue;

      // 인앱 알림 생성
      const batch = db.batch();
      for (const userId of newRecipients) {
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
        notifCount++;
      }
      await batch.commit();

      // 이메일 발송
      const sent = await sendReminderEmails(db, seminar, doc.id, attendeeIds, daysLeft);
      emailCount += sent;
    }

    return Response.json({ ok: true, date: today, notifCount, emailCount });
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
