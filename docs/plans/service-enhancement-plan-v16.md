# 연세교육공학회 서비스 고도화 백로그 v16 — "연결·운영 자동감지·리텐션 루프" (2026-07-27)

> 작성: 수석 서비스 플래너 (코드 실측 기반 · 채팅 인터뷰 없음)
> 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app)
> 실측 일자: 2026-07-27
> 직전 완료 흐름(v15 이후 LIVE): 운영진 홈(대시보드) 탭 + "처리 대기" 실데이터 위젯 · 수요조사→개설 파이프라인(모임장→설계→개설 자동생성·참여 명단·알림) + 콘솔 개설 퍼널 뷰 · 러닝 가이드(서재·뷰어 에디토리얼·CMS·온보딩/에이전틱AI 시드) · 업무노트 워크플로우/TO-DO

---

## 0. 재제안 금지선 · 기술 부채 게이트 (실측 갱신값)

### 0-1. 기술 부채 래칫 (2026-07-27 실측)

| 지표 | 현재 CEILING | 스크립트 | v15 대비 |
|---|---|---|---|
| ESLint warning | **263** | `scripts/check-eslint-warning-ratchet.mjs` | 273→263 (v15-M1 부분 상환: 270→263 커밋 `e8d39d9f`) |
| raw color 파일 | **1** (`design-tokens.ts` 만 허용) | `scripts/check-rawcolor-ratchet.mjs` | 유지 |
| knip deadcode | **26** (`scripts/deadcode-baseline.json`) | `scripts/check-deadcode-ratchet.mjs` | v15-M3(26→15) **미착수** — v16 이월 |

> 배포 게이트는 세 래칫 전량 PASS + `tsc` + `build` + 배포 후 QA 스모크(운영진 홈·수요조사 탭·러닝 가이드 서재·마이페이지)를 필수로 한다. 신규 기능은 **DB/rules 무변경 우선**, 불가피할 때만 firestore.rules 명시 변경 후 배포.

### 0-2. v15 이후 완료로 간주 (재제안 금지)

- **운영진 홈 탭 + 처리 대기 위젯** (`StaffHomeTab.tsx` · `useStaffReviewQueue.ts`) — 회원승인·미답변문의·아카이브검수 3종 집계 LIVE
- **수요조사 전환 루프 전체** (`DemandSurveySection.tsx` · `StudyLaunchPanel.tsx` · `ensure-demand-board.ts`) — 학기별 보드·반응 2종·정족수 신호·모임장→설계→개설(activities 자동생성)·참여 명단·개설 알림
- **러닝 가이드 서재/뷰어/CMS** (`learning-guides/*`) — 저자자격 서버검증·진행 추적(LearningGuideProgress)·에디토리얼 리디자인
- **v15 L1 단축키 힌트** — `CommandPaletteCoach.tsx` 존재로 상시 힌트 표면 확보됨 → **백로그에서 영구 종료**(v8~v15 이월분 해소)

### 0-3. v15 미착수·이월 (v16 재배치)

- **v15-M1 ESLint 273→220**: 부분 상환(263) → v16 **M1**으로 잔여 승계(263→210)
- **v15-M3 deadcode 26→15**: 미착수 → v16 **M2**로 승계 (baseline items 26건 명세 확보 완료)
- **v15-M2 raw color 라운드5** (board·leaderboard·networking): 미확인 → v16 **M3**
- **v15-M7 img→Image 잔여 14파일**: 미확인 → v16 **L3**
- **v15-M9 아카이브 크로스링크**: 미착수 → v16 **M6**(범위 축소 재설계)
- **이벤트성(H6 cron 임계·M4 web_vitals·M5 kudos·L3 해커톤 회고 등)**: 8~10월 데이터 도래 항목 → §6 데이터 대기로 이월 유지

---

## 1. v16 핵심 명제

