# H5(v11) 커뮤니티 동선 S급 핫픽스 처리 결과 (2026-07-21)

> 기반: community-flow-audit-h5v11-2026-07-21.md F1~F8 (S급 8건)
> 검증: `npx tsc --noEmit` 에러 0 · `npx eslint ... --quiet` 경고 0
> 수정 금지 목표 준수: Header.tsx·BottomNav·console/layout·hackathon·activities·admin/settings 무변경

| # | 처리 | 수정 파일 |
|---|---|---|
| F1 | 멘토링 답변자·질문자 이름 → `/profile/[authorId]` Link (익명·게스트 제외 조건 유지) | `src/features/comm-board/AnswerThread.tsx`, `src/features/comm-board/QuestionItem.tsx` |
| F2 | 커맨드팔레트 `r:mentoring` 1항목 추가 (그룹: 커뮤니티, visibility: auth) | `src/components/layout/command-routes.ts` |
| F3 | 연락망 테이블 이름 셀 → `/profile/[m.id]` Link | `src/app/directory/page.tsx` |
| F4 | 받은 응원 이력: `fromUserId` → 프로필 Link + `context` 필드 기반 라벨 분기(멘토링 감사/스터디 동료/해커톤 팀원/학습 활동) | `src/features/kudos/ReceivedKudosHistory.tsx` |
| F5 | 대시보드 응원 위젯 하단 "받은 응원 전체 보기 →" `/mypage/activities` 링크 추가 | `src/features/dashboard/KudosWidget.tsx` |
| F6 | CollaboratorRecommendations 푸터 → `/collab/new` 링크 · SimilarResearchersSection 푸터 → `/network` 링크 (상호 크로스링크) | `src/features/network/CollaboratorRecommendations.tsx`, `src/app/collab/_components/SimilarResearchersSection.tsx` |
| F7 | 코호트 동기 명단 하단 "관계망 Map에서 우리 기수 연결 보기 →" `/network` 링크 추가 (peers > 0 조건) | `src/features/onboarding/CohortSection.tsx` |
| F8 | 사람 찾기 3표면 상호 크로스링크: members 상단 관계망 Map·연락망 칩 · network 상단 구성원·연락망 칩 · directory 상단 구성원·관계망 Map 칩(공개 변형만) | `src/app/members/page.tsx`, `src/app/network/page.tsx`, `src/app/directory/page.tsx` |

잔여 항목: F9~F12(S~M급 확인 필요), G1~G4(M급·외부의존) — 감사 보고서 유지.
