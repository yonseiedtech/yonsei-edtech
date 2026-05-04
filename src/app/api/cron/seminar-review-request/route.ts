import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function sendReviewRequestEmails(
  db: FirebaseFirestore.Firestore,
  seminar: FirebaseFirestore.DocumentData,
  seminarId: string,
  pendingUserIds: string[],
) {
  const Resend = (await import("resend")).Resend;
  const key = process.env.RESEND_API_KEY;
  if (!key || pendingUserIds.length === 0) return 0;

  // 동일 세미나에 대한 후기 요청 메일 1회 제한
  const dupSnap = await db
    .collection("email_logs")
    .where("type", "==", "review_request")
    .where("targetId", "==", seminarId)
    .limit(1)
    .get();
  if (!dupSnap.empty) return 0;

  const resend = new Resend(key);
  const emails: string[] = [];
  for (const userId of pendingUserIds) {
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      const email = userDoc.data()?.email || userDoc.data()?.contactEmail;
      if (email) emails.push(email);
    } catch (e) {
      console.warn("[review-request] user fetch error:", userId, e);
    }
  }
  if (emails.length === 0) return 0;

  const subject = `[연세교육공학회] 세미나 후기를 남겨주세요 - ${seminar.title}`;
  const reviewLink = `https://yonsei-edtech.vercel.app/seminars/${seminarId}/review`;
  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #003876;">연세교육공학회</h2>
      <p>안녕하세요. 어제 세미나에 참석해 주셔서 감사합니다.</p>
      <div style="margin: 20px 0; padding: 16px; background: #eef3ff; border-left: 4px solid #003876; border-radius: 4px;">
        <p style="margin: 0 0 8px; font-size: 16px; font-weight: bold; color: #003876;">${escapeHtml(seminar.title)}</p>
        <p style="margin: 4px 0; font-size: 14px;">📅 일시: ${escapeHtml(seminar.date)} ${escapeHtml(seminar.time || "")}</p>
        <p style="margin: 4px 0; font-size: 14px;">🎤 발표자: ${escapeHtml(seminar.speaker || "")}</p>
      </div>
      <p>짧은 후기로 발표자와 운영진에게 큰 응원이 됩니다. 1~2분이면 충분합니다.</p>
      <p><a href="${reviewLink}" style="display: inline-block; padding: 10px 20px; background: #003876; color: white; text-decoration: none; border-radius: 6px;">세미나 후기 작성하기</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #888; font-size: 12px;">연세교육공학회 | yonsei.edtech@gmail.com</p>
    </div>
  `;

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
      console.error("[email] review-request send error:", e);
    }
  }

  await db.collection("email_logs").add({
    type: "review_request",
    targetId: seminarId,
    recipientCount: sentCount,
    sentAt: new Date().toISOString(),
    sentBy: "system",
  });

  return sentCount;
}

/**
 * 세미나 사후 후기 요청 Cron (매일 00:00 UTC = 09:00 KST 실행)
 * 어제(D-1) 종료된 세미나의 체크인 완료 참석자 중 후기 미작성자에게
 * 인앱 알림 + 이메일을 1회만 발송한다.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const yesterday = addDays(kstNow, -1);

    // 어제 진행된 세미나만 대상 (status는 cron 순서로 인해 이미 completed/upcoming 혼재 가능)
    const seminarsSnap = await db
      .collection("seminars")
      .where("date", "==", yesterday)
      .get();

    let notifCount = 0;
    let emailCount = 0;
    const processed: string[] = [];

    for (const doc of seminarsSnap.docs) {
      const seminar = doc.data();
      const seminarId = doc.id;

      // 체크인 완료된 참석자 조회
      const attendeesSnap = await db
        .collection("seminar_attendees")
        .where("seminarId", "==", seminarId)
        .where("checkedIn", "==", true)
        .get();
      const attendeeUserIds = attendeesSnap.docs
        .map((d) => d.data().userId as string | undefined)
        .filter((x): x is string => !!x);
      if (attendeeUserIds.length === 0) continue;

      // 이미 후기 작성한 userId 제외
      const reviewsSnap = await db
        .collection("seminar_reviews")
        .where("seminarId", "==", seminarId)
        .get();
      const reviewedUserIds = new Set(
        reviewsSnap.docs
          .map((d) => d.data().authorId as string | undefined)
          .filter((x): x is string => !!x),
      );
      const pendingUserIds = attendeeUserIds.filter((uid) => !reviewedUserIds.has(uid));
      if (pendingUserIds.length === 0) continue;

      // Sprint 69 핫픽스: 사용자 단위 가드 (기존: 1건이라도 있으면 batch 전체 skip → 후속 attendee 누락)
      const existingNotif = await db
        .collection("notifications")
        .where("type", "==", "seminar_review_request")
        .where("link", "==", `/seminars/${seminarId}/review`)
        .get();
      const sentSet = new Set(existingNotif.docs.map((d) => d.data().userId as string));
      const newRecipients = pendingUserIds.filter((uid) => !sentSet.has(uid));

      if (newRecipients.length > 0) {
        const batch = db.batch();
        for (const uid of newRecipients) {
          const ref = db.collection("notifications").doc();
          batch.set(ref, {
            userId: uid,
            type: "seminar_review_request",
            title: "세미나 후기를 남겨주세요",
            message: `"${seminar.title}" 세미나의 후기를 작성해 주세요.`,
            link: `/seminars/${seminarId}/review`,
            read: false,
            createdAt: new Date().toISOString(),
          });
          notifCount++;
        }
        await batch.commit();
      }

      const sent = await sendReviewRequestEmails(db, seminar, seminarId, pendingUserIds);
      emailCount += sent;
      processed.push(seminarId);
    }

    return Response.json({ ok: true, yesterday, notifCount, emailCount, processed });
  } catch (err) {
    console.error("[cron/seminar-review-request]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
