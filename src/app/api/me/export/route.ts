import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";

/**
 * GET /api/me/export — GDPR-style 본인 데이터 전체 다운로드.
 *
 * - 인증: Bearer idToken (Firebase)
 * - 응답: JSON (Content-Disposition: attachment)
 * - Cache-Control: no-store (개인정보)
 * - 알림 최대 500건 제한
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const uid = authResult.uid;

  try {
    const db = getAdminDb();

    // ── 병렬 수집 ──────────────────────────────────────────────────────────

    const [
      userDoc,
      postsSnap,
      commentsSnap,
      interviewResponsesSnap,
      researchPapersSnap,
      researchReportsSnap,
      researchProposalsSnap,
      courseEnrollmentsSnap,
      certificatesSnap,
      notificationsSnap,
      userFeedbackSnap,
      streakEventsSnap,
      activityParticipationsSnap,
      seminarAttendeesSnap,
    ] = await Promise.all([
      // 프로필
      db.collection("users").doc(uid).get(),
      // 게시글 (authorId)
      db.collection("posts").where("authorId", "==", uid).get(),
      // 댓글 (authorId)
      db.collection("comments").where("authorId", "==", uid).get(),
      // 인터뷰 응답 (userId)
      db.collection("interview_responses").where("userId", "==", uid).get(),
      // 연구 논문 (userId)
      db.collection("research_papers").where("userId", "==", uid).get(),
      // 연구 보고서 (userId)
      db.collection("research_reports").where("userId", "==", uid).get(),
      // 연구 계획서 (userId)
      db.collection("research_proposals").where("userId", "==", uid).get(),
      // 수강 내역 (userId)
      db.collection("course_enrollments").where("userId", "==", uid).get(),
      // 수료증 (recipientUserId)
      db.collection("certificates").where("recipientUserId", "==", uid).get(),
      // 알림 (userId) — 최대 500건
      db
        .collection("notifications")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(500)
        .get(),
      // 피드백 (userId)
      db.collection("user_feedback").where("userId", "==", uid).get(),
      // 학습 streak 이벤트 (userId)
      db.collection("streak_events").where("userId", "==", uid).get(),
      // 활동 참여 (userId)
      db.collection("activity_participations").where("userId", "==", uid).get(),
      // 세미나 참석 (userId)
      db.collection("seminar_attendees").where("userId", "==", uid).get(),
    ]);

    // ── activity_applicants 에서 본인 신청 내역 수집 (분리 컬렉션) ─────────
    const applicantsSnap = await db.collection("activity_applicants").get();
    const myApplications: Record<string, unknown>[] = [];
    for (const docSnap of applicantsSnap.docs) {
      const applicants = (
        docSnap.data()?.applicants as Array<{ userId?: string } & Record<string, unknown>>
      ) ?? [];
      const mine = applicants.find((a) => a.userId === uid);
      if (mine) {
        myApplications.push({ activityId: docSnap.id, ...mine });
      }
    }

    // ── 프로필 데이터 (민감 필드 제외) ──────────────────────────────────────
    const rawProfile = userDoc.data() ?? {};
    const profileSafe = Object.fromEntries(
      Object.entries(rawProfile as Record<string, unknown>).filter(
        ([k]) => k !== "fcmTokens" && k !== "password",
      ),
    );

    // ── 응답 조합 ────────────────────────────────────────────────────────────
    const exportedAt = new Date().toISOString();

    const payload = {
      exportedAt,
      exportedBy: uid,
      notice:
        "이 파일에는 본인의 개인 데이터가 포함되어 있습니다. 외부 공유 시 개인정보 유출에 주의하세요.",
      categories: {
        profile: profileSafe,
        posts: postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        comments: commentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        interviewResponses: interviewResponsesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
        research: {
          papers: researchPapersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          reports: researchReportsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          proposals: researchProposalsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        },
        courseEnrollments: courseEnrollmentsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
        certificates: certificatesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        notifications: {
          note: "최대 500건만 포함됩니다.",
          items: notificationsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        },
        userFeedback: userFeedbackSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        streakEvents: streakEventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        activityParticipations: activityParticipationsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
        activityApplications: myApplications,
        seminarAttendees: seminarAttendeesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      },
    };

    const today = new Date().toISOString().slice(0, 10);
    const filename = `yonsei-edtech-data-${uid}-${today}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/me/export]", err);
    return NextResponse.json({ error: "데이터 export에 실패했습니다." }, { status: 500 });
  }
}
