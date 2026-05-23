import type { ChecklistCompletionType } from "@/types";

export interface NextCta {
  message: string;
  href: string;
  label: string;
}

export const NEXT_CTA_MAP: Record<ChecklistCompletionType, NextCta | null> = {
  "profile.bio": {
    message: "다음은 관심 분야를 선택해보세요.",
    href: "/mypage/edit",
    label: "관심 분야 설정",
  },
  "profile.researchInterests": {
    message: "다음은 학술활동을 둘러보세요.",
    href: "/activities",
    label: "활동 둘러보기",
  },
  "profile.image": {
    message: "다음은 자기소개를 작성해보세요.",
    href: "/mypage/edit",
    label: "자기소개 작성",
  },
  "visited.activities": {
    message: "다음은 세미나에 출석해보세요.",
    href: "/seminars",
    label: "세미나 보기",
  },
  "visited.archive": {
    message: "다음은 즐겨찾기 항목을 추가해보세요.",
    href: "/archive",
    label: "아카이브 탐색",
  },
  "visited.research": {
    message: "다음은 연구 보고서를 작성해보세요.",
    href: "/mypage/research",
    label: "연구활동 보기",
  },
  "attended.seminar": {
    message: "다음은 후기를 작성해보세요.",
    href: "/seminars",
    label: "세미나 후기 작성",
  },
  "favorited.archive": {
    message: "다음은 학술활동에 참여해보세요.",
    href: "/activities",
    label: "활동 참여",
  },
  "participated.activity": {
    message: "다음은 연구 보고서를 작성해보세요.",
    href: "/mypage/research",
    label: "연구활동 보기",
  },
  "submitted.research": {
    message: "다음은 강의 후기를 작성해보세요.",
    href: "/courses",
    label: "수강 강의 보기",
  },
  "wrote.lectureReview": {
    message: "다음은 동료 활동을 살펴보세요.",
    href: "/dashboard",
    label: "대시보드 보기",
  },
};
