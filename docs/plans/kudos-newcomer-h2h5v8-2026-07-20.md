# v8 트랙 B 구현 보고서 — H2 kudos 표면 완성 · H5 신입 첫 2주 진행 위젯 (2026-07-20)

> 원본 계획: `docs/plans/service-enhancement-plan-v8-2026-07-20.md` §2 High H2·H5
> 범위: 대시보드·마이페이지·온보딩 표면 (트랙 A cron·hackathon·academic-admin 미접촉)
> 검증: `npx tsc --noEmit` 에러 0 · `npx eslint src --quiet` 통과 · build/commit 미수행(지시대로)

---

## H2 — kudos 대시보드·마이페이지 표면 완성

### 실측 재사용 (신규 인프라 없음)
- `src/types/kudos.ts` (Kudos·KudosType) — 그대로 사용.
- `kudosApi.send`/`listSentByUser` + firestore.rules `kudos` 블록 — 그대로 사용.
- `notifyKudos`, `streakEventsApi.listSince`, `currentWeekKey`, `cohortKeyOf` — 그대로 사용.
- 응원 전송 로직·UI 는 온보딩 `CohortSection` 에만 있던 것을 **공통 훅/컴포넌트로 추출**해 중복 제거.

### 공통 추출 (중복 방지 — 계획 §H2-2 명시)
`src/features/kudos/` 신규:
- `useCohortKudos.ts` — 응원 대상 산정(이번 주 활동자 ∩ 리더보드 공개 ∩ 코호트 동기) + 전송(멱등·주 1회) 로직 훅. `me: User | null` 허용(대시보드 미로그인 프레임 안전).
- `useCohortPeers.ts` — `cohortKeyOf` 로 같은 가입 학기 승인 동기(나 제외) 산정 훅.
- `CohortKudosButtons.tsx` — 응원 버튼 목록(순수 표현). 온보딩·대시보드 공유.
- `CohortKudosSend.tsx` — "이번 주 학습 응원" 블록(헤더+안내+버튼). 대상 없으면 null.
- `useReceivedKudos.ts` — `kudosApi.listReceivedByUser` 로 받은 응원 조회(이번 주 요약·발신자 이름 denorm 재사용).
- `ReceivedKudosHistory.tsx` — 마이페이지 받은 응원 이력 소섹션.

`src/lib/bkend.ts`: `kudosApi.listReceivedByUser(toUserId)` 추가(rules: 수신자 본인·운영진 read).

### 대시보드 위젯 (계획 §H2-2)
- `src/features/dashboard/KudosWidget.tsx` — ① 이번 주 받은 응원 수 + 발신자 이름, ② 코호트 동기에게 응원 보내기(`CohortKudosSend` 로직 공유). 받은 응원·보낼 대상 **모두 없으면 null 렌더**(데이터 없으면 미노출).
- 배치: `src/app/dashboard/page.tsx` 헤더 섹션 내 `WeeklyGoalCard` 아래 `<div className="mb-6 empty:hidden">` 로 인라인 — 기존 자족형 위젯(InactivityCoachingCard·WeeklyGoalCard·StageRecommendationPanel) 관행 준수(위젯 레이아웃 레지스트리 미변경, 최소 침습).
- 개인 학습 "수치" 비노출 원칙 유지 — 응원 "개수"와 "활동 사실"만 표시, 순위·점수 없음.

### 마이페이지 (계획 §H2-3 — 신규 탭 금지)
- `src/components/mypage/MyActivitiesView.tsx` "학술활동" 탭(=내 활동) 하단에 `ReceivedKudosHistory` 소섹션 추가. **본인(isSelf)만** 노출(rules 정합). 신규 탭 없음.

### 온보딩 리팩터 (동작 불변)
- `src/features/onboarding/CohortSection.tsx` — 중복 kudos 로직·UI(약 90줄) 제거하고 `<CohortKudosSend me peers />` 로 대체. 코호트 진행률·동기 명단·버디 추천은 그대로.

---

## H5 — 신입 첫 접점·첫 2주 진행 위젯

### 첫 접점 흐름 실측
- 가입 승인 직후 첫 로그인 표면은 이미 존재: `NewMemberOnboardingCard`(대시보드 최상단 환영+첫 3할 일), `NewMemberChecklistWidget`, `SemesterKickoffBanner`, M2 cron D+N 넛지.
- 계획이 지적한 갭 = **대시보드 상 개인 "첫 2주 진행 단계" 가시화 부재**. 이 갭만 보정(신규 표면 남발 금지).

