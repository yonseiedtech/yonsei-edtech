"use client";

/**
 * useGradActivityData — 학습 잔디/활동 대시보드용 일별 활동 데이터 훅 (사이클 123)
 *
 * LearningStreak 내부의 scoresByDay / activityByDay 빌드 로직을 재사용 가능한
 * 형태로 분리한다. LearningStreak 자체는 변경하지 않으며(LIVE 보호), 본 훅은
 * /mypage/research 의 "연구활동 전용 대시보드" 등 다른 화면이 동일 데이터를
 * 소비할 수 있게 한다.
 *
 * 반환:
 *  - scoresByDay   : Map<"YYYY-MM-DD", 합산 점수>
 *  - activityByDay : Map<"YYYY-MM-DD", Map<활동 라벨, 점수>>
 *  - isLoading     : 모든 소스 fetch 진행 중 여부
 *
 * 가중치/라벨 문자열은 LearningStreak.SCORES 와 동일하게 유지해야 한다.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  attendeesApi,
  studySessionsApi,
  dataApi,
  writingPaperHistoryApi,
  userActivityLogsApi,
  paperReadingLogsApi,
  diagnosticResultsApi,
  streakEventsApi,
} from "@/lib/bkend";
import type {
  SeminarAttendee,
  StudySession,
  Post,
  CourseReview,
  Comment,
  StudySessionReflection,
  StudyAssignmentSubmission,
  WritingPaperHistory,
  UserActivityLog,
} from "@/types";
import type { PaperReadingLog } from "@/types/paper-reading";
import type { DiagnosticResult } from "@/types/diagnostic";

/** 가중치 — LearningStreak.SCORES 와 동일 */
const SCORES = {
  attendance: 10,
  paperWriting: 6,
  courseReview: 5,
  post: 5,
  assignmentComplete: 5,
  diagnosticComplete: 5,
  paperReading: 4,
  reflection: 3,
  timer30: 3,
  comment: 1,
} as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isoToYmdLocal(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return ymdLocal(d);
}

export interface GradActivityData {
  scoresByDay: Map<string, number>;
  activityByDay: Map<string, Map<string, number>>;
  isLoading: boolean;
}