> v15 기간에 세 개의 큰 기능 축(**운영진 홈·수요조사 파이프라인·러닝 가이드**)이 각자 완성돼 LIVE로 올라왔다. 그러나 실측 결과 이들은 **서로 고립된 섬**이다: (a) 수요조사가 정족수에 도달해도 운영진 홈 "처리 대기"에 뜨지 않아, 개설 트리거를 운영진이 매번 탭을 파고들어 확인해야 한다. (b) 러닝 가이드는 진단평가·수요조사·스터디 어디와도 연결선이 없어, "약점 진단 → 가이드 학습 → 스터디 참여"라는 자연스러운 회원 여정이 끊긴다. (c) 참여할래요를 누른 회원은 개설 순간 1회성 알림만 받을 뿐, "내가 관심 밝힌 수요가 지금 어느 단계인지"를 마이페이지에서 되짚을 표면이 없다. v16의 각도를 **"연결(Weave) · 운영 자동감지(Sense) · 리텐션 루프(Loop)"** 로 잡는다. 이미 만든 기능들 사이에 **참조 링크와 자동 감지 신호**를 심어 하나의 서비스로 봉합하고, 회원이 되돌아올 이유(진행 상태·이어읽기·상태 추적)를 표면화한다. **대부분 DB/rules 무변경 — 기존 컬렉션 집계·필드 추가·쿼리 파라미터로 해결된다.**

### 1-1. v16 실측 갭 (2026-07-27 기준)

| # | 렌즈 | 실측된 갭 | 근거(파일) |
|---|---|---|---|
| ① | **수요 파이프라인 ↔ 운영진 홈 단절** | `useStaffReviewQueue`가 회원승인·문의·아카이브검수 3종만 집계. 정족수 도달·개설 검토중 수요가 운영진 홈에 미표면 → 개설 지연 | `src/features/staff/useStaffReviewQueue.ts:71` · `DemandSurveySection.tsx:55` (JOIN_THRESHOLD=3) |
| ② | **진단평가 ↔ 러닝 가이드/스터디 단절** | 진단 약점이 아카이브 개념으로만 링크. "약점→가이드→스터디" 후속 학습 경로 없음 | `src/app/diagnosis` · `src/features/learning-guides/api.ts` · Header nav(`/diagnosis`·`/learning-guides` 별개) |
| ③ | **러닝 가이드 리텐션 루프 부재** | `LearningGuideProgress`(markRead·lastPage) 추적하나 "이어읽기"가 마이페이지·대시보드에 미표면. 진행률 상시 노출 0 | `learning-guides/api.ts:172` `guideProgressApi` · mypage 미연결 |
| ④ | **참여자(member) 수요 상태 추적 부재** | 참여할래요 누른 회원은 개설 시 1회 알림뿐. 마이페이지에 "내가 참여 의사 밝힌 수요 N건·현재 단계" 없음 | `DemandSurveySection.tsx:223` joinMutation · mypage 미연결 |
| ⑤ | **수요조사 발견성 저하** | 수요조사가 `/activities/studies`·`/seminars` 내부 탭에만 존재. 대시보드·온보딩 진입점 0. GlobalSearch 미색인 | Header nav에 `/demand` 없음 · `GlobalSearch.tsx` demand 미참조 |
| ⑥ | **러닝 가이드 ↔ 스터디/세미나 상호참조 없음** | 가이드가 관련 스터디·세미나·아카이브 개념과 연결선 0. 가이드 완독 후 다음 행동 유도 없음 | `LearningGuide` 타입에 relatedActivityId/relatedConceptId 없음 |
| ⑦ | **운영진 홈 딥링크 얕음** | `StaffHomeTab` 내 할 일·공지가 `onGoTab("projects")` 탭 전환만. 실제 콘솔 대상 화면 딥링크 없음 | `StaffHomeTab.tsx:183,232` onGoTab 단일 |
| ⑧ | **개설 이후 참여 전환 미측정** | 개설 알림 발송(`notifyStudyOpened`) 후 실제 참가 신청 전환율 미집계. 정족수 명단 N명 중 몇 명이 실제 참여했는지 불명 | `StudyLaunchPanel.tsx:176` responders 알림 · activities 참가 미대조 |
| ⑨ | **ESLint/deadcode 감축 트렌드 정체** | 263/26 고정. v15-M1 부분·M3 미착수. 상환 지속 없으면 신학기 대량 커밋 시 누적 | `deadcode-baseline.json` 26건 명세 |
| ⑩ | **수요→가이드 콘텐츠 순환 부재** | "이런 세미나 듣고 싶어요" 수요가 많아도 → 러닝 가이드 초안 제안으로 이어지는 운영 힌트 없음 | 수요 세미나 항목 · 러닝 가이드 CMS 별개 |

