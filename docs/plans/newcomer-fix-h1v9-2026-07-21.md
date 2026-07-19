# 신입 워크스루 감사 A급 5건 + B급 5건 보정 보고서 (v9-H1 fix)

> 원 감사: docs/plans/newcomer-walkthrough-h1v9-2026-07-21.md
> H5 정합: docs/plans/signup-visibility-h5v9-2026-07-21.md (승인 대기 가시화)
> 구현일: 2026-07-20
> 검증: `npx tsc --noEmit` 에러 0 · `npx eslint src --quiet` 통과(0)
> 제약 준수: build·commit 미실행, firestore.rules 미개정(후속 제안만)

---

## A급 (5건)

### A1. 신입 딥링크 `/mypage/edit` 404 — 이중 안전 처리
- **redirect(최소)**: `next.config.ts` redirects 에 `{ source: "/mypage/edit", destination: "/mypage?tab=settings", permanent: false }` 추가. `/mypage`는 `?tab=settings`에서 프로필 편집(설정 탭)을 노출하므로 정확 착지.
- **참조처 href 교체(이중 안전)**: 실제 사용처 전수 교체 → `/mypage?tab=settings`
  - `src/lib/newcomer-sequence.ts` (위젯 1단계)
  - `src/app/api/cron/newcomer-activation-sequence/route.ts` (D+1 넛지)
  - `src/app/api/cron/weekly-digest/route.ts` (주간 다이제스트 완성 링크)
  - `src/app/steppingstone/onboarding/page.tsx` (폴백 1카드)
  - `src/features/dashboard/NewMemberOnboardingCard.tsx` (2곳: 프로필·관심분야)
  - `src/lib/onboarding-checklist-seed.ts` (2곳)
  - `src/lib/onboarding-next-cta.ts` (2곳)
  - `src/app/console/onboarding-checklist/page.tsx` (href 입력 placeholder 예시)
- 결과: `src/**` 잔여 `/mypage/edit` 참조 0건.

### A2. 승인 게이트 우회 — AuthGuard 화면 게이트
- `src/features/auth/AuthGuard.tsx`: 로그인·역할 통과 후 `user.approved === false`면 children 대신 `ApprovalGate` 렌더.
- **세션 강제 로그아웃 없음(화면 게이트만)** — 과격한 변경 회피. 공개 페이지·게스트 접근은 AuthGuard 바깥이라 불변.
- 거절(`rejected`) 회원은 게이트 내에서 반려 안내(+문의 경로)로 분기(A5 정합).
- 색상은 시맨틱 토큰(`bg-warning/15`·`text-warning`) 사용(rawcolor lint 통과).
- **후속 제안(미구현)**: firestore.rules 민감 read 규칙에 approved 조건 반영은 별도 보안 검토 후. 본 커밋은 rules 미개정.

### A3. 코호트 경계 오작동 — 신입 판정 단일 유틸화
- `src/lib/newcomer-sequence.ts`: `isNewcomerCohort(cohortKey, currentSemKey, createdAt, now)` 신설.
  - (1) **가입 14일 이내면 코호트 무관 폴백** (8월 유입: 2026-2 입학이 8월 가입 시 8/31까지 2026-1 과 불일치해 전체 무동작하던 문제 제거)
  - (2) **cohortKey ∈ {현재 학기, 다음 학기}** 허용 (`shiftSemesterKey(currentSemKey, 1)`)
- `isNewcomerWindow`(위젯)는 "첫 2주" 창(0~14일) 제한을 유지하되 코호트 판정을 `isNewcomerCohort`로 위임.
- **cron 단일 소스화**: `newcomer-activation-sequence/route.ts`의 필터를 `cohortKeyOf(u) === semKey` → `isNewcomerCohort(cohortKeyOf(u), semKey, u.createdAt)`로 교체. 위젯·cron이 동일 유틸 사용.

### A4. "이메일로 안내" 약속 미이행 — 카피 정정(발송 미구현)
- `src/features/auth/LoginForm.tsx` 승인 대기 UI: "승인이 완료되면 …로 안내 드리겠습니다" → "…으로 **다시 로그인해 이용**하실 수 있습니다. 승인 여부는 로그인 시 확인됩니다."로 실동작 반영. "1~2일" → "1~2 영업일".
- 이메일 발송 로직은 외부 의존(메일 인프라)이라 미구현 — 카피만 실동작으로 정정.