export function useGradActivityData(userId: string | undefined): GradActivityData {
  const qOpts = { enabled: !!userId, staleTime: 5 * 60_000 } as const;

  const { data: attendeesRes, isLoading: l1 } = useQuery({
    queryKey: ["grad-activity", "attendees", userId],
    queryFn: () => attendeesApi.listByUser(userId!),
    ...qOpts,
  });
  const { data: studyRes, isLoading: l2 } = useQuery({
    queryKey: ["grad-activity", "study-sessions", userId],
    queryFn: () => studySessionsApi.listByUser(userId!),
    ...qOpts,
  });
  const { data: postsRes, isLoading: l3 } = useQuery({
    queryKey: ["grad-activity", "my-posts", userId],
    queryFn: () =>
      dataApi.list<Post>("posts", { "filter[authorId]": userId!, limit: 500 }),
    ...qOpts,
  });
  const { data: courseReviewsRes, isLoading: l4 } = useQuery({
    queryKey: ["grad-activity", "my-course-reviews", userId],
    queryFn: () =>
      dataApi.list<CourseReview>("course_reviews", {
        "filter[authorId]": userId!,
        limit: 500,
      }),
    ...qOpts,
  });
  const { data: commentsRes, isLoading: l5 } = useQuery({
    queryKey: ["grad-activity", "my-comments", userId],
    queryFn: () =>
      dataApi.list<Comment>("comments", {
        "filter[authorId]": userId!,
        limit: 1000,
      }),
    ...qOpts,
  });
  const { data: reflectionsRes, isLoading: l6 } = useQuery({
    queryKey: ["grad-activity", "study-reflections", userId],
    queryFn: () =>
      dataApi.list<StudySessionReflection>("study_session_reflections", {
        "filter[userId]": userId!,
        limit: 1000,
      }),
    ...qOpts,
  });
  const { data: assignmentSubmissionsRes, isLoading: l7 } = useQuery({
    queryKey: ["grad-activity", "study-assignment-submissions", userId],
    queryFn: () =>
      dataApi.list<StudyAssignmentSubmission>("study_assignment_submissions", {
        "filter[userId]": userId!,
        limit: 1000,
      }),
    ...qOpts,
  });
  const { data: writingHistoryRes, isLoading: l8 } = useQuery({
    queryKey: ["grad-activity", "writing-paper-history", userId],
    queryFn: () => writingPaperHistoryApi.listByUser(userId!),
    ...qOpts,
  });
  const { data: activityLogsRes, isLoading: l9 } = useQuery({
    queryKey: ["grad-activity", "activity-logs", userId],
    queryFn: () => userActivityLogsApi.listByUser(userId!, 1000),
    ...qOpts,
  });
  const { data: paperReadingRes, isLoading: l10 } = useQuery({
    queryKey: ["grad-activity", "paper-reading-logs", userId],
    queryFn: () => paperReadingLogsApi.listByUser(userId!),
    ...qOpts,
  });
  const { data: diagnosticRes, isLoading: l11 } = useQuery({
    queryKey: ["grad-activity", "diagnostic-results", userId],
    queryFn: () => diagnosticResultsApi.listByUser(userId!),
    ...qOpts,
  });

  // RT-2(2026-07-04): streak_events — 잔디에는 보이는데 월간 매트릭스엔 빠져 있던 자기모순 해소
  const { data: streakEventsRes, isLoading: l12 } = useQuery({
    queryKey: ["grad-activity", "streak-events", userId],
    queryFn: () => streakEventsApi.listByUser(userId!),
    ...qOpts,
  });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10 || l11 || l12;

  const { scoresByDay, activityByDay } = useMemo(() => {
    const scores = new Map<string, number>();
    const activities = new Map<string, Map<string, number>>();
    function add(ymd: string | null, score: number, label: string) {
      if (!ymd) return;
      scores.set(ymd, (scores.get(ymd) ?? 0) + score);
      const day = activities.get(ymd) ?? new Map<string, number>();
      day.set(label, (day.get(label) ?? 0) + score);
      activities.set(ymd, day);
    }

    // streak_events 일괄 수집 (LearningStreak 의 EV 라벨과 동일 축약)
    {
      const EV_LABELS: Record<string, string> = {
        "flashcard-study": "암기카드 학습",
        "networking-attend": "모임·행사 참석",
        "onboarding-checklist": "온보딩 체크리스트",
        "onboarding-badge": "온보딩 배지",
        "collab-research-join": "공동 연구 참여",
        "collab-chapter-edit": "공동 집필",
        "collab-meeting": "연구 회의",
        "collab-milestone": "마일스톤 달성",
        "research-journal-publish": "연구지 출판",
        "matrix-edit": "문헌 매트릭스 정리",
        "model-edit": "연구 모형 작성",
        "studio-edit": "스튜디오 제작",
        "vacation-goal-week": "방학 주간 목표 달성",
      };
      for (const ev of (streakEventsRes?.data ?? []) as { type: string; ymd?: string; points?: number }[]) {
        if (ev.type === "mirror") continue; // 리더보드용 이중 기록 — 도메인 원본과 중복 방지
        if (!ev.ymd || !ev.points) continue;
        add(ev.ymd, ev.points, EV_LABELS[ev.type] ?? "학회 활동");
      }
    }

    for (const a of (attendeesRes?.data ?? []) as SeminarAttendee[]) {
      if (!a.checkedIn) continue;
      const ymd = isoToYmdLocal(a.checkedInAt) ?? isoToYmdLocal(a.createdAt);
      if (!ymd) continue;
      add(ymd, SCORES.attendance, "세미나 출석");
    }
    for (const s of (studyRes?.data ?? []) as StudySession[]) {
      if (!s.endTime) continue;
      if ((s.durationMinutes ?? 0) < 30) continue;
      const ymd = isoToYmdLocal(s.endTime) ?? isoToYmdLocal(s.startTime);
      if (!ymd) continue;
      add(ymd, SCORES.timer30, "학습 타이머");
    }
    for (const p of (postsRes?.data ?? []) as Post[]) {
      add(isoToYmdLocal(p.createdAt), SCORES.post, "게시글 작성");
    }
    for (const r of (courseReviewsRes?.data ?? []) as CourseReview[]) {
      add(isoToYmdLocal(r.createdAt), SCORES.courseReview, "강의 후기");
    }
    for (const c of (commentsRes?.data ?? []) as Comment[]) {
      add(isoToYmdLocal(c.createdAt), SCORES.comment, "댓글");
    }
    for (const r of (reflectionsRes?.data ?? []) as StudySessionReflection[]) {
      add(isoToYmdLocal(r.createdAt), SCORES.reflection, "회고 작성");
    }
    for (const s of (assignmentSubmissionsRes?.data ?? []) as StudyAssignmentSubmission[]) {
      if (s.status !== "completed") continue;
      add(
        isoToYmdLocal(s.submittedAt) ?? isoToYmdLocal(s.updatedAt),
        SCORES.assignmentComplete,
        "과제 완료",
      );
    }
    const writingDays = new Set<string>();
    for (const h of (writingHistoryRes?.data ?? []) as WritingPaperHistory[]) {
      const ymd = isoToYmdLocal(h.createdAt);
      if (ymd) writingDays.add(ymd);
    }
    writingDays.forEach((ymd) => add(ymd, SCORES.paperWriting, "논문 작성"));

    const readingDays = new Set<string>();
    for (const l of (activityLogsRes?.data ?? []) as UserActivityLog[]) {
      if (l.pathGroup !== "archive" && l.pathGroup !== "research") continue;
      const ymd = isoToYmdLocal(l.createdAt);
      if (ymd) readingDays.add(ymd);
    }
    readingDays.forEach((ymd) => add(ymd, SCORES.paperReading, "논문·아카이브 열람"));

    const paperReadDays = new Set<string>();
    for (const r of (paperReadingRes?.data ?? []) as PaperReadingLog[]) {
      if (r.readAt) paperReadDays.add(r.readAt);
    }
    paperReadDays.forEach((ymd) => add(ymd, SCORES.paperReading, "논문 읽기 기록"));

    const diagnosticDays = new Set<string>();
    for (const r of (diagnosticRes?.data ?? []) as DiagnosticResult[]) {
      const ymd = isoToYmdLocal(r.createdAt);
      if (ymd) diagnosticDays.add(ymd);
    }
    diagnosticDays.forEach((ymd) => add(ymd, SCORES.diagnosticComplete, "진단평가"));

    return { scoresByDay: scores, activityByDay: activities };
  }, [
    attendeesRes,
    streakEventsRes,
    studyRes,
    postsRes,
    courseReviewsRes,
    commentsRes,
    reflectionsRes,
    assignmentSubmissionsRes,
    writingHistoryRes,
    activityLogsRes,
    paperReadingRes,
    diagnosticRes,
  ]);

  return { scoresByDay, activityByDay, isLoading };
}