---

## 2. 고도화 백로그 (v16 · 18항목)

---

### High (즉시 착수 · 연결/리텐션 직결 · 외부 의존 없음)

---

**H1. 수요 파이프라인 → 운영진 홈 "처리 대기" 자동 감지 (갭① · 운영 자동감지 핵심)**
- **문제/기회**: `useStaffReviewQueue`가 3종만 집계해, 수요조사가 **정족수(참여≥3) 도달**하거나 **개설 검토중/설계중** 상태로 대기해도 운영진 홈에 신호가 없다. 운영진이 스터디·세미나 페이지 수요조사 탭을 매번 수동 순회해야 개설 타이밍을 놓치지 않는다. 개설 파이프라인의 병목이 "감지 지연"에 있다.
- **개선안**:
  1. `useStaffReviewQueue`에 4번째 집계원 추가 — 현재 학기 demand 보드(`currentDemandContextId()`)에서 `status ∈ {reviewing, leader, designing}` 이거나 `joinCount ≥ JOIN_THRESHOLD && status ∈ {collecting, reviewing}`(정족수 미개설) 건수 합산
  2. 라벨 "개설 대기 수요", `href: "/activities/studies?tab=demand"` (또는 콘솔 개설 퍼널 뷰 URL)
  3. `StaffHomeTab` 처리 대기 위젯은 기존 렌더 로직 그대로 4개 카드로 표시(코드 변경 최소)
- **영향 파일**: `src/features/staff/useStaffReviewQueue.ts` (집계 추가) · (읽기) `src/features/demand/ensure-demand-board.ts`·`DemandSurveySection` 상수
- **제약**: DB/rules 무변경 (기존 `commQuestionsApi.listByBoard`·`commLikesApi.countsByType` 재사용) · 시맨틱 토큰만 · 신규 eslint 경고 0
- **검증**: 정족수 3 도달 수요 1건 생성 → 운영진 홈 "개설 대기 수요" 카운트 +1 확인 · 개설 완료 시 카운트 감소 확인 · 비운영진 계정에서 위젯 미노출 확인
- **복잡도**: **S**

---

**H2. 진단 약점 → 러닝 가이드/스터디 후속 학습 브릿지 (갭② · 연결 핵심 · 리텐션)**
- **문제/기회**: 진단평가 결과가 약점 영역을 아카이브 개념으로만 링크한다. "약점 진단 → 관련 가이드 읽기 → 관련 스터디 참여"라는 학습 여정이 끊겨 있어, 진단이 일회성 리포트에 그친다. 러닝 가이드·수요조사가 이미 존재하므로 링크만 심으면 자연 순환이 생긴다.
- **개선안**:
  1. 진단 결과 리포트 약점 카드 하단에 "추천 학습" 섹션 추가 — 약점 영역 태그와 러닝 가이드 `category`/`tag` 매칭(`guidesApi.list({ tag })`)으로 관련 가이드 0~3개 칩 링크
  2. 매칭 가이드 없으면 "이 주제 스터디 수요 남기기" CTA → `/activities/studies?tab=demand&prefill=<약점주제>` 프리필
  3. 매칭 규칙은 클라이언트 태그 교집합(신규 필드 없이 기존 `tags`/`category` 활용). 매칭 0건 시 CTA만 노출(빈 상태 안전)
- **영향 파일**: `src/app/diagnosis/**` 결과 컴포넌트 · `src/features/learning-guides/api.ts`(읽기 재사용) · `DemandSurveySection` prefill 파라미터 수신부(H4와 공유)
- **제약**: DB/rules 무변경 (읽기·쿼리 파라미터) · 시맨틱 토큰만 · eslint 0
- **검증**: 특정 약점(예: 연구방법) 진단 결과에서 해당 태그 가이드 노출 확인 · 매칭 0건 영역에서 스터디 수요 CTA만 표시·프리필 동작 확인
- **복잡도**: **M**

