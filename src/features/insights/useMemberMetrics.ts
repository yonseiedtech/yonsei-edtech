"use client";

/**
 * 회원 로얄티/활동성 지표 수집·집계 훅 (Sprint 71 — MemberReportView 에서 추출).
 *
 * 12개 컬렉션을 병렬로 조회하고 회원별 카운트 맵을 만들어 computeMemberMetrics 로
 * MemberMetricsRow[] 를 산출한다. MemberReportView 와 향후 인사이트 위젯에서 공용으로 사용.
 *
 * 데이터 소스:
 *  - seminar_attendees, activity_participations, grad_life_positions (참여·운영진)
 *  - posts, comments, interview_responses (콘텐츠)
 *  - study_sessions, writing_papers, research_proposals (연구)
 *  - seminar_reviews, course_reviews (후기)
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { profilesApi, dataApi, gradLifePositionsApi } from "@/lib/bkend";
import type {
  User, SeminarAttendee, ActivityParticipation, GradLifePosition,
  Post, Comment, InterviewResponse, StudySession, WritingPaper,
  ResearchProposal, SeminarReview, CourseReview, WritingPaperChapterKey,
} from "@/types";
import { computeMemberMetrics, type MemberMetricsRow } from "./computeMemberMetrics";

/**
 * 12개 컬렉션은 모두 무겁고(comments·study_sessions 1만건 한도) 자주 바뀌지 않으므로
 * 5분간 캐시 신선도 유지 — insights 탭 간 이동 시 중복 조회 방지.
 */
const STALE_TIME = 5 * 60_000;

/** writing_papers.chapters의 모든 챕터 글자수 합 */
function totalWritingChars(
  chapters?: Partial<Record<WritingPaperChapterKey, string>>,
): number {
  if (!chapters) return 0;
  return Object.values(chapters).reduce(
    (sum, v) => sum + (typeof v === "string" ? v.length : 0),
    0,
  );
}

/**
 * 회원 활동 모멘텀 — 최근 30일 vs 이전 30일(31~60일 전) 활동 이벤트 수 비교.
 * 스냅샷 적재 없이 활동 컬렉션의 타임스탬프만으로 산출.
 */
export interface MemberMomentum {
  /** 최근 30일 활동 이벤트 수 */
  recentCount: number;
  /** 31~60일 전 활동 이벤트 수 */
  prevCount: number;
  trend: "rising" | "falling" | "flat" | "inactive";
}

export interface UseMemberMetricsResult {
  rows: MemberMetricsRow[];
  /** userId → 활동 모멘텀 (최근 60일 내 활동 있는 회원만 포함) */
  momentumByUser: Map<string, MemberMomentum>;
  isLoading: boolean;
}

/**
 * 회원 지표 행을 산출하는 훅.
 * @param enabled false 면 모든 쿼리 비활성 (권한 없는 사용자용)
 */
