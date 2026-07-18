import { Timestamp } from "firebase-admin/firestore";
import { currentWeekKey } from "@/lib/weekly-goal";

/**
 * 기능 채택률 집계 (v6-H1) — GET /api/console/adoption 과 주간 스냅샷 cron 공유 소스.
 *
 * 원칙:
 *  - count() 집계 위주 저비용. 개인 식별 목록은 만들지 않는다(카운트만).
 *  - v5+ 신규 루프(진단·암기카드·주간목표·멘토링·검수 큐)를 포함해 "새 루프가
 *    쓰이는가"를 숫자로 증명한다.
 *  - 실패한 세부 집계는 -1 센티널로 격리해 전체를 막지 않는다(UI 는 "—" 표시).
 */

export interface AdoptionMetrics {
  at: string;
  members: { approved: number; active7d: number; active30d: number };
  research: {
    papersUpdated30d: number;
    reportsUpdated30d: number;
    modelsTotal: number;
    matrixFilled: number;
    readingLogs30d: number;
    sessions30d: number;
  };
  community: {
    posts30d: number;
    comments30d: number;
    dmTotal: number;
    rsvpTotal: number;
    checkins: number;
  };
  notifications: { total: number; unread: number; readRate: number | null };
  studioDocs: number;
  eventsByType: Record<string, number>;
  // v6-H1 신규 루프 블록
  diagnostics: { completed30d: number; total: number };
  flashcards: { active: number; total: number };
  weeklyGoals: { setThisWeek: number };
  mentoring: { questions: number; answers: number; resolved: number };
  reviewQueue: { processed: number; pending: number };
}

/**
 * 주간 적재 스냅샷 문서 (adoption_snapshots/{weekKey}) — v6-H1.
 * weekKey(월요일 YYYY-MM-DD)로 멱등 저장. 콘솔 추세는 이 컬렉션만 읽는다.
 */
export interface AdoptionSnapshot extends AdoptionMetrics {
  weekKey: string;
  capturedAt: string;
}

/**
 * 채택률 지표 전량 산출. 서버(Admin SDK) 전용 — Firestore 규칙 우회.
 */