---

**H3. 러닝 가이드 "이어읽기" 리텐션 표면 — 마이페이지·대시보드 (갭③ · 리텐션 루프)**
- **문제/기회**: `guideProgressApi`가 진행률(markRead)·마지막 위치(lastPageId)를 이미 저장하는데, 이를 되짚을 표면이 서재 안에만 있다. 회원이 재방문했을 때 "읽던 가이드 이어읽기"가 대시보드/마이페이지에 없어 리텐션 훅이 낭비되고 있다.
- **개선안**:
  1. 마이페이지(또는 `/dashboard`)에 "이어읽기" 위젯 — 진행 중(0<progress<100) 가이드 최대 3개, 진행률 바 + `/learning-guides/[slug]?page=<lastPageId>` 딥링크
  2. 완독 가이드는 "완독" 뱃지로 구분(성취 표면 = 리텐션)
  3. 진행 데이터 없으면 "가이드 둘러보기" CTA → `/learning-guides` (빈 상태 안전)
- **영향 파일**: `src/features/learning-guides/api.ts`(진행 목록 조회 헬퍼 추가 필요 시) · `src/app/mypage/**` 또는 `src/features/dashboard/**` 신규 위젯 · `src/app/learning-guides/[slug]/page.tsx`(page 쿼리 수신 확인)
- **제약**: 진행 목록을 한 번에 조회하는 API가 없으면 `guide_progress` 사용자별 조회 헬퍼 1개 추가(읽기 전용, rules 무변경) · 시맨틱 토큰만 · eslint 0
- **검증**: 가이드 2페이지 읽고 이탈 → 마이페이지 이어읽기에 진행률 표시·딥링크가 마지막 페이지로 착지 확인 · 완독 시 뱃지 전환 확인
- **복잡도**: **M**

---

**H4. 참여자 수요 상태 추적 + 수요조사 발견성 (갭④⑤ · 리텐션 + 발견성)**
- **문제/기회**: 참여할래요를 누른 회원이 개설 전까지 상태를 되짚을 수 없고, 수요조사 자체가 활동 페이지 내부 탭에 숨어 발견성이 낮다. 두 갭 모두 "회원이 남긴 관심을 회수하지 못하는" 리텐션 손실.
- **개선안**:
  1. 마이페이지에 "내가 관심 밝힌 수요" 위젯 — `commLikesApi.listMineSet(user.id)`에서 `question__`·`demand-join__` 항목 역참조 → 해당 수요의 현재 status 뱃지 + 링크(개설됨이면 활동 링크)
  2. 헤더/대시보드에 수요조사 직접 진입점 추가 — "스터디·세미나 수요조사" 링크(`/activities/studies?tab=demand`) 노출
  3. `GlobalSearch`/커맨드 팔레트(`command-routes.ts`)에 수요조사·러닝 가이드·진단평가 라우트 색인 추가
- **영향 파일**: `src/app/mypage/**` 신규 위젯 · `src/components/layout/command-routes.ts`·`GlobalSearch.tsx`·`Header.tsx`(진입점) · `DemandSurveySection`(prefill·tab 파라미터 수신, H2와 공유)
- **제약**: DB/rules 무변경 (기존 likes 역참조·라우트 상수) · 시맨틱 토큰만 · eslint 0
- **검증**: 참여할래요 후 마이페이지 위젯에 상태 뱃지 노출 · 개설 시 뱃지 "개설됨"+활동 링크 전환 · 커맨드 팔레트에서 "수요"·"가이드" 검색 시 라우트 노출 확인
- **복잡도**: **M**

---

### Medium (1~2 스프린트 · 연결 심화·코드 품질·운영 효율)

---

