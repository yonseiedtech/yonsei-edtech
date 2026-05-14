/**
 * 서버 측 전체 회원 로얄티 지표 산출 (Sprint 71).
 *
 * 콘솔 회원 보고서(`useMemberMetrics`)와 동일한 12개 컬렉션 산출식을 서버에서 재현.
 * `analyze_member_loyalty` AI 도구와 `loyalty-snapshot` cron 이 공용으로 사용한다.
 *
 * 클라이언트 훅(`useMemberMetrics`)은 bkend API 경유, 본 함수는 firebase-admin 직접 조회.
 */

import type { Firestore } from "firebase-admin/firestore";
import type { User } from "@/types";
import { computeMemberMetrics, type MemberMetricsRow } from "./computeMemberMetrics";

/** 승인 회원 전체의 로얄티 지표 행을 산출 (로얄티 높은 순 정렬 아님 — 호출부에서 정렬). */
export async function snapshotMemberMetrics(
  db: Firestore,
): Promise<MemberMetricsRow[]> {
  const membersSnap = await db
    .collection("users")
    .where("approved", "==", true)
    .get();
  const members = membersSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
  if (members.length === 0) return [];

  // 콘솔 회원 보고서와 동일한 11개 활동 컬렉션 병렬 조회
  const [
    attSnap, partSnap, gradSnap,
    postSnap, commentSnap, interviewSnap,
    studySnap, writingSnap, proposalSnap,
    seminarReviewSnap, courseReviewSnap,
  ] = await Promise.all([
    db.collection("seminar_attendees").where("checkedIn", "==", true).get(),
    db.collection("activity_participations").get(),
    db.collection("grad_life_positions").get(),
    db.collection("posts").get(),
    db.collection("comments").get(),
    db.collection("interview_responses").get(),
    db.collection("study_sessions").get(),
    db.collection("writing_papers").get(),
    db.collection("research_proposals").get(),
    db.collection("seminar_reviews").get(),
    db.collection("course_reviews").get(),
  ]);

  const inc = (map: Map<string, number>, key: unknown, by = 1) => {
    if (typeof key !== "string" || !key) return;
    map.set(key, (map.get(key) ?? 0) + by);
  };

  const attMap = new Map<string, number>();
  for (const doc of attSnap.docs) {
    const d = doc.data();
    if (d.isGuest) continue;
    inc(attMap, d.userId);
  }
  const partMap = new Map<string, number>();
  for (const doc of partSnap.docs) inc(partMap, doc.data().userId);

  const gradMap = new Map<string, number>();
  for (const doc of gradSnap.docs) {
    const d = doc.data();
    // 진행 중(endYear·endSemester 없음) 직책만
    if (!d.endYear || !d.endSemester) inc(gradMap, d.userId);
  }

  const postMap = new Map<string, number>();
  for (const doc of postSnap.docs) {
    const d = doc.data();
    if (d.deletedAt) continue; // 삭제된 글 제외
    inc(postMap, d.authorId);
  }
  const commentMap = new Map<string, number>();
  for (const doc of commentSnap.docs) inc(commentMap, doc.data().authorId);

  const interviewMap = new Map<string, number>();
  for (const doc of interviewSnap.docs) {
    const d = doc.data();
    if (d.status === "submitted") inc(interviewMap, d.respondentId);
  }

  const studyMinutesMap = new Map<string, number>();
  for (const doc of studySnap.docs) {
    const d = doc.data();
    const mins = typeof d.durationMinutes === "number" ? d.durationMinutes : 0;
    inc(studyMinutesMap, d.userId, mins);
  }

  const writingMap = new Map<string, number>();
  for (const doc of writingSnap.docs) {
    const d = doc.data();
    const chapters = (d.chapters ?? {}) as Record<string, unknown>;
    const chars = Object.values(chapters).reduce<number>(
      (sum, v) => sum + (typeof v === "string" ? v.length : 0),
      0,
    );
    inc(writingMap, d.userId, chars);
  }

  const proposalSet = new Set<string>();
  for (const doc of proposalSnap.docs) {
    const uid = doc.data().userId;
    if (typeof uid === "string" && uid) proposalSet.add(uid);
  }

  const seminarReviewMap = new Map<string, number>();
  for (const doc of seminarReviewSnap.docs) inc(seminarReviewMap, doc.data().authorId);
  const courseReviewMap = new Map<string, number>();
  for (const doc of courseReviewSnap.docs) inc(courseReviewMap, doc.data().authorId);

  const now = Date.now();
  return members.map((m) =>
    computeMemberMetrics({
      member: m as unknown as User,
      attendanceCount: attMap.get(m.id) ?? 0,
      activityCount: partMap.get(m.id) ?? 0,
      gradLifeOngoingCount: gradMap.get(m.id) ?? 0,
      postCount: postMap.get(m.id) ?? 0,
      commentCount: commentMap.get(m.id) ?? 0,
      interviewResponseCount: interviewMap.get(m.id) ?? 0,
      studyMinutes: studyMinutesMap.get(m.id) ?? 0,
      writingChars: writingMap.get(m.id) ?? 0,
      hasResearchProposal: proposalSet.has(m.id),
      seminarReviewCount: seminarReviewMap.get(m.id) ?? 0,
      courseReviewCount: courseReviewMap.get(m.id) ?? 0,
      nowMs: now,
    }),
  );
}
