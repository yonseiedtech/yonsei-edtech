# 신규 계정 온보딩 End-to-End 워크스루 감사 (v9-H1)

- 일자: 2026-07-20 (계획서 v9 H1 항목 · 감사형 · **코드 무수정**)
- 방법: 실계정 생성 없이 **코드 추적 + LIVE 공개 화면 실측**(https://yonsei-edtech.vercel.app — 비로그인 GET) 조합
- 범위: 랜딩 → 가입 폼 → 약관 동의 → (수동 승인 대기 / 자동 승인) → 첫 로그인 → 대시보드/온보딩 진입 → D+1~14 넛지 시퀀스 → 첫 활동(진단·아카이브·커뮤니티)
- **주의(동시 작업)**: 감사 시점에 v9-H5(승인 대기 가시화) 구현이 **워킹트리에 미커밋 진행 중**이었다(`signup/page.tsx`·`AdminMemberTab.tsx`·`console/academic/applications/page.tsx` 수정, `api/cron/pending-signup-nudge/` 신규). 본 감사의 라인 참조는 **커밋된 HEAD = LIVE 배포본** 기준. H5 작업이 A4·B1 일부를 해소할 수 있으나 배포 전이므로 발견 사항으로 유지한다.

---

## 1. 경로 전수 표 (단계 → 구현 파일 → 상태 분기 → 안내 문구 → 이탈 위험)

| # | 단계 | 구현 파일 | 상태 분기 | 안내 문구(핵심) | 이탈 위험 |
|---|------|-----------|-----------|------------------|-----------|
| 0 | 랜딩 `/` | `src/app/page.tsx` + `components/layout/Header.tsx` | 비로그인/로그인 | 본문에 가입 직접 CTA 없음(헤더에만) | 낮음 (C3) |
| 1 | 가입 폼 `/signup` | `src/app/signup/page.tsx` → `features/auth/SignupMultiStep.tsx`(4단계) | done=null / autoApproved / 수동대기 | 배너 "yonsei.ac.kr 이메일은 즉시 승인" | 중간 — 4단계·필수 12+필드(학번10자리·비번·생년월일·입학시점·누적학기·보안질문·핸드폰) 부담 |
| 1a | 학번 중복 확인 | `signup-steps/Step1AccountInfo.tsx` `checkUsernameAvailability` | 확인은 **선택**(validateStep 미검사) | "이미 가입된 학번입니다 → 비밀번호 찾기" | B5 — 건너뛰면 말단에서야 실패 |
| 1b | 이메일 검증 | `Step1AccountInfo.tsx:236-249` | `@yonsei.ac.kr`만 허용(패턴) | "연세 메일만 가입에 사용" | — (자동승인 도메인과 정합) |
| 1c | 게스트 이력 사전 안내 | `SignupMultiStep.tsx checkGuestHistory` → `/api/auth/guest-history-preview` | 실패해도 가입 진행 | 팝업 안내 | 낮음 |
| 2 | 약관 동의 | `signup-steps/Step5Consents.tsx` + `lib/legal.ts` | 필수 3종 미동의 시 제출 비활성 | 전문 링크 `/terms` `/privacy` `/consent` — **LIVE 3종 모두 200** | 낮음 |
| 3 | 가입 실행 | `signup-steps/runSignupFlow.ts` | bkend signup→프로필 write→guestLinker→auto-approve fetch | — | **A2: 세션·토큰이 살아있는 채 종료** |
| 3a | 자동 승인 | `api/auth/auto-approve/route.ts` + `lib/auth/approval-rules.ts` | 이름≥2 + yonsei 도메인 + 학번 + 중복없음 + **가입 60분 이내** | — | 실패 사유가 사용자에게 구분 안내 안 됨 (C2) |
| 4a | 자동승인 완료 화면 | `signup/page.tsx:42-88` | `done.autoApproved` | "환영합니다… 지금 로그인하기" → `/login` | B2 — 이미 로그인 세션인데 재로그인 강제 |
| 4b | 수동 승인 대기 화면 | `signup/page.tsx:90-131` (HEAD) | `!autoApproved` | "관리자 승인 후 로그인… 1~2일 소요" | A4·A5와 연결 — 이후 상태를 알 방법 없음 |
| 5 | 승인 처리(운영진) | `features/admin/AdminMemberTab.tsx` (`profilesApi.approve` + `notifyMemberApproved`) | 승인/거절(rejected)/자동승인 토글(localStorage, 콘솔 열려 있을 때만 동작) | 인앱 알림만 생성 | **A4: 이메일 발송 없음** |
| 6 | 첫 로그인 `/login` | `features/auth/LoginForm.tsx` | `!user.approved` → 즉시 로그아웃+대기 UI / rejected 분기 **없음** | "승인 완료 시 **이메일로** 안내"(103-115) · 하단 "관리자 승인을 받아 로그인"(:207) | A4·A5·B1 |
| 7 | 대시보드 진입 | `src/app/dashboard/page.tsx` (AuthGuard) | AuthGuard=로그인만 검사, **approved 미검사** | — | A2 / B4(정보 과부하) |
| 8 | 신입 진행 위젯 | `features/dashboard/NewcomerProgressWidget.tsx` + `lib/newcomer-sequence.ts` | `cohortKeyOf===currentSemesterKey` && 가입≤14일 && 미완료 존재 → 그 외 null | 4단계(프로필→온보딩→진단→아카이브) | **A3: 코호트 경계 오작동** · **A1: 1단계 딥링크 404** |
| 9 | D+1~14 넛지 cron | `api/cron/newcomer-activation-sequence/route.ts` (매일 09:00 KST) | 동일 코호트 게이트 + push_logs dedup + 단계별 스킵 | D+1 링크 `/mypage/edit` | **A1·A3 동일 영향** |
| 10 | 온보딩 `/steppingstone/onboarding` | `src/app/steppingstone/onboarding/page.tsx` | published 트랙 없음 → `DefaultChecklistFallback`(정적 5카드) | "맞춤 가이드가 준비되는 동안…" | B3 — 폴백은 체크 불가 → D+3 판정 영구 미완 |
| 11 | 첫 활동 | `/diagnosis` `/archive` `/seminars` `/flashcards` | LIVE 전부 200 | — | 낮음 |

### LIVE GET 실측 (2026-07-20)
`/ /signup /login /consent /terms /privacy /forgot-password /steppingstone /steppingstone/onboarding /diagnosis /archive /dashboard /contact /about /card-news /journal /seminars /flashcards /help` → **전부 200**.
**예외: `/mypage/edit` → 404** (아래 A1).

---

## 2. 발견 사항 — [단계 → 문제 → 심각도 → 보정안]

### A급 (신입 여정 차단·심각 오작동) — 5건

**A1. [8·9단계] 신입 1단계 딥링크 `/mypage/edit`가 LIVE 404 (죽은 링크)**
- 근거: `src/app/mypage/` 하위에 `edit` 라우트 없음 + LIVE HEAD 요청 404 실측. `next.config.ts` redirects에도 없음. 실제 프로필 편집 표면은 `/mypage`(내부 "프로필 수정" 섹션, `ProfileSummaryCard`는 `/mypage?tab=settings` 사용).
- 참조처 **8곳**: `lib/newcomer-sequence.ts:34`(위젯 1단계 href), `api/cron/newcomer-activation-sequence/route.ts:34`(D+1 넛지 링크), `api/cron/weekly-digest`, `steppingstone/onboarding/page.tsx`(폴백 1카드), `features/dashboard/NewMemberOnboardingCard.tsx`, `lib/onboarding-checklist-seed.ts`, `lib/onboarding-next-cta.ts`, `console/onboarding-checklist`.
- 영향: **신입이 받는 첫 넛지(D+1)와 위젯의 첫 단계 CTA가 404로 착지** — 첫 경험 신뢰 훼손, 프로필 완성률(전 단계의 관문) 직접 저하.
- 보정안: (i) 8곳 href를 실존 표면(`/mypage?tab=settings` 등)으로 일괄 교체, 또는 (ii) `next.config.ts`에 `/mypage/edit → /mypage?tab=settings` 리다이렉트 1건 추가(참조처 무수정·최소 변경). 별도 핫픽스 항목화 권고.

**A2. [3→7단계] 승인 게이트가 사실상 로그인 폼에서만 동작 — 미승인 사용자가 실질 로그인 상태로 회원 영역 접근 가능**
- 근거: `runSignupFlow.ts:54-59` 가입 시 `authApi.signup` + `saveTokens` → Firebase 세션 생성·유지(수동대기 경로에서도 로그아웃 없음). `AuthProvider.tsx`는 approved 무관하게 `setUser`. `AuthGuard.tsx`는 user 존재·role만 검사(**approved 미검사**). `firestore.rules` 대부분 `isAuthenticated()` 기준(approved 조건 없음). 미들웨어 없음. 미승인 차단은 `LoginForm.tsx:55-63`(로그인 폼 경유 시)뿐.
- 영향: 수동 승인 대기자가 가입 직후(또는 세션 복원으로) `/dashboard`·회원용 화면·회원 read 데이터에 접근 — "승인 후 이용" 정책이 우회됨. 넛지·위젯은 approved=true 조건이라 미발동이지만 **접근 통제 관점의 실결함**.
- 보정안: `AuthProvider`(또는 `AuthGuard`)에서 `user.approved===false`면 전용 "승인 대기" 화면으로 고정+세션 정리. 장기적으로 firestore.rules 민감 read에 approved 체크. 보안 성격이므로 codex 교차검증 권고.

**A3. [8·9단계] 코호트 경계 오작동 — 8월 유입(2026-2 입학) 신입에게 위젯·넛지 시퀀스 전체 무동작**
- 근거: `cohortKeyOf`(`lib/semester.ts:61-71`)는 `enrollmentYear/Half` 우선. `currentSemesterKey`는 8/31까지 `2026-1`, 9/1부터 `2026-2`. 위젯(`isNewcomerWindow`)·cron(route.ts:102) 모두 `cohortKey === currentSemesterKey` && `createdAt` 기준 14일 창.
- 시나리오: **2026-2학기 입학 예정 신입이 8월에 가입**(전형적 8월 유입) → 가입~8/31 동안 코호트 불일치로 위젯·D+1~14 넛지 전부 미발동. 9/1부터 일치하지만 창은 `createdAt` 기준이라 **8/18 이전 가입자는 창 소진으로 영구 누락**, 8/18~31 가입자도 앞 단계(D+1·D+3…) 날짜를 이미 지나쳐 부분 누락.
- 부가: 재학 2학기+ 학생이 **학회에 처음 가입**하는 경우 cohortKey=과거 입학학기 → 신입 시퀀스에서 영구 제외("신입 회원" ≠ "신입생" 개념 불일치). 빈 대시보드는 아니나(위젯 null 렌더) **v9가 겨냥한 8월 유입 첫 경험 장치가 핵심 코호트에서 무동작**.
- 보정안: 신입 판정을 "코호트=현재 학기" 단일 기준 대신 (i) `cohortKey ∈ {현재, 다음 학기}` 허용, 또는 (ii) 가입일 기준(가입 14일 이내면 코호트 무관) 폴백. 위젯·cron 양쪽 동일 유틸로 수정(단일 소스). 외부 의존 §3 "신입 정의 합의"와 함께 확정.

**A4. [5·6단계] "승인 완료 시 이메일로 안내" 약속이 미이행 — 실제로는 인앱 알림만 생성**
- 근거: `LoginForm.tsx:103-111` "승인이 완료되면 {email}로 안내 드리겠습니다". 실제 승인 처리(`AdminMemberTab.tsx:227,257,282`)는 `notifyMemberApproved`(`features/notifications/notify.ts:60-68`) — **notifications 컬렉션 인앱 알림뿐, 이메일 발송 코드 없음**.
- 영향: 미승인 사용자는 로그인 불가라 인앱 알림함을 볼 수 없음 → **승인 사실을 통보받을 채널이 실질 0** → 승인 후 미복귀 이탈(깔때기 첫 병목의 후반부). 카피가 거짓 약속이 됨.
- 보정안: 단기 — 카피를 실제 동작으로 정정("승인 후 다시 로그인해 주세요" + 예상 소요). 중기 — 승인 시 실제 이메일 발송(외부 의존: 메일 인프라) 또는 H5의 상태 조회 수단 제공. v9-H5 구현과 정합 확인 필요.

**A5. [6단계] 거절(rejected) 상태 분기 부재 — 반려된 신청자가 영원히 "승인 대기 중" 화면을 봄**
- 근거: `AdminMemberTab`에는 거절 처리·`m.rejected` 필드·`notifyMemberRejected`(인앱 전용)가 존재하나, `LoginForm.tsx:55`는 `!user.approved`만 검사 → 거절자도 "승인 대기 중… 일반적으로 1~2일 이내 승인" 표시.
- 영향: 반려자에게 잘못된 기대를 무한 제공(안내 문구 불일치의 최악형). 인앱 반려 알림 역시 로그인 불가로 미도달.
- 보정안: LoginForm에서 `rejected` 분기 추가("가입 신청이 반려되었습니다 + 문의 경로"). 반려 사유 전달 채널(이메일/문의)은 외부 의존으로 분리.

### B급 (문구·동선 불일치, 조건부 결함) — 5건

**B1. [6단계] 로그인 화면 하단 고정 문구가 실제 정책과 상충** — `LoginForm.tsx:207` "회원가입 후 관리자 승인을 받아 로그인할 수 있습니다". 실제로는 가입 이메일이 @yonsei.ac.kr로 강제되고 자동승인 규칙(도메인+학번+중복없음)을 대부분 통과 → **대다수는 즉시 로그인 가능**. `/signup` 배너("즉시 승인")와 정면 상충 — 신규 방문자에게 불필요한 진입장벽 인상. 보정안: "연세메일 가입은 즉시 이용 가능, 일부 신청은 운영진 확인 후 승인" 등 실동작 반영.

**B2. [4a단계] 자동승인 직후 재로그인 강제** — 가입 시 Firebase 세션·토큰이 이미 유효한데 완료 화면이 `/login`으로 유도, 방금 만든 학번·비밀번호 재입력. `/login`은 로그인 상태 리다이렉트도 없음(`login/page.tsx`). 보정안: autoApproved면 "대시보드로 시작하기" 직행(세션 재사용) 또는 /login에서 기로그인 시 next로 자동 이동.

**B3. [10단계·D+3] 온보딩 트랙 미발행 시 '온보딩 시작' 단계 달성 불가 구조** — 폴백 `DefaultChecklistFallback`(onboarding/page.tsx:266-314)은 링크 카드만 있고 체크(=`guide_progress` write) 수단이 없음 → published 트랙/항목이 0이면 신입은 어떤 행동으로도 D+3 판정(`completedItems≥1`)을 충족 불가: 위젯 2단계 영구 미완 + D+3 넛지 무조건 발송. **프로드 guide_tracks 발행 여부 확인 필요(콘솔 `/console/onboarding-checklist`)** — 발행돼 있으면 비발동. 보정안: 폴백에도 경량 완료 체크 저장, 또는 D+3 판정에 "온보딩 페이지 방문(`logOnboardingEvent enter`)" 폴백 인정.

**B4. [7단계] 신입 첫 대시보드 정보 과부하 + 신입 위젯 폴드 아래** — `dashboard/page.tsx:571-631` 렌더 순서: 인사 헤더 → TodayCard → (시간표+커맨드센터 | 프로필+알림+잔디) 그리드 → 코칭 카드 → 주간 목표 → **7번째에야 NewcomerProgressWidget**. 신입에겐 대부분 빈 상태 위젯 더미가 먼저 보임. 보정안: 신입 창(14일) 동안 NewcomerProgressWidget을 TodayCard 직후로 승격(조건부 순서 변경, null 렌더 로직 재사용).

**B5. [1a단계] 학번 중복 확인이 선택 사항** — `useSignupForm.validateStep`은 `usernameChecked/usernameAvailable`를 검사하지 않아 "가입 확인" 버튼을 누르지 않아도 다음 단계 진행 가능. 중복 학번은 최종 제출에서 이메일 중복(Firebase)으로 실패하거나, 다른 이메일이면 **중복 학번 계정이 생성된 뒤 자동승인 거절→수동 검토行**(4단계 입력을 모두 마친 후에야 실패 인지). 보정안: Step1 통과 시 중복 확인을 자동 수행·필수화.

### C급 (경미·잠재) — 4건

- **C1. [8 vs 9] D+7 진단 판정 소스 이원화** — 위젯=진단 결과 컬렉션(`useUserDiagnostics`), cron=`user_activity_logs ui:diagnostic/complete` 텔레메트리. 동일 완료 플로우에서 양쪽 기록되나 독립 write라 한쪽 실패 시 "위젯 완료인데 넛지 발송" 가능. `newcomer-sequence.ts` NOTE에 이미 인지 — cron을 공용 유틸로 교체 제안 유지.
- **C2. [3a→4b] 자동승인 거절 사유 미구분** — 60분 창 초과·중복 학번·API 실패 모두 동일한 수동대기 화면. 사유별 안내(특히 중복 학번→비밀번호 찾기 유도)가 없음.
- **C3. [0단계] 랜딩 본문에 가입 CTA 부재** — 헤더에만 존재. 8월 유입 캠페인 시 랜딩 히어로에 가입 동선 보강 여지.
- **C4. [9단계] D+14 회고 넛지는 4단계 전부 완료자에게도 발송(스킵 없음·의도된 설계)** — 위젯은 전 완료 시 숨김이라 넛지 착지 후 `/steppingstone/onboarding`에서 "회고" 맥락이 약함. 회고 전용 앵커(완료 축하 상태) 고려.

---

## 3. 넛지(D+1~14) ↔ 위젯 판정 일치 대조 (과업 (4))

| 단계 | cron 스킵 조건 (`applySkipCondition`) | 위젯 판정 (`newcomer-sequence.ts`) | 일치 |
|------|--------------------------------------|-----------------------------------|------|
| D+1 프로필 | bio && (researchInterests+interestKeywords)≥1 (route.ts:217-227) | `isProfileComplete` 동일 로직 | **일치** |
| D+3 온보딩 | guide_progress.completedItems≥1 (`in` 쿼리) | guideProgressApi.listByUser + completedItems≥1 | **일치** (단 B3 조건부 달성 불가) |
| D+7 진단 | user_activity_logs `ui:diagnostic/complete` | 진단 결과 컬렉션 ≥1 | **소스 상이** (C1) |
| D+10 아카이브 | archive_favorites ≥1 | archiveFavoritesApi.listByUser ≥1 | **일치** |
| D+14 회고 | 스킵 없음(항상 발송) | 판정 대상 아님(전 완료 시 위젯 숨김) | 설계상 정합 (C4) |
| 코호트·창 게이트 | `cohortKeyOf===semKey` + `diffYmd===dayOffset` | `isNewcomerWindow` 동일 기준(0~14일) | **일치하되 양쪽 모두 A3 결함 공유** |

---

## 4. 요약

- LIVE 공개 경로 19종 실측 **전부 200**, 유일한 죽은 링크 = **`/mypage/edit` 404** (신입 1단계 딥링크 — A1).
- 가입 폼·약관·자동승인 파이프라인 자체는 견고(검증·중복 방지·60분 창·감사 로그). 결함은 **경계와 통보**에 집중: (1) 첫 딥링크 404, (2) 승인 게이트의 실효성(세션 우회), (3) 8월 유입 코호트에서 신입 장치 전체 무동작, (4) 승인/반려 결과를 신청자가 알 수 없는 통보 단절.
- A급 5건은 모두 **소규모 핫픽스로 보정 가능**(코드 수정은 본 감사 범위 밖 — 별도 항목화). A3·A4는 외부 의존 §3(신입 정의·승인 SLA·메일 인프라) 합의와 연동 권고.

| 심각도 | 건수 | 목록 |
|--------|------|------|
| A | 5 | A1 딥링크 404 · A2 승인 게이트 우회 · A3 코호트 경계 · A4 이메일 약속 미이행 · A5 거절 분기 부재 |
| B | 5 | B1 로그인 카피 상충 · B2 재로그인 강제 · B3 온보딩 폴백 체크 불가 · B4 신입 위젯 폴드 아래 · B5 학번 중복확인 선택 |
| C | 4 | C1 D+7 소스 이원화 · C2 자동승인 거절 사유 미구분 · C3 랜딩 CTA · C4 D+14 앵커 |