**M1. ESLint warning 263→210 추가 상환 (갭⑨ · v15-M1 잔여 승계)**
- **문제**: v15에서 270→263까지만 상환. 상위 집중 파일의 `react/no-array-index-key`·`@typescript-eslint/no-explicit-any`·잔여 exhaustive-deps 억제가 신학기 대량 커밋 시 누적 위험.
- **개선안**: `npx eslint --format json` 파일별 분류 → 상위 10개 집중. 목록형 key 안정화·타입 명시·억제 주석 전환.
- **영향 파일**: ESLint 결과 상위 파일(착수 시 재측정)
- **제약**: 기능 무변경 리팩터링 · CEILING 263→210 갱신(`gen-eslint-warning-baseline` 재실행) · 시맨틱 토큰 무관
- **검증**: `npm run lint` 경고 수 ≤210 · ratchet PASS · `tsc`·`build` 통과
- **복잡도**: **M**

---

**M2. knip deadcode 26→15 감축 (갭⑨ · v15-M3 승계 · 명세 확보)**
- **문제**: baseline 26건이 그대로. CEILING=26은 회귀 차단이지 감축이 아니다. baseline items 26건이 이미 명세돼 있어 안전 삭제 대상 선별이 가능.
- **개선안**: 확실한 미참조 export 우선 삭제 — `notify.ts`(notifyNewNotice·notifyNewSeminar·notifySeminarReminder)·`notify-timing.ts`(computePeakWindow·minutesToHm)·`push.ts`(disablePushForCurrentUser·onForegroundPush)·`usePaperReadingLogs.ts`(useDeleteReadingLog·useUpdateReadingLog)·`collaborative-research` 미사용 훅 등 11건. **동적 import·향후 예약 export는 grep 교차 확인 후 보존**(push/notify는 알림 정책 재개 대비 판단 필요 — 애매하면 유지).
- **영향 파일**: 삭제 대상 다수 · `scripts/gen-deadcode-baseline.mjs` 재실행 → `deadcode-baseline.json` ceiling 15로 갱신
- **제약**: 삭제 전 각 export `grep -r` 무참조 확인 필수 · 기능 무변경
- **검증**: `npm run lint:deadcode` current ≤15 · `tsc`·`build` 통과 · 삭제 export 무참조 grep 증거
- **복잡도**: **S~M**

---

**M3. raw color 라운드5 — board·leaderboard·networking (갭 · v15-M2 승계)**
- **문제**: rawcolor CEILING=1 유지 중이나 board·leaderboard·networking 영역 raw hex 잔존 여부 미확인. 다크모드 색상 불일치·브랜드 정합 잠재 결함.
- **개선안**: `gen-rawcolor-baseline.mjs` 재실행 → 대상 파일 확인 → `var(--color-*)` 시맨틱 토큰 교체. 없으면 항목 종료 처리.
- **영향 파일**: `src/app/board/**`·`src/app/leaderboard/**`·`src/features/networking/**`
- **제약**: rawcolor CEILING=1 유지 · 전환 후 라이트/다크 스모크 필수
- **검증**: rawcolor ratchet PASS(≤1) · 라이트/다크 색상 눈확인
- **복잡도**: **M**

---

**M4. 개설 이후 참여 전환 집계 — 정족수→실참여 대조 (갭⑧ · 운영 효율)**
- **문제**: 개설 알림 후 실제 참가 신청 전환이 미측정. 정족수 명단 N명 중 몇 명이 실제 활동에 참여했는지 불명이라 수요조사 정확도 개선 피드백이 없다.
- **개선안**: 콘솔 개설 퍼널 뷰에 "개설 후 전환" 열 추가 — `demandPref.linkedActivityId`로 개설된 활동의 `participants`와 `demand-join` responders 교집합 수 표시("참여 의사 N명 → 실참여 M명"). 기존 컬렉션 집계 쿼리만.
- **영향 파일**: `src/app/console/**` 개설 퍼널 뷰 컴포넌트 · `src/lib/bkend.ts`(activities·likes 조회 재사용)
- **제약**: DB/rules 무변경 · 표본 미달 시 "데이터 부족" 레이블
- **검증**: 개설된 스터디 1건에 대해 참여 의사 대비 실참여 수 정확 표시 확인
- **복잡도**: **S~M**

