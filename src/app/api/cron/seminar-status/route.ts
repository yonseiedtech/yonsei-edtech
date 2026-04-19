import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * 세미나 상태 자동 전환 + 워크플로우 엔진 Cron (매시간 실행)
 *
 * 1. upcoming → ongoing: 세미나 시작 시간 도래
 * 2. ongoing → completed: 세미나 종료 (시작+2시간)
 * 3. completed 전환 시: 참석자 리뷰 요청 알림 + 이메일, 연사 감사 이메일
 * 4. D+7: 미제출 후기 리마인더
 * 5. 수료증 발급 준비 알림 (후기 3건 이상 시)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayStr = kstNow.toISOString().split("T")[0];
    let updated = 0;
    let reviewNotifSent = 0;
    let workflowActions = 0;

    // ── 1. 상태 전환 (upcoming/ongoing) ──
    const snapshot = await db
      .collection("seminars")
      .where("status", "in", ["upcoming", "ongoing"])
      .get();

    for (const docSnap of snapshot.docs) {
      const seminar = docSnap.data();
      const seminarDate = seminar.date;
      const seminarTime = seminar.time || "00:00";

      const [hours, minutes] = seminarTime.split(":").map(Number);
      const startDate = new Date(`${seminarDate}T00:00:00+09:00`);
      startDate.setHours(startDate.getHours() + hours);
      startDate.setMinutes(startDate.getMinutes() + minutes);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

      let newStatus: string | null = null;

      if (seminar.status === "upcoming" && now >= startDate && now < endDate) {
        newStatus = "ongoing";
      } else if (seminar.status === "upcoming" && now >= endDate) {
        newStatus = "completed";
      } else if (seminar.status === "ongoing" && now >= endDate) {
        newStatus = "completed";
      }

      if (!newStatus) continue;

      await db.collection("seminars").doc(docSnap.id).update({
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      updated++;

      // ── completed 전환 시 워크플로우 ──
      if (newStatus === "completed") {
        const attendeeIds: string[] = seminar.attendeeIds ?? [];

        // 리뷰 요청 알림 (중복 방지)
        const existing = await db
          .collection("notifications")
          .where("type", "==", "review_request")
          .where("link", "==", `/seminars/${docSnap.id}/review`)
          .limit(1)
          .get();

        if (existing.empty && attendeeIds.length > 0) {
          const batch = db.batch();
          for (const userId of attendeeIds) {
            const ref = db.collection("notifications").doc();
            batch.set(ref, {
              userId,
              type: "review_request",
              title: "세미나 후기를 남겨주세요!",
              message: `"${seminar.title}" 세미나에 참석해 주셔서 감사합니다. 후기를 남겨주세요.`,
              link: `/seminars/${docSnap.id}/review`,
              read: false,
              createdAt: new Date().toISOString(),
            });
            reviewNotifSent++;
          }
          await batch.commit();
        }

        // 리뷰 요청 이메일 발송
        await sendReviewRequestEmails(db, seminar, docSnap.id, attendeeIds);

        // 연사 감사 이메일 발송
        await sendSpeakerThankYouEmail(db, seminar, docSnap.id);

        // 체크인 참석자 수료증 자동 발급 (autoIssueCertificates !== false 일 때)
        if (seminar.autoIssueCertificates !== false) {
          await autoIssueCompletionCertificates(db, seminar, docSnap.id);
        }
        workflowActions++;
      }
    }

    // ── 2. D+7 후기 미제출 리마인더 (completed 세미나) ──
    const d7ago = new Date(kstNow);
    d7ago.setDate(d7ago.getDate() - 7);
    const d7agoStr = d7ago.toISOString().split("T")[0];

    const completedSnapshot = await db
      .collection("seminars")
      .where("status", "==", "completed")
      .get();

    for (const docSnap of completedSnapshot.docs) {
      const seminar = docSnap.data();
      if (seminar.date !== d7agoStr) continue;

      const attendeeIds: string[] = seminar.attendeeIds ?? [];
      if (attendeeIds.length === 0) continue;

      // 중복 방지
      const existingReminder = await db
        .collection("notifications")
        .where("type", "==", "review_request")
        .where("link", "==", `/seminars/${docSnap.id}/review`)
        .where("title", "==", "아직 후기를 남기지 않으셨나요?")
        .limit(1)
        .get();

      if (!existingReminder.empty) continue;

      // 이미 후기를 남긴 사용자 제외
      const reviewsSnap = await db
        .collection("seminar_reviews")
        .where("seminarId", "==", docSnap.id)
        .where("type", "==", "attendee")
        .get();
      const reviewedUserIds = new Set(reviewsSnap.docs.map((d) => d.data().authorId));

      const unreviewed = attendeeIds.filter((id) => !reviewedUserIds.has(id));
      if (unreviewed.length === 0) continue;

      const batch = db.batch();
      for (const userId of unreviewed) {
        const ref = db.collection("notifications").doc();
        batch.set(ref, {
          userId,
          type: "review_request",
          title: "아직 후기를 남기지 않으셨나요?",
          message: `"${seminar.title}" 세미나 후기를 아직 작성하지 않으셨습니다. 소중한 의견을 남겨주세요!`,
          link: `/seminars/${docSnap.id}/review`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      workflowActions++;

      // ── 3. 수료증 발급 준비 알림 (후기 3건 이상) ──
      if (reviewsSnap.size >= 3) {
        const certAlertSnap = await db
          .collection("notifications")
          .where("type", "==", "certificate")
          .where("link", "==", `/academic-admin/seminars/certificate?seminarId=${docSnap.id}`)
          .limit(1)
          .get();

        if (certAlertSnap.empty) {
          // 운영진에게 알림
          const staffSnap = await db
            .collection("users")
            .where("role", "in", ["staff", "president", "admin"])
            .where("approved", "==", true)
            .get();

          const staffBatch = db.batch();
          for (const staffDoc of staffSnap.docs) {
            const ref = db.collection("notifications").doc();
            staffBatch.set(ref, {
              userId: staffDoc.id,
              type: "certificate",
              title: "수료증 발급 준비 알림",
              message: `"${seminar.title}" 세미나 후기가 ${reviewsSnap.size}건 접수되었습니다. 수료증 발급을 진행해 주세요.`,
              link: `/academic-admin/seminars/certificate?seminarId=${docSnap.id}`,
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
          await staffBatch.commit();
          workflowActions++;
        }
      }
    }

    return Response.json({ ok: true, date: todayStr, updated, reviewNotifSent, workflowActions });
  } catch (err) {
    console.error("[cron/seminar-status]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

/** 세미나 완료 시 참석자에게 후기 요청 이메일 발송 */
async function sendReviewRequestEmails(
  db: FirebaseFirestore.Firestore,
  seminar: FirebaseFirestore.DocumentData,
  seminarId: string,
  attendeeIds: string[],
) {
  const key = process.env.RESEND_API_KEY;
  if (!key || attendeeIds.length === 0) return;

  const logSnap = await db.collection("email_logs")
    .where("type", "==", "review_request")
    .where("targetId", "==", seminarId)
    .limit(1).get();
  if (!logSnap.empty) return;

  const Resend = (await import("resend")).Resend;
  const resend = new Resend(key);

  const emails: string[] = [];
  for (const uid of attendeeIds) {
    try {
      const u = await db.collection("users").doc(uid).get();
      const email = u.data()?.email || u.data()?.contactEmail;
      if (email) emails.push(email);
    } catch (e) { console.warn("[seminar-status] user fetch error:", uid, e); }
  }
  if (emails.length === 0) return;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #003876;">연세교육공학회</h2>
      <p>안녕하세요! <strong>${escapeHtml(seminar.title)}</strong> 세미나에 참석해 주셔서 감사합니다.</p>
      <p>세미나에 대한 소중한 후기를 남겨주시면, 더 좋은 세미나를 준비하는 데 큰 도움이 됩니다.</p>
      <p style="margin: 24px 0;"><a href="https://yonsei-edtech.vercel.app/seminars/${seminarId}/review" style="display: inline-block; padding: 12px 24px; background: #003876; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">후기 작성하기</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #888; font-size: 12px;">연세교육공학회 | yonsei.edtech@gmail.com</p>
    </div>
  `;

  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    try {
      await resend.emails.send({
        from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
        to: "noreply@yonsei-edtech.vercel.app",
        bcc: batch,
        subject: `[연세교육공학회] "${seminar.title}" 세미나 후기를 남겨주세요`,
        html,
      });
    } catch (e) { console.error("[email] review request error:", e); }
  }

  await db.collection("email_logs").add({
    type: "review_request",
    targetId: seminarId,
    recipientCount: emails.length,
    sentAt: new Date().toISOString(),
    sentBy: "system",
  });
}

/** 세미나 완료 시 연사에게 감사 이메일 + 후기 링크 발송 */
async function sendSpeakerThankYouEmail(
  db: FirebaseFirestore.Firestore,
  seminar: FirebaseFirestore.DocumentData,
  seminarId: string,
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const logSnap = await db.collection("email_logs")
    .where("type", "==", "review_request")
    .where("targetId", "==", `${seminarId}_speaker`)
    .limit(1).get();
  if (!logSnap.empty) return;

  // 연사 이메일 찾기 (연사가 회원인 경우 또는 등록 정보에서)
  let speakerEmail: string | null = null;
  if (seminar.speakerType === "member") {
    // attendees에서 연사 이름으로 검색
    const regSnap = await db.collection("seminar_registrations")
      .where("seminarId", "==", seminarId)
      .where("name", "==", seminar.speaker)
      .limit(1).get();
    if (!regSnap.empty) speakerEmail = regSnap.docs[0].data().email;
  }
  if (!speakerEmail) return;

  const Resend = (await import("resend")).Resend;
  const resend = new Resend(key);

  const reviewLink = seminar.speakerReviewToken
    ? `https://yonsei-edtech.vercel.app/seminars/${seminarId}/speaker-review?token=${seminar.speakerReviewToken}`
    : `https://yonsei-edtech.vercel.app/seminars/${seminarId}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #003876;">연세교육공학회</h2>
      <p>${escapeHtml(seminar.speaker)}님, 안녕하세요.</p>
      <p><strong>${escapeHtml(seminar.title)}</strong> 세미나에서 귀중한 발표를 해주셔서 진심으로 감사드립니다.</p>
      <p>아래 링크에서 감사장을 확인하시고, 세미나에 대한 의견을 남겨주시면 감사하겠습니다.</p>
      <p style="margin: 24px 0;"><a href="${reviewLink}" style="display: inline-block; padding: 12px 24px; background: #003876; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">감사장 확인 및 후기 작성</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #888; font-size: 12px;">연세교육공학회 | yonsei.edtech@gmail.com</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
      to: speakerEmail,
      subject: `[연세교육공학회] ${seminar.speaker}님, 발표해 주셔서 감사합니다`,
      html,
    });
    await db.collection("email_logs").add({
      type: "review_request",
      targetId: `${seminarId}_speaker`,
      recipientCount: 1,
      sentAt: new Date().toISOString(),
      sentBy: "system",
    });
  } catch (e) { console.error("[email] speaker thank-you error:", e); }
}

/**
 * 세미나 completed 전환 시 체크인(출석) 참석자에게 수료증 자동 발급.
 *
 * - 세미나 전용. 학술활동(study/project/external)은 별도 발급 시스템 필요
 *   (이수증/참석 확인서: 활동 기간·역할·주관기관·일정 등 필드 상이) → 별도 사이클에서 처리.
 * - 중복 발급 방지: 동일 seminarId × completion 타입 cert 1건이라도 있으면 skip.
 * - 학번 우선 매칭 → 이메일 매칭 fallback (batch route와 동일 정책).
 * - 발급 후 알림 1건 + email_logs 기록.
 */
async function autoIssueCompletionCertificates(
  db: FirebaseFirestore.Firestore,
  seminar: FirebaseFirestore.DocumentData,
  seminarId: string,
) {
  // 중복 발급 방지: 이미 completion 타입 1건이라도 있으면 skip (수동 발급 후 cron 재실행 케이스 보호)
  const existingCertSnap = await db
    .collection("certificates")
    .where("seminarId", "==", seminarId)
    .where("type", "==", "completion")
    .limit(1)
    .get();
  if (!existingCertSnap.empty) return;

  // email_logs 중복 방지 (같은 사이클 재실행 가드)
  const logSnap = await db
    .collection("email_logs")
    .where("type", "==", "auto_certificate")
    .where("targetId", "==", seminarId)
    .limit(1)
    .get();
  if (!logSnap.empty) return;

  // 체크인 참석자 조회
  const attendeesSnap = await db
    .collection("seminar_attendees")
    .where("seminarId", "==", seminarId)
    .where("checkedIn", "==", true)
    .get();
  if (attendeesSnap.empty) return;

  const seminarTitle = (seminar.title as string) ?? "";
  const year = new Date().getFullYear().toString().slice(-2);

  // 기존 certificateNo 최대값 (YY-NNN)
  const lastCertSnap = await db
    .collection("certificates")
    .orderBy("certificateNo", "desc")
    .limit(1)
    .get();
  let lastSeq = 0;
  if (!lastCertSnap.empty) {
    const no = lastCertSnap.docs[0].data().certificateNo as string | undefined;
    if (no && no.startsWith(year + "-")) {
      lastSeq = parseInt(no.slice(3), 10) || 0;
    }
  }

  const now = new Date().toISOString();
  let createdCount = 0;

  for (const attDoc of attendeesSnap.docs) {
    const att = attDoc.data();
    const userName = (att.userName as string) ?? "";
    const userId = (att.userId as string) ?? null;
    const studentId = (att.studentId as string) ?? null;
    const email = (att.email as string) ?? null;
    if (!userName) continue;

    try {
      lastSeq += 1;
      const certificateNo = `${year}-${String(lastSeq).padStart(3, "0")}`;

      // 학번 → 이메일 순 매칭 (cron 환경에서 attendee.userId 비어있을 수 있음)
      let recipientUserId: string | null = userId;
      if (!recipientUserId && studentId) {
        const u = await db.collection("users").where("studentId", "==", studentId).limit(1).get();
        if (!u.empty) recipientUserId = u.docs[0].id;
      }
      if (!recipientUserId && email) {
        const u = await db.collection("users").where("email", "==", email).limit(1).get();
        if (!u.empty) recipientUserId = u.docs[0].id;
      }

      await db.collection("certificates").add({
        seminarId,
        seminarTitle,
        recipientName: userName,
        recipientEmail: email,
        recipientStudentId: studentId,
        recipientUserId,
        type: "completion",
        certificateNo,
        issuedAt: now,
        issuedBy: "system",
        createdAt: now,
        updatedAt: now,
      });

      if (recipientUserId) {
        await db.collection("notifications").add({
          userId: recipientUserId,
          type: "certificate",
          title: "수료증이 발급되었습니다",
          message: `"${seminarTitle}" 수료증이 자동 발급되었습니다.`,
          link: "/mypage",
          read: false,
          createdAt: now,
        });
      }

      createdCount++;
    } catch (e) {
      console.error("[cron/auto-cert] issue error:", userName, e);
      lastSeq -= 1; // rollback seq
    }
  }

  if (createdCount > 0) {
    await db.collection("email_logs").add({
      type: "auto_certificate",
      targetId: seminarId,
      recipientCount: createdCount,
      sentAt: now,
      sentBy: "system",
    });
  }
}