export function useMemberMetrics(enabled: boolean): UseMemberMetricsResult {
  const { data: membersRes, isLoading: loadingMembers } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-members"],
    queryFn: () => profilesApi.list({ limit: 2000 }),
  });

  const { data: attendeesRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-attendees"],
    queryFn: () => dataApi.list<SeminarAttendee>("seminar_attendees", { limit: 5000 }),
  });

  const { data: participationsRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-participations"],
    queryFn: () =>
      dataApi.list<ActivityParticipation>("activity_participations", { limit: 5000 }),
  });

  const { data: gradLifeRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-gradlife"],
    queryFn: () => gradLifePositionsApi.list({ limit: 2000 }),
  });

  // ── 콘텐츠 ──
  const { data: postsRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-posts"],
    queryFn: () => dataApi.list<Post>("posts", { limit: 5000 }),
  });

  const { data: commentsRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-comments"],
    queryFn: () => dataApi.list<Comment>("comments", { limit: 10000 }),
  });

  const { data: interviewResponsesRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-interview-responses"],
    queryFn: () => dataApi.list<InterviewResponse>("interview_responses", { limit: 5000 }),
  });

  // ── 연구활동 ──
  const { data: studySessionsRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-study-sessions"],
    queryFn: () => dataApi.list<StudySession>("study_sessions", { limit: 10000 }),
  });

  const { data: writingPapersRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-writing-papers"],
    queryFn: () => dataApi.list<WritingPaper>("writing_papers", { limit: 2000 }),
  });

  const { data: researchProposalsRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-research-proposals"],
    queryFn: () => dataApi.list<ResearchProposal>("research_proposals", { limit: 2000 }),
  });

  // ── 후기 ──
  const { data: seminarReviewsRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-seminar-reviews"],
    queryFn: () => dataApi.list<SeminarReview>("seminar_reviews", { limit: 5000 }),
  });

  const { data: courseReviewsRes } = useQuery({
    enabled,
    staleTime: STALE_TIME,
    queryKey: ["report-course-reviews"],
    queryFn: () => dataApi.list<CourseReview>("course_reviews", { limit: 5000 }),
  });

  const members = (membersRes?.data ?? []) as User[];
  const attendees = (attendeesRes?.data ?? []) as SeminarAttendee[];
  const participations = (participationsRes?.data ?? []) as ActivityParticipation[];
  const gradLife = (gradLifeRes?.data ?? []) as GradLifePosition[];
  const posts = (postsRes?.data ?? []) as Post[];
  const comments = (commentsRes?.data ?? []) as Comment[];
  const interviewResponses = (interviewResponsesRes?.data ?? []) as InterviewResponse[];
  const studySessions = (studySessionsRes?.data ?? []) as StudySession[];
  const writingPapers = (writingPapersRes?.data ?? []) as WritingPaper[];
  const researchProposals = (researchProposalsRes?.data ?? []) as ResearchProposal[];
  const seminarReviews = (seminarReviewsRes?.data ?? []) as SeminarReview[];
  const courseReviews = (courseReviewsRes?.data ?? []) as CourseReview[];

  // 회원별 카운트 맵 만들기 — O(N) 한 번씩 순회
  const rows = useMemo<MemberMetricsRow[]>(() => {
    const attMap = new Map<string, number>();
    for (const a of attendees) {
      if (!a.checkedIn || a.isGuest || !a.userId) continue;
      attMap.set(a.userId, (attMap.get(a.userId) ?? 0) + 1);
    }

    const partMap = new Map<string, number>();
    for (const p of participations) {
      if (!p.userId) continue;
      partMap.set(p.userId, (partMap.get(p.userId) ?? 0) + 1);
    }

    const ongoingMap = new Map<string, number>();
    for (const g of gradLife) {
      if (g.endYear && g.endSemester) continue; // 진행중만
      ongoingMap.set(g.userId, (ongoingMap.get(g.userId) ?? 0) + 1);
    }

    const postMap = new Map<string, number>();
    for (const p of posts) {
      if (p.deletedAt) continue; // 삭제된 글 제외
      if (!p.authorId) continue;
      postMap.set(p.authorId, (postMap.get(p.authorId) ?? 0) + 1);
    }

    const commentMap = new Map<string, number>();
    for (const c of comments) {
      if (!c.authorId) continue;
      commentMap.set(c.authorId, (commentMap.get(c.authorId) ?? 0) + 1);
    }

    const interviewMap = new Map<string, number>();
    for (const r of interviewResponses) {
      if (r.status !== "submitted") continue;
      if (!r.respondentId) continue;
      interviewMap.set(r.respondentId, (interviewMap.get(r.respondentId) ?? 0) + 1);
    }

    const studyMinutesMap = new Map<string, number>();
    for (const s of studySessions) {
      if (!s.userId) continue;
      const mins = typeof s.durationMinutes === "number" ? s.durationMinutes : 0;
      studyMinutesMap.set(s.userId, (studyMinutesMap.get(s.userId) ?? 0) + mins);
    }

    const writingMap = new Map<string, number>();
    for (const w of writingPapers) {
      if (!w.userId) continue;
      writingMap.set(w.userId, (writingMap.get(w.userId) ?? 0) + totalWritingChars(w.chapters));
    }

    const proposalSet = new Set<string>();
    for (const p of researchProposals) {
      if (p.userId) proposalSet.add(p.userId);
    }

    const seminarReviewMap = new Map<string, number>();
    for (const r of seminarReviews) {
      if (!r.authorId) continue;
      seminarReviewMap.set(r.authorId, (seminarReviewMap.get(r.authorId) ?? 0) + 1);
    }

    const courseReviewMap = new Map<string, number>();
    for (const r of courseReviews) {
      if (!r.authorId) continue;
      courseReviewMap.set(r.authorId, (courseReviewMap.get(r.authorId) ?? 0) + 1);
    }

    const now = Date.now();
    return members.map((m) =>
      computeMemberMetrics({
        member: m,
        attendanceCount: attMap.get(m.id) ?? 0,
        activityCount: partMap.get(m.id) ?? 0,
        gradLifeOngoingCount: ongoingMap.get(m.id) ?? 0,
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
  }, [
    members, attendees, participations, gradLife,
    posts, comments, interviewResponses,
    studySessions, writingPapers, researchProposals,
    seminarReviews, courseReviews,
  ]);

  // 활동 모멘텀 — 최근 30일 vs 이전 30일 활동 이벤트 수 비교
  const momentumByUser = useMemo<Map<string, MemberMomentum>>(() => {
    const now = Date.now();
    const day30 = now - 30 * 86_400_000;
    const day60 = now - 60 * 86_400_000;

    const recent = new Map<string, number>();
    const prev = new Map<string, number>();

    const bucket = (userId: unknown, tsRaw: unknown) => {
      if (typeof userId !== "string" || !userId) return;
      if (typeof tsRaw !== "string" || !tsRaw) return;
      const ts = Date.parse(tsRaw);
      if (Number.isNaN(ts)) return;
      if (ts >= day30) recent.set(userId, (recent.get(userId) ?? 0) + 1);
      else if (ts >= day60) prev.set(userId, (prev.get(userId) ?? 0) + 1);
    };

    for (const a of attendees) {
      if (!a.checkedIn || a.isGuest) continue;
      bucket(a.userId, a.checkedInAt);
    }
    for (const p of participations) bucket(p.userId, p.createdAt);
    for (const p of posts) {
      if (p.deletedAt) continue;
      bucket(p.authorId, p.createdAt);
    }
    for (const c of comments) bucket(c.authorId, c.createdAt);
    for (const r of interviewResponses) {
      if (r.status !== "submitted") continue;
      bucket(r.respondentId, r.submittedAt ?? r.createdAt);
    }
    for (const s of studySessions) bucket(s.userId, s.createdAt);
    for (const r of seminarReviews) bucket(r.authorId, r.createdAt);
    for (const r of courseReviews) bucket(r.authorId, r.createdAt);

    const map = new Map<string, MemberMomentum>();
    const allIds = new Set<string>([...recent.keys(), ...prev.keys()]);
    for (const id of allIds) {
      const recentCount = recent.get(id) ?? 0;
      const prevCount = prev.get(id) ?? 0;
      let trend: MemberMomentum["trend"];
      if (recentCount === 0 && prevCount === 0) trend = "inactive";
      else if (recentCount > prevCount) trend = "rising";
      else if (recentCount < prevCount) trend = "falling";
      else trend = "flat";
      map.set(id, { recentCount, prevCount, trend });
    }
    return map;
  }, [
    attendees, participations, posts, comments,
    interviewResponses, studySessions, seminarReviews, courseReviews,
  ]);

  return { rows, momentumByUser, isLoading: loadingMembers };
}