---

**M5. 운영진 홈·업무 딥링크 정밀화 (갭⑦ · 운영 효율)**
- **문제**: `StaffHomeTab` 내 할 일·공지 클릭이 `onGoTab("projects")` 탭 전환에만 머문다. 처리 대기 4종은 이미 콘솔 딥링크가 있으나, 내 할당 업무는 프로젝트 보드 특정 카드로 이동하지 못한다.
- **개선안**: 내 할당 업무 항목 클릭 시 `onGoTab("projects")` + 대상 projectId 포커스 파라미터 전달(스토어 selected state 또는 `?project=<id>`). 공지도 마찬가지로 해당 공지 하이라이트.
- **영향 파일**: `src/features/staff/StaffHomeTab.tsx`·`StaffProjectsTab.tsx`·`staff-store.ts`(선택 상태)
- **제약**: DB/rules 무변경 · 시맨틱 토큰만
- **검증**: 홈에서 업무 클릭 → 프로젝트 탭 해당 프로젝트 포커스 확인
- **복잡도**: **S**

---

**M6. 러닝 가이드 ↔ 관련 스터디/세미나/개념 상호참조 (갭⑥⑩ · 연결 심화 · v15-M9 축소 재설계)**
- **문제**: 러닝 가이드가 스터디·세미나·아카이브 개념과 연결선 0. 완독 후 다음 행동(관련 스터디 참여·개념 심화)이 유도되지 않는다. v15-M9(아카이브 전역 크로스링크)는 범위가 커 미착수였으므로, **러닝 가이드 단일 진입점으로 범위를 좁혀** 실행 가능하게 재설계.
- **개선안**:
  1. `LearningGuide`에 `relatedTags: string[]`(이미 tags 있으면 재사용) 기반, 가이드 뷰어 하단 "관련" 섹션 — 태그 매칭 아카이브 개념·개설된 스터디(activities `type=study`) 칩 링크
  2. CMS 편집 UI에 관련 항목 태그 입력(선택). 미입력 시 태그 자동 매칭 폴백
  3. 완독 페이지에 "관련 스터디 수요 남기기" CTA(H2·H4 prefill 재사용)
- **영향 파일**: `src/app/learning-guides/[slug]/page.tsx`(뷰어 하단) · `src/features/learning-guides/*`(CMS 편집 필드) · 아카이브·activities 읽기 재사용
- **제약**: 가급적 기존 `tags` 재사용으로 DB 무변경 · 신규 필드 필요 시 옵셔널·하위호환 · 시맨틱 토큰만
- **검증**: 태그 보유 가이드에서 관련 개념·스터디 칩 노출·링크 착지 확인 · 태그 없는 가이드 빈 상태 안전
- **복잡도**: **M**

---

**M7. 수요 세미나 → 러닝 가이드/세미나 초안 운영 힌트 (갭⑩ · 콘텐츠 순환)**
- **문제**: "이런 세미나 듣고 싶어요" 수요가 쌓여도 러닝 가이드·세미나 개설로 잇는 운영 힌트가 없다. 콘텐츠 파이프라인(수요→발행)이 단절.
- **개선안**: 콘솔 개설 퍼널/러닝 가이드 CMS 대시보드에 "수요 상위 주제" 패널 — demand 세미나 항목을 참여수 순 상위 5개 표시, 각 항목에 "이 주제로 러닝 가이드 초안 만들기"(CMS 프리필) / "세미나 개설 검토" 링크. 운영진이 수요를 콘텐츠로 전환하는 진입점.
- **영향 파일**: `src/app/console/**`(러닝 가이드 CMS 또는 개설 퍼널) · demand 조회 재사용
- **제약**: DB/rules 무변경 · 운영진(staff) 전용 표면
- **검증**: 수요 세미나 항목이 참여수 순으로 표시·CMS 프리필 링크 동작 확인
- **복잡도**: **S~M**

---