### 공통 판정 유틸 (계획 §H5 — cron 판정 재사용, cron 파일 미변경)
- `src/lib/newcomer-sequence.ts` 신규 — M2 cron `applySkipCondition` 의 단계별 완료 판정을 순수 함수로 재현:
  - `isProfileComplete(user)` = D+1 스킵 조건(bio && 관심 키워드 ≥ 1)과 동일.
  - `judgeNewcomerSteps(flags)` — profile(D+1)/onboarding(D+3)/diagnostic(D+7)/archive(D+10) 4단계 완료 배열.
  - `isNewcomerWindow(cohortKey, semKey, createdAt)` — 현재 학기 코호트 && 가입 14일 이내.
  - `daysSinceJoinKst` — cron `diffYmd` 와 동일 KST 기준.
- **cron 파일은 읽기만 함**(지시 준수). cron 교체 제안은 아래 §제안.

### 위젯 (계획 §H5-1)
- `src/features/dashboard/NewcomerProgressWidget.tsx` — 4단계 체크리스트 + 진행 바 + 다음 단계 딥링크 + D+14 회고 안내.
  - 데이터: profile(user 객체·fetch 0), onboarding(`guideProgressApi.listByUser` — 신규, 본인 문서만), diagnostic(`useUserDiagnostics` 공통 훅 재사용 — read 공유), archive(`archiveFavoritesApi.listByUser`). 모든 쿼리 `enabled: windowOpen` 로 비신입은 fetch 0.
  - **미노출: 신입 창(14일) 밖·코호트 미상·4단계 전부 완료 시 null 렌더**(계획 §H5 "14일 경과·전 단계 완료 시 미노출").
- 배치: 대시보드 헤더 섹션 `WeeklyGoalCard` 아래(응원 위젯 위) `empty:hidden` 인라인.
- `guideProgressApi.listByUser(userId)` 추가(firestore.rules guide_progress: 본인 read 허용 확인).

### quiet-hours (계획 §H5-3 · 소비 미완 ⑤)
- M2 cron 의 quiet-hours 가드는 **cron 파일 수정 금지 범위**(트랙 A). 본 트랙 미수행 — 아래 §제안에 명시.

---

## cron 측 후속 제안 (본 작업 범위 밖 — 트랙 A/보고 전용)

1. **판정 단일화**: `api/cron/newcomer-activation-sequence/route.ts` `applySkipCondition` 의 d1(프로필) 판정을 `newcomer-sequence.ts` `isProfileComplete` 로 교체하면 서버·클라 단일 소스. d3/d7/d10 도 동일 유틸로 수렴 가능(단, 서버는 admin SDK·배치 in-query 유지).
2. **quiet-hours 가드(⑤)**: 회원별 조용시간 설정을 M2 cron 발송 직전 필터에 반영(현재 고정 09:00 발송이라 시간대는 무난하나 개인 설정 미반영).

---

## 신규/수정 파일

### 신규
- `src/features/kudos/useCohortKudos.ts`
- `src/features/kudos/useCohortPeers.ts`
- `src/features/kudos/CohortKudosButtons.tsx`
- `src/features/kudos/CohortKudosSend.tsx`
- `src/features/kudos/useReceivedKudos.ts`
- `src/features/kudos/ReceivedKudosHistory.tsx`
- `src/features/dashboard/KudosWidget.tsx`
- `src/features/dashboard/NewcomerProgressWidget.tsx`
- `src/lib/newcomer-sequence.ts`

### 수정
- `src/lib/bkend.ts` — `kudosApi.listReceivedByUser`, `guideProgressApi.listByUser` 추가.
- `src/features/onboarding/CohortSection.tsx` — kudos 로직·UI → 공통 컴포넌트로 교체(동작 불변).
- `src/app/dashboard/page.tsx` — `NewcomerProgressWidget`·`KudosWidget` 인라인 추가.
- `src/components/mypage/MyActivitiesView.tsx` — 학술활동 탭에 `ReceivedKudosHistory`(본인만).

## 검증
- `npx tsc --noEmit` → 에러 0.
- `npx eslint src --quiet` → 경고/에러 0.
- build·commit 미수행(지시).
- 런타임 QA(브라우저 렌더)는 배포 후 게이트에서 수행 필요 — 특히 신입 계정 창에서 위젯 노출/미노출 경계, 응원 전송 후 낙관적 반영.
