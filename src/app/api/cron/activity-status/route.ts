import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 활동 상태 자동 전환 + 자동 수료증/참석확인서 발급 Cron (매일 09:00 KST 실행)
 *
 * 1. upcoming → ongoing: 시작일(date) 도래
 * 2. ongoing → completed: 종료일(endDate) 경과
 * 3. recruiting → closed: 시작일 도래 또는 정원 도달
 * 4. completed 전환 시 자동 발급 (autoIssueCertificates !== false):
 *    - study/project: completion (수료증) — 활동 기간/역할 포함
 *    - external: participation (참석확인서) — 주관기관/일정 포함
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
    const today = kstNow.toISOString().split("T")[0];

    const snapshot = await db
      .collection("activities")
      .where("status", "in", ["upcoming", "ongoing"])
      .get();

    let updated = 0;
    let certIssued = 0;

    for (const docSnap of snapshot.docs) {
      const activity = docSnap.data();
      const startDate = activity.date;
      const endDate = activity.endDate;
      const recruitmentStatus = activity.recruitmentStatus;
      const participants = activity.participants ?? [];
      const maxParticipants = activity.maxParticipants;

      const updates: Record<string, unknown> = {};

      // 상태 전환
      if (activity.status === "upcoming" && startDate && startDate <= today) {
        updates.status = "ongoing";
      }
      if (activity.status === "ongoing" && endDate && endDate < today) {
        updates.status = "completed";
      }

      // 모집 상태 자동 전환
      if (recruitmentStatus === "recruiting") {
        if (startDate && startDate <= today) {
          updates.recruitmentStatus = "closed";
        } else if (maxParticipants && participants.length >= maxParticipants) {
          updates.recruitmentStatus = "closed";
        }
      }

      // 활동 완료 시 모집도 완료
      if (updates.status === "completed" && recruitmentStatus !== "completed") {
        updates.recruitmentStatus = "completed";
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await db.collection("activities").doc(docSnap.id).update(updates);
        updated++;

        // completed 전환 시 자동 발급 (옵트아웃: autoIssueCertificates === false)
        if (updates.status === "completed" && activity.autoIssueCertificates !== false) {
          try {
            const issued = await autoIssueActivityCertificates(db, activity, docSnap.id);
            certIssued += issued;
          } catch (e) {
            console.error("[cron/activity-status] auto-cert error:", docSnap.id, e);
          }
        }
      }
    }

    return Response.json({ ok: true, date: today, updated, certIssued });
  } catch (err) {
    console.error("[cron/activity-status]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * 학술활동 completed 전환 시 참가자(participants[]) 또는 승인된 신청자(applicants.status==approved)에게
 * 수료증/참석확인서 자동 발급.
 *
 * - 중복 방지: 동일 activityId × type 1건이라도 있으면 skip.
 * - email_logs 중복 가드: type=auto_activity_certificate, targetId=activityId
 * - 학번/이메일 fallback 매칭, certificateNo YY-NNN 시퀀스 기존 정책 재사용.
 *
 * 반환: 발급 건수
 */
async function autoIssueActivityCertificates(
  db: FirebaseFirestore.Firestore,
  activity: FirebaseFirestore.DocumentData,
  activityId: string,
): Promise<number> {
  const activityType = activity.type as "study" | "project" | "external" | undefined;
  if (!activityType) return 0;

  const certType: "completion" | "participation" =
    activityType === "external" ? "participation" : "completion";

  // 중복 발급 방지
  const existingCertSnap = await db
    .collection("certificates")
    .where("activityId", "==", activityId)
    .where("type", "==", certType)
    .limit(1)
    .get();
  if (!existingCertSnap.empty) return 0;

  // email_logs 중복 가드
  const logSnap = await db
    .collection("email_logs")
    .where("type", "==", "auto_activity_certificate")
    .where("targetId", "==", activityId)
    .limit(1)
    .get();
  if (!logSnap.empty) return 0;

  // 수령자 후보 수집 (participants[] 우선, 비어있으면 승인된 applicants 사용)
  type Recipient = { userId?: string | null; name?: string; email?: string; studentId?: string; role?: string };
  const recipients: Recipient[] = [];

  const participantIds: string[] = activity.participants ?? [];
  const participantRoles: Record<string, string> = activity.participantRoles ?? {};

  if (participantIds.length > 0) {
    for (const uid of participantIds) {
      try {
        const u = await db.collection("users").doc(uid).get();
        if (!u.exists) continue;
        const ud = u.data() ?? {};
        recipients.push({
          userId: uid,
          name: ud.name || ud.displayName,
          email: ud.email || ud.contactEmail,
          studentId: ud.studentId,
          role: participantRoles[uid],
        });
      } catch (e) {
        console.warn("[activity-cert] user fetch error:", uid, e);
      }
    }
  } else {
    // 신청 기반 — applicants 중 status === approved
    const applicants: Array<{
      userId?: string;
      name?: string;
      email?: string;
      studentId?: string;
      status?: string;
    }> = activity.applicants ?? [];
    for (const a of applicants) {
      if (a.status !== "approved" || !a.name) continue;
      recipients.push({
        userId: a.userId ?? null,
        name: a.name,
        email: a.email,
        studentId: a.studentId,
        role: a.userId ? participantRoles[a.userId] : undefined,
      });
    }
  }

  if (recipients.length === 0) return 0;

  // 활동 기간 계산
  const period = formatActivityPeriod(activity.date, activity.endDate);
  const activityTitle = (activity.title as string) ?? "";
  const organizerName = (activity.organizerName as string) ?? undefined;

  // certificateNo 시퀀스 (YY-NNN, 전 cert 공통)
  const year = new Date().getFullYear().toString().slice(-2);
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

  const nowIso = new Date().toISOString();
  let createdCount = 0;

  for (const r of recipients) {
    if (!r.name) continue;
    try {
      lastSeq += 1;
      const certificateNo = `${year}-${String(lastSeq).padStart(3, "0")}`;

      // 학번 → 이메일 fallback 매칭
      let recipientUserId: string | null = r.userId ?? null;
      if (!recipientUserId && r.studentId) {
        const u = await db.collection("users").where("studentId", "==", r.studentId).limit(1).get();
        if (!u.empty) recipientUserId = u.docs[0].id;
      }
      if (!recipientUserId && r.email) {
        const u = await db.collection("users").where("email", "==", r.email).limit(1).get();
        if (!u.empty) recipientUserId = u.docs[0].id;
      }

      await db.collection("certificates").add({
        activityId,
        activityType,
        activityTitle,
        activityPeriod: period,
        activityRole: r.role,
        organizerName: certType === "participation" ? organizerName : undefined,
        recipientName: r.name,
        recipientEmail: r.email,
        recipientStudentId: r.studentId,
        recipientUserId,
        type: certType,
        certificateNo,
        issuedAt: nowIso,
        issuedBy: "system",
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      if (recipientUserId) {
        const certLabel = certType === "participation" ? "참석확인서" : "수료증";
        await db.collection("notifications").add({
          userId: recipientUserId,
          type: "certificate",
          title: `${certLabel}이 발급되었습니다`,
          message: `"${activityTitle}" ${certLabel}이 자동 발급되었습니다.`,
          link: "/mypage",
          read: false,
          createdAt: nowIso,
        });
      }

      createdCount++;
    } catch (e) {
      console.error("[activity-cert] issue error:", r.name, e);
      lastSeq -= 1;
    }
  }

  if (createdCount > 0) {
    await db.collection("email_logs").add({
      type: "auto_activity_certificate",
      targetId: activityId,
      recipientCount: createdCount,
      sentAt: nowIso,
      sentBy: "system",
    });
  }

  return createdCount;
}

/** "2026-03-04" + "2026-06-10" → "2026.03 - 2026.06" */
function formatActivityPeriod(startDate?: string, endDate?: string): string | undefined {
  if (!startDate) return undefined;
  const s = startDate.slice(0, 7).replace("-", ".");
  if (!endDate || endDate === startDate) return s;
  const e = endDate.slice(0, 7).replace("-", ".");
  if (s === e) return s;
  return `${s} - ${e}`;
}
