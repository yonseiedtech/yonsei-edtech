import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 강의 후기 todo 자동 생성 Cron (매일 13:00 UTC = 22:00 KST)
 *
 * 오늘(KST) 진행된 class_sessions 를 훑어
 *  - mode != cancelled/exam 인 수업의 수강생(userId 보유 enrollment)에게
 *  - type=lecture_review 의 course_todo 를 1건씩 생성한다.
 *
 * 중복 방지: (courseOfferingId + userId + sessionDate) 단위로 이미 존재하면 skip.
 * 마감일: 수업일 + 3일 (KST 기준).
 *
 * MyTodosWidget 의 inline "한 줄 후기" UI 와 짝을 이뤄
 * 후기 입력 시 course_reviews 적재 + todo 완료 처리 흐름으로 닫힌다.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayYmdKst(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

function addDaysYmd(ymd: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function ymdToKoreanShort(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  return `${Number(m[2])}월 ${Number(m[3])}일`;
}

const SKIP_MODES = new Set(["cancelled", "exam"]);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const today = todayYmdKst();
    const dueDate = addDaysYmd(today, 3);

    // 1) 오늘 진행된 class_sessions
    const sessionsSnap = await db
      .collection("class_sessions")
      .where("date", "==", today)
      .get();

    let createdTodos = 0;
    let skippedExisting = 0;
    let skippedMode = 0;
    const processed: { courseOfferingId: string; userCount: number }[] = [];

    for (const sessionDoc of sessionsSnap.docs) {
      const session = sessionDoc.data() as {
        courseOfferingId?: string;
        mode?: string;
      };
      const courseOfferingId = session.courseOfferingId;
      if (!courseOfferingId) continue;
      if (session.mode && SKIP_MODES.has(session.mode)) {
        skippedMode++;
        continue;
      }

      // 2) 강의 정보 (denorm 용)
      const offeringDoc = await db
        .collection("course_offerings")
        .doc(courseOfferingId)
        .get();
      if (!offeringDoc.exists) continue;
      const offering = offeringDoc.data() as { courseName?: string };
      const courseName = offering?.courseName ?? "수업";

      // 3) 수강생 (userId 보유분만 — 회원만 todo 생성)
      const enrollmentsSnap = await db
        .collection("course_enrollments")
        .where("courseOfferingId", "==", courseOfferingId)
        .get();
      const userIds = enrollmentsSnap.docs
        .map((d) => (d.data() as { userId?: string }).userId)
        .filter((x): x is string => !!x);
      if (userIds.length === 0) continue;

      let perCourseCreated = 0;
      for (const userId of userIds) {
        // 4) 중복 가드: 같은 회원·강의·세션날짜 lecture_review 가 이미 있으면 skip
        const dupSnap = await db
          .collection("course_todos")
          .where("courseOfferingId", "==", courseOfferingId)
          .where("userId", "==", userId)
          .where("sessionDate", "==", today)
          .where("type", "==", "lecture_review")
          .limit(1)
          .get();
        if (!dupSnap.empty) {
          skippedExisting++;
          continue;
        }

        const nowIso = new Date().toISOString();
        await db.collection("course_todos").add({
          courseOfferingId,
          userId,
          type: "lecture_review",
          content: `${courseName} ${ymdToKoreanShort(today)} 수업 한 줄 후기`,
          dueDate,
          sessionDate: today,
          completed: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        createdTodos++;
        perCourseCreated++;
      }
      processed.push({ courseOfferingId, userCount: perCourseCreated });
    }

    return Response.json({
      ok: true,
      today,
      dueDate,
      createdTodos,
      skippedExisting,
      skippedMode,
      processedCount: processed.length,
      processed,
    });
  } catch (err) {
    console.error("[cron/lecture-review-todos]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