export async function computeAdoption(
  db: FirebaseFirestore.Firestore,
): Promise<AdoptionMetrics> {
  const iso = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  const cnt = async (q: FirebaseFirestore.Query): Promise<number> => {
    try {
      return (await q.count().get()).data().count;
    } catch {
      return -1;
    }
  };
  const col = (n: string) => db.collection(n);
  // dataApi.create 는 createdAt 을 Timestamp 로, 서버 경로는 ISO 문자열로 기록 —
  // 타입 브래키팅 때문에 한쪽 비교만 하면 상시 0. 두 타입을 각각 세어 합산한다.
  const tsCut = (d: number) => Timestamp.fromDate(new Date(Date.now() - d * 86400000));
  const cnt2 = async (name: string, field: string, days: number): Promise<number> => {
    const [a, b] = await Promise.all([
      cnt(col(name).where(field, ">", iso(days))),
      cnt(col(name).where(field, ">", tsCut(days))),
    ]);
    return Math.max(a, 0) + Math.max(b, 0);
  };

  const [
    approved,
    active7d,
    active30d,
    papersUpdated30d,
    reportsUpdated30d,
    modelsTotal,
    matrixFilled,
    readingLogs30d,
    sessions30d,
    posts30d,
    comments30d,
    notifTotal,
    notifUnread,
    studioDocs,
    dmTotal,
    rsvpTotal,
    checkins,
    // v6-H1 신규 루프
    diagnosticsCompleted30d,
    diagnosticsTotal,
    flashcardsActive,
    flashcardsTotal,
    weeklyGoalsSet,
    reviewApproved,
    reviewHeld,
    reviewDraft,
  ] = await Promise.all([
    cnt(col("users").where("approved", "==", true)),
    cnt(col("users").where("lastVisitAt", ">", iso(7))),
    cnt(col("users").where("lastVisitAt", ">", iso(30))),
    cnt(col("writing_papers").where("lastSavedAt", ">", iso(30))),
    cnt(col("research_reports").where("lastSavedAt", ">", iso(30))),
    cnt(col("research_models")),
    cnt(col("research_papers").where("methodology", ">", "")),
    cnt2("paper_reading_logs", "createdAt", 30),
    cnt2("study_sessions", "createdAt", 30),
    cnt2("posts", "createdAt", 30),
    cnt2("comments", "createdAt", 30),
    cnt(col("notifications")),
    cnt(col("notifications").where("read", "==", false)),
    cnt(col("design_documents")),
    cnt(col("direct_messages")),
    cnt(col("networking_rsvps")),
    cnt(col("seminar_attendees").where("checkedIn", "==", true)),
    // 진단 응시(diagnostic_results): 최근 30일 완료 수 + 누적
    cnt2("diagnostic_results", "createdAt", 30),
    cnt(col("diagnostic_results")),
    // 암기카드 활성(복습 1회+) + 누적 카드
    cnt(col("flashcards").where("reviewCount", ">", 0)),
    cnt(col("flashcards")),
    // 이번 주 설정된 주간 목표 수
    cnt(col("weekly_goals").where("weekKey", "==", currentWeekKey())),
    // 검수 큐(archive_concepts.reviewStatus): 처리(승인+보류) / 대기(초안)
    cnt(col("archive_concepts").where("reviewStatus", "==", "approved")),
    cnt(col("archive_concepts").where("reviewStatus", "==", "held")),
    cnt(col("archive_concepts").where("reviewStatus", "==", "draft")),
  ]);

  // streak_events 타입 분포 (신규 기능 사용 신호 — matrix/model/studio/mirror)
  const eventsByType: Record<string, number> = {};
  try {
    const evSnap = await col("streak_events").limit(5000).get();
    for (const d of evSnap.docs) {
      const t = (d.data() as { type?: string }).type ?? "?";
      eventsByType[t] = (eventsByType[t] ?? 0) + 1;
    }
  } catch {
    /* 이벤트 분포 실패는 전체를 막지 않음 */
  }

  // 멘토링(comm_boards contextType="mentoring") — 질문/답변/채택 카운트.
  // 보드는 소수(대개 1) → 보드별 순회. 채택(resolved) 은 복합 색인 회피 위해 메모리 집계.
  let mQuestions = 0;
  let mAnswers = 0;
  let mResolved = 0;
  try {
    const boards = await col("comm_boards").where("contextType", "==", "mentoring").get();
    for (const b of boards.docs) {
      const qs = await col("comm_questions").where("boardId", "==", b.id).get();
      mQuestions += qs.size;
      mResolved += qs.docs.filter((d) => (d.data() as { resolved?: boolean }).resolved === true).length;
      mAnswers += Math.max(await cnt(col("comm_answers").where("boardId", "==", b.id)), 0);
    }
  } catch {
    /* 멘토링 집계 실패는 전체를 막지 않음 */
  }

  const reviewProcessed = Math.max(reviewApproved, 0) + Math.max(reviewHeld, 0);

  return {
    at: new Date().toISOString(),
    members: { approved, active7d, active30d },
    research: {
      papersUpdated30d,
      reportsUpdated30d,
      modelsTotal,
      matrixFilled,
      readingLogs30d,
      sessions30d,
    },
    community: { posts30d, comments30d, dmTotal, rsvpTotal, checkins },
    notifications: {
      total: notifTotal,
      unread: notifUnread,
      readRate:
        notifTotal > 0 && notifUnread >= 0
          ? Math.round(((notifTotal - notifUnread) / notifTotal) * 100)
          : null,
    },
    studioDocs,
    eventsByType,
    diagnostics: { completed30d: diagnosticsCompleted30d, total: diagnosticsTotal },
    flashcards: { active: flashcardsActive, total: flashcardsTotal },
    weeklyGoals: { setThisWeek: weeklyGoalsSet },
    mentoring: { questions: mQuestions, answers: mAnswers, resolved: mResolved },
    reviewQueue: { processed: reviewProcessed, pending: reviewDraft },
  };
}