**M8. 운영진 홈 "개설 대기 수요" 상세 인라인 (갭① 심화 · H1 후속)**
- **문제**: H1이 카운트 배지를 띄우면, 클릭 시 탭 전환만으로는 어떤 수요인지 즉시 파악이 어렵다.
- **개선안**: 운영진 홈에 "개설 대기 수요" 미니 리스트(정족수 도달·검토중 상위 3건: 주제·참여수·현재 단계·바로 개설 진행 링크 → StudyLaunchPanel 오픈 딥링크).
- **영향 파일**: `src/features/staff/StaffHomeTab.tsx` · demand 조회 재사용
- **제약**: DB/rules 무변경 · H1 완료 후 착수(같은 파일 영역)
- **검증**: 정족수 수요가 홈 미니 리스트에 표시·개설 진행 링크 동작 확인
- **복잡도**: **S**

---

### Low (여유 시 · 경량 개선 · 데이터 대기)

---

**L1. 러닝 가이드 온보딩 연결 — 신입 첫 로그인 추천 (리텐션)**
- 신입(NewcomerProgressWidget) 온보딩 흐름에 "신입 운영진 온보딩" 러닝 가이드(이미 시드됨) 추천 카드 1개. 발행 상태 가이드만 노출.
- **영향 파일**: `src/features/dashboard/NewcomerProgressWidget.tsx` · `learning-guides/api.ts` 읽기
- **복잡도**: **S**

---

**L2. 수요조사 학기 아카이브 뷰 — 지난 학기 수요 회고 (운영 효율)**
- 학기별 보드(`demand-{YYYY}-{1|2}`)가 분리 저장되므로, 콘솔에 지난 학기 수요·개설 전환율 회고 뷰(집계만). 다음 학기 기획 근거.
- **영향 파일**: `src/app/console/**` · demand 조회 재사용
- **복잡도**: **S~M**

---

**L3. img→Image 잔여 전환 (v15-M7 승계 · LCP)**
- `@next/next/no-img-element` 억제 잔여 파일 재측정 후 고빈도 노출 순 전환. PDF 컨텍스트는 억제 유지+사유 주석.
- **영향 파일**: 착수 시 `eslint --rule` 재측정 대상
- **복잡도**: **M**

---

**L4. 논문 여정 진행률 시각화 (v15-L6 승계)**
- 마이페이지 논문 여정 4단계(계획서→설계→작성→보고서) 퍼널 진행률 바 + 현재 위치 강조.
- **영향 파일**: `src/features/steppingstone/**` · `src/app/mypage/**`
- **복잡도**: **S~M**

---

## 3. 즉시 착수 Top 5 (병렬 편성안 · 파일 영역 비중복)

| 트랙 | 항목 | 파일 영역 | 착수 |
|---|---|---|---|
| **트랙 A** | **H1** 수요→운영진 홈 자동감지 | `src/features/staff/useStaffReviewQueue.ts` (+demand 상수 읽기) | 즉시 |
| **트랙 B** | **H3** 러닝 가이드 이어읽기 | `src/features/learning-guides/*` · `src/app/mypage/**` 신규 위젯 | 즉시 (A와 독립) |
| **트랙 C** | **H4** 수요 상태 추적 + 발견성 | `src/app/mypage/**` · `command-routes.ts`·`GlobalSearch`·`Header` | 즉시 (마이페이지 위젯은 B와 같은 페이지 → 파일 합류 시 순차) |
| **트랙 D** | **M1** ESLint 263→210 | ESLint 상위 파일(기능 영역 분산) | 즉시 (독립 리팩터) |
| **트랙 E** | **H2** 진단→가이드 브릿지 | `src/app/diagnosis/**` · learning-guides 읽기 | 즉시 (A·B·D와 독립) |

> **병렬 규칙:**
> - H3·H4는 마이페이지 위젯을 공유할 수 있음 → **같은 파일이면 순차, 다른 위젯 파일로 분리하면 병렬.**
> - H1 완료 후 **M8**(홈 상세 인라인) 착수 — 같은 `StaffHomeTab`/demand 영역 순차.
> - H2·H4·M6는 demand prefill 파라미터 수신부(`DemandSurveySection`)를 공유 → **파라미터 수신 로직을 H2에서 먼저 확정**하고 나머지가 참조.
> - M2(deadcode)는 M1(eslint)과 파일 겹칠 수 있어 **M1 완료 후 착수** 권장.
> - **배포 게이트**: `tsc`·`build`·rawcolor(≤1)·ESLint ratchet·deadcode ratchet 전량 PASS + QA 스모크(운영진 홈·수요조사 탭·러닝 가이드 서재/뷰어·마이페이지·진단 결과).

