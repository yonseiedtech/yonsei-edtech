// 졸업생 멘토링 Q&A 분야 태그 — 멘토 프로필의 mentorTopics(자유 태그)와 동일 어휘 계열.
// comm_boards.presenters 슬롯을 이 어휘로 채워, 기존 발표자 그룹핑 메커니즘을
// "분야 태그"로 재사용한다(스키마 변경 없음). 질문의 presenter 필드에 선택 분야가 담긴다.

/** 멘토링 보드 컨텍스트 식별자 (단일 전역 보드) */
export const MENTORING_CONTEXT_ID = "alumni-mentoring";

/** 멘토링 질문 분야 태그 — 교육공학 대학원 여정 기준 표준 어휘 */
export const MENTORING_TOPICS: readonly string[] = [
  "논문·연구방법",
  "논문작성·투고",
  "데이터분석·통계",
  "진로·취업",
  "유학·박사진학",
  "학업·수강",
  "현업·실무",
  "대학원 생활",
];

/** 자유 태그(mentorTopics)를 표준 태그와 매칭 — 부분 문자열 교집합 기반 best-effort */
export function matchesMentorTopics(
  questionTopic: string | undefined,
  mentorTopics: readonly string[],
): boolean {
  if (!questionTopic || mentorTopics.length === 0) return false;
  return mentorTopics.some(
    (t) => t.includes(questionTopic) || questionTopic.includes(t),
  );
}