### A5. 거절(rejected) 분기 부재 — LoginForm 반려 화면
- `LoginForm.tsx`: `login()` 결과가 `user.rejected === true`면 세션 정리 후 **반려 안내 화면**(반려 사실 + 문의 경로 `yonsei.edtech@gmail.com` + "다른 계정으로 로그인") 표시. 승인 대기(`!approved`)와 분기 우선순위 분리.
- AuthGuard 게이트(A2)에도 rejected 분기 동일 적용.

---

## B급 (5건 — 소규모)

### B1. 로그인 하단 카피 정책 상충
- `LoginForm.tsx:하단 안내`: "회원가입 후 관리자 승인을 받아 로그인할 수 있습니다" → "연세 이메일(@yonsei.ac.kr)로 가입하면 **대부분 즉시 이용**할 수 있으며, 일부 신청만 운영진 확인 후 승인됩니다."로 자동승인 실동작·/signup 배너와 정합.

### B2. 자동승인 직후 재로그인 강제
- `src/app/signup/page.tsx` autoApproved 완료 화면: `startHref = safeNext || "/dashboard"`로 **세션 재사용 직행**("바로 시작하기"). 재로그인 강제 제거. (세션 미확립 시 AuthGuard가 returnUrl 보존해 로그인으로 폴백 — 회귀 없음.)

### B3. 온보딩 폴백 체크 불가 → D+3 영구 미완
- `src/app/steppingstone/onboarding/page.tsx`: 발행 트랙 0일 때 노출되는 폴백에 `FallbackFirstStepCheck` 추가. 합성 트랙키(`onboarding-fallback`)의 `guide_progress` 문서에 `completedItems`를 저장/해제하는 경량 체크.
- 위젯(`guideProgressApi.listByUser`)·cron(d3 스킵, `guide_progress where userId`)이 모두 **userId 기준 completedItems≥1**로만 판정하므로 합성 트랙 문서로 D+3 충족 가능. firestore.rules 상 guide_progress create는 `userId==auth.uid`만 요구 → 트랙 존재 검증 없이 허용됨(확인 완료).

### B4. 신입 위젯 폴드 아래
- `src/app/dashboard/page.tsx`: `NewcomerProgressWidget`를 하단(주간목표 아래)에서 **TodayCard 직후 상단으로 승격**(이동, 중복 렌더 아님). 위젯 자체 null 렌더로 비신입은 미영향.

### B5. 학번 중복 확인 선택 사항
- `src/features/auth/SignupMultiStep.tsx`: `handleNext`에서 Step1 통과 시 `verifyUsernameAvailable()`로 **중복 확인 자동·필수화**. 중복이면 토스트 안내 후 진행 차단. API/네트워크 오류 시엔 흐름 유지(최종 제출에서 재검증).

---

## C급 (본 작업 범위 밖 — 감사 제안 유지)
- C1(D+7 소스 이원화), C2(자동승인 거절 사유 미구분), C3(랜딩 CTA), C4(D+14 앵커)는 미착수. A3 cron 단일화로 C1의 코호트 게이트 부분은 공용 유틸로 수렴.

---

## 수정 파일 목록
| 파일 | 항목 |
|---|---|
| `next.config.ts` | A1 redirect |
| `src/lib/newcomer-sequence.ts` | A1 href · A3 isNewcomerCohort |
| `src/app/api/cron/newcomer-activation-sequence/route.ts` | A1 link · A3 단일화 |
| `src/app/api/cron/weekly-digest/route.ts` | A1 link |
| `src/app/steppingstone/onboarding/page.tsx` | A1 href · B3 폴백 체크 |
| `src/features/dashboard/NewMemberOnboardingCard.tsx` | A1 href(2) |
| `src/lib/onboarding-checklist-seed.ts` | A1 href(2) |
| `src/lib/onboarding-next-cta.ts` | A1 href(2) |
| `src/app/console/onboarding-checklist/page.tsx` | A1 placeholder |
| `src/features/auth/AuthGuard.tsx` | A2 게이트 · A5 rejected 분기 |
| `src/features/auth/LoginForm.tsx` | A4 카피 · A5 rejected · B1 카피 |
| `src/app/signup/page.tsx` | B2 세션 재사용 |
| `src/app/dashboard/page.tsx` | B4 위젯 승격 |
| `src/features/auth/SignupMultiStep.tsx` | B5 중복확인 필수화 |

## 검증
- `npx tsc --noEmit`: 0 errors
- `npx eslint src --quiet`: 0 (rawcolor 포함 통과)
- `grep /mypage/edit src`: 0 잔여