---

## 4. 수치 목표 요약

| 지표 | 현재(2026-07-27) | v16 목표 | 핵심 항목 |
|---|---|---|---|
| ESLint warning | CEILING=263 | **CEILING=210** (53건↓) | M1 |
| knip deadcode | CEILING=26 | **CEILING=15** (11건↓) | M2 |
| raw color 파일 | CEILING=1 | **유지(≤1)** | M3 |
| 운영진 홈 감지원 | 3종(승인·문의·검수) | **4종(+개설 대기 수요)** | H1 |
| 진단→후속학습 경로 | 아카이브 개념만 | **가이드+스터디 브릿지** | H2 |
| 러닝 가이드 리텐션 표면 | 서재 내부만 | **마이페이지 이어읽기** | H3 |
| 참여자 수요 추적 | 1회성 알림 | **상시 상태 위젯** | H4 |
| 수요조사 발견성 | 내부 탭만 | **헤더/대시보드/검색 색인** | H4 |
| 기능 간 크로스링크 | 고립 3섬 | **진단·가이드·수요·스터디 상호참조** | H2·M6·M7 |

---

## 5. 외부 의존 (운영진 결정 필요 — 별도 트랙)

| 항목 | 의존 대상 | 코드 연결 |
|---|---|---|
| **X1: 러닝 가이드 신규 콘텐츠 발행** (온보딩 외 주제 확대) | 운영진 콘텐츠 저작·검수 | CMS 준비됨 — H2/M6 매칭 품질은 발행 가이드 수에 비례 |
| **X2: 수요조사 정족수 기준(현 3명) 정책 확정** | 운영진 기준 합의 | `JOIN_THRESHOLD` 상수 조정(S). H1 감지 임계와 연동 |
| **X3: 개설 알림 채널 정책** (push/email quiet-hours·수신자) | 운영진 알림 정책 | 현재 인앱 notify만 — 채널 확대는 정책 확정 후(deadcode의 push/notify export 보존 판단과 연동) |
| **X4: 신학기 수요조사 캠페인** (모집 공지·독려) | 운영진 콘텐츠 발행 | H4 발견성 진입점에서 직접 작성 — 코드 준비됨 |
| **X5: 진단 약점↔가이드 매핑 테이블 정교화** | 도메인(교육공학) 판단 | 초기엔 태그 교집합 자동 매칭. 수동 큐레이션 원하면 매핑 상수 추가(S) |
| **X6: Firestore 정기 백업 GCP 스케줄** | GCP 설정 | 장기 carryover(v15 이월) |

---

## 6. 데이터 대기 항목 (도래 시 전환)

| 항목 | 의존 데이터 | 재평가 시점 |
|---|---|---|
| **cron 임계경보** (v15-H6) | trend 2개월 성공률 분포 | 8월 초 |
| **web_vitals 목표선** (v15-M4) | 라우트별 p75 2개월 누적 | 8월 초 |
| **kudos 리더보드** (v15-M5) | 해커톤·개강 kudos N≥50 | 9월 이후 |
| **개설 후 전환율 기준선** (M4 심화) | 개설 스터디 다수·참여 실데이터 | 개설 3건+ 누적 후 |
| **수요조사 학기 회고** (L2) | 한 학기 수요·개설 사이클 완료 | 학기 경계(9월/2월) |
| **해커톤 회고 집계** (v15-L3) | 8/22 행사 실데이터 | 8/22 이후 |

---

*파일: `docs/plans/service-enhancement-plan-v16.md` | 생성: 2026-07-27 | 다음 재검토: v16 High 4항목(H1~H4) LIVE 후 연결 효과 QA + 8월 이벤트 데이터 도래 시 v17 편성*
