/**
 * onboarding-evaluator — 회원×ChecklistCompletionType 평가 헬퍼.
 *
 * NewMemberChecklistWidget 의 evalCompletion 로직과 동일한 규칙을
 * 운영진 통계용으로 재사용. localStorage 기반 visited.* 항목은
 * 운영진이 알 수 없으므로 항상 false 처리한다.
 *
 * 사용 흐름:
 *  1) profilesApi.list / 각 *.list 1회씩 전체 fetch → 클라이언트 groupByUserId
 *  2) 회원 × 항목 매트릭스를 evalCompletionForUser 로 계산
 */

import type {
  ActivityParticipation,
  ArchiveFavorite,
  ChecklistCompletionType,
  CourseReview,
  ResearchReport,
  SeminarAttendee,
  User,
} from "@/types";

export interface OnboardingEvalContext {
  attendeesByUser: Map<string, SeminarAttendee[]>;
  favoritesByUser: Map<string, ArchiveFavorite[]>;
  participationsByUser: Map<string, ActivityParticipation[]>;
  reportsByUser: Map<string, ResearchReport[]>;
  reviewsByUser: Map<string, CourseReview[]>;
}

/**
 * 회원 + completionType 1건 평가.
 * - localStorage 기반 visited.* 은 운영진이 직접 알 수 없으므로 false 반환.
 * - 그 외 데이터 기반 항목은 NewMemberChecklistWidget 과 동일한 규칙 적용.
 */
export function evalCompletionForUser(
  user: User,
  type: ChecklistCompletionType,
  ctx: OnboardingEvalContext,
): boolean {
  switch (type) {
    case "profile.bio":
      return Boolean(user.bio && user.bio.trim().length > 0);
    case "profile.researchInterests": {
      const interests = Array.isArray(user.researchInterests)
        ? user.researchInterests
        : [];
      const kw = Array.isArray(user.interestKeywords) ? user.interestKeywords : [];
      return interests.length + kw.length >= 1;
    }
    case "profile.image": {
      const photo = (user as { photoURL?: string | null }).photoURL;
      return Boolean(photo && photo.trim().length > 0);
    }
    case "visited.activities":
    case "visited.archive":
    case "visited.research":
      return false; // localStorage — 운영진 모름
    case "attended.seminar":
      return (ctx.attendeesByUser.get(user.id) ?? []).some((a) => a.checkedIn);
    case "favorited.archive":
      return (ctx.favoritesByUser.get(user.id) ?? []).length > 0;
    case "participated.activity":
      return (ctx.participationsByUser.get(user.id) ?? []).length > 0;
    case "submitted.research":
      return (ctx.reportsByUser.get(user.id) ?? []).length > 0;
    case "wrote.lectureReview":
      return (ctx.reviewsByUser.get(user.id) ?? []).length > 0;
    case "set.thesisJourneyStage":
      // 논문 여정 단계를 직접 설정했는지 — 프로필 필드만으로 판정
      return typeof user.thesisJourneyStage === "number";
    case "participated.commBoard":
      return false; // 회원×보드 전수 조회 비용 — 콘솔 매트릭스에서는 미집계 (visited.* 패턴)
    default:
      return false;
  }
}

/** userId 키로 그룹핑 — 전체 fetch 후 1회 그룹화. */
export function groupByUserId<T extends { userId?: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    if (!it.userId) continue;
    let bucket = map.get(it.userId);
    if (!bucket) {
      bucket = [];
      map.set(it.userId, bucket);
    }
    bucket.push(it);
  }
  return map;
}

/** 임의 키 추출 함수로 그룹핑 — CourseReview(authorId) 처럼 userId 가 아닌 컬렉션용. */
export function groupBy<T>(items: T[], keyFn: (item: T) => string | undefined): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const key = keyFn(it);
    if (!key) continue;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = [];
      map.set(key, bucket);
    }
    bucket.push(it);
  }
  return map;
}
