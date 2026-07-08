# 연세교육공학회 서비스 4차 고도화·개선 기획 (Round 4)

> 작성일 2026-07-08 · 대상 `C:\work\yonsei-edtech` (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app) · **읽기·기획 전용**(코드 수정·배포 없음)
>
> 전제: 회원 = 교육공학 전공 대학원생·졸업생, 운영진 소수. 1·2·3차 High/일부 Medium 항목은 LIVE. 이 문서는 **v3(2026-06-16) 잔여 항목을 현재 코드로 재검증**하고, **오늘(2026-07-08) 신규 배포 기능의 후속 고도화 기회**를 실측 기반으로 발굴한다.
>
> 실측 방법: `grep`/`ls`로 라우트·컴포넌트·lib 존재를 직접 확인. v3에서 "G1이 사실 기구현이었던" 오판을 되풀이하지 않기 위해 **모든 항목을 파일 확인으로 판정**했다.

---

## 0. v3 항목 재검증 (현재 코드 실측 — 완료분 제외 근거)

### 0-1. v3 High(G1~G4) — **전부 LIVE 확인 (이번 라운드 제외)**

| # | v3 항목 | 판정 | 실측 근거 (파일 존재) |
|---|---|---|---|
| G1 | 전역 검색·커맨드 팔레트 | ✅ LIVE | `src/components/layout/GlobalSearch.tsx`, `command-routes.ts`, `Header.tsx`, `features/archive/ArchiveGlobalSearch.tsx` |
| G2 | R4 학습효과 증명 루프 | ✅ LIVE | `src/lib/learning-effect.ts`, `features/mypage/LearningEffectCard.tsx`, `MyPageView.tsx` 배치 · 리포트 `docs/plans/g2-learning-effect-report.md` |
| G3 | 포트폴리오 자동 적재 + 내보내기 | ✅ LIVE | `src/lib/portfolio-autofill.ts`, `components/profile/PortfolioAutofillDialog.tsx`, `app/mypage/portfolio/page.tsx` · PDF는 기존 `certificate/route.tsx` 재사용 |
| G4 | 운영 데이터 내보내기(CSV) | ✅ LIVE | `src/lib/export-csv.ts`(공용 유틸, `text/csv` blob) · insights/admin/console 다수 페이지 채택 |

### 0-2. v3 Medium/Low — 현재 상태 재판정

| # | v3 항목 | 재판정 | 실측 근거 |
|---|---|---|---|
| M1 | 하드코딩 색상 마이그레이션(번들 1) | ❌ **미착수·부채 증가** | raw 팔레트(`(bg\|text\|border)-{color}-N`) **392파일·6,921곳**(v3 실측 236파일·2,157곳 대비 증가 — 광의 정규식 차 감안해도 신규 도메인에서 재생산). `design-tokens.ts`에 `SEMANTIC` 토큰은 있으나 채택률 낮음 |
| M2 | 상황 맞춤 능동 가이드(개인화 발견성) | ⚠️ **부분·핵심 미충족** | `features/dashboard/NextActionBanner.tsx` 존재하나 후보가 **수업·세미나·todo 시간임박 1건**뿐. v3 M2의 "안 채운 포트폴리오·안 써본 도구·미응시 진단" 발견성 넛지는 **미구현** |
| M3 | 졸업생↔재학생 멘토링 1차 | ❌ **미착수** | `mentor` 역할 타입(`types/portfolio.ts`)·`credit-roles.ts`만 존재. 매칭·1:1 채널 없음(1·2·3차 연속 carryover) |
| M4 | journal 운영 콘솔 + 회원 알림 | ❌ **미착수** | `src/app/console/`에 `journal` 디렉토리 없음(labs·graduation·grad-life는 있음). journal feature(consent·review·apa7)는 공개 라우트만 |
| M5 | 읽기·심사 환류(증명 루프 확장) | ❌ **미착수** | `paper_reading_logs` 누적→연구 진척, 심사 STT 시계열·피어 분포 없음. `GradActivityDashboard`는 활동 집계뿐 |
| L1 | 색상 번들 2~3 | ❌ 미착수 | M1과 연동 |
| L2 | boards/gatherings/network 잔존·마이그레이션 라우트 정리 | ❌ **미착수** | `app/boards/[boardId]`, `app/board/*`, `app/gatherings`, `app/network` 모두 잔존 · 일회성 `console/inject-spring-2026-schedule`·`console/migrate-applicants` 잔존 |
| L3 | 아카이브 인용 벌크 검증(RISS/KCI) | ❌ 미착수 | carryover |
| L4 | 잔디 비활성 영역 자동 코칭 | ❌ 미착수 | carryover |
| L5 | 진단 적응형 동적 문항 | ❌ 미착수 | carryover |

**결론:** v3 High 4개는 완료 → 제외. Medium/Low는 **M1(부채 증가)·M2(핵심 미충족)·M3·M4·M5·L2가 실질 잔존**. v4는 이들 + **오늘 신규 기능 후속**으로 구성한다.

---

## 1. 오늘(2026-07-08) 신규 배포분 — 후속 고도화의 출발점

오늘 LIVE된 것(실측 확인, 중복 발굴 금지 대상):
- **gatherings 모임 생성(staff)** — `features/networking/EventEditorForm.tsx` 추출, `/gatherings` 헤더 다이얼로그(리포트 `gatherings-staff-create-report.md`). ✅
- **비공개 모임(공유 링크, unlisted)** — `app/gatherings/p/[token]/page.tsx`, `networkingEventsApi.getByToken`, `visibility`/`shareToken` 필드(리포트 `gatherings-private-calendar-report.md`). ✅
- **캘린더형 일정 투표** — when2meet 그리드 → 월 캘린더 히트맵(데이터 모델 `NetworkingAvailability` 재사용). ✅
- **마이페이지 졸업요건 체크표 + 콘솔 편집** — `features/mypage/GraduationChecklistCard.tsx`, `lib/graduation-progress.ts`, `types/graduation.ts`, `app/console/graduation/page.tsx`. ✅
- **학습효과 카드(G2)** — `features/mypage/LearningEffectCard.tsx`. ✅

**후속 고도화가 필요한 지점(실측된 갭):**
1. **졸업요건 ↔ 학기 플랜 미연동.** `graduation-progress.ts`에 `semester`/`plan`/`roadmap` 참조 0건 — 체크표가 정적 현황판일 뿐, `steppingstone/SemesterRoadmap`(학기 로드맵)과 끊겨 있음.
2. **비공개 모임 알림 부재.** 공유 링크는 생성되나 **초대 대상에게 링크를 알림으로 발송**하는 경로 없음(`private.*notif` 0건). 링크를 수동 복사·전달해야 함.
3. **캘린더 투표 마감 리마인더 부재.** `cron/networking-reminder`는 있으나 **일정 투표(availability) 마감·미투표자 독려**는 커버 안 함(cron 내 `availability`/`vote`/`slot` 참조 없음). 투표 확정 슬롯의 캘린더 자동 등록도 없음.
4. **포트폴리오 자동적재 소스 협소.** `portfolio-autofill.ts`의 `AutofillSourceKind`가 **`seminar` + `publication` 2종**뿐. 심사연습·수료증·연구활동·대외활동은 자동 후보에서 제외.
5. **학습효과 카드 = 텍스트 인사이트 1회성.** 개념 단위 **시계열 추세 그래프·알림/다이제스트 연동**이 없어 "지속 추적" 동기 레버로 확장 여지.

---

## 2. v4 고도화 백로그

각 항목: 목적·기대효과 · 규모(S<1주 / M 1~2주 / L 3주+) · 우선순위 · 연계 파일(절대경로 기준 `src/…`). **오늘 배포분의 "반쪽 고리" 완성 + 발견성 능동화 + 부채 상환**을 최우선 가점.

### High (다음 1개월 최우선) — "오늘 만든 걸 알림·연동으로 끝맺는다"

| # | 항목 | 목적·기대효과 | 규모 | 연계 파일 |
|---|---|---|---|---|
| **H1** | **일정 투표 마감 리마인더 + 확정 슬롯 자동화** | `cron/networking-reminder` 확장 or 신규 cron: 투표 마감 D-1 미투표자 넛지 → 마감 후 `bestSlots` 확정 슬롯을 **캘린더 이벤트로 자동 승격**(공지 알림 발송). 오늘 배포한 캘린더 투표의 "닫는 고리". | **S~M** | `app/api/cron/networking-reminder/`, `lib/bkend.ts`(networkingEventsApi), `features/networking/*`, `app/calendar/page.tsx` |
| **H2** | **비공개 모임 초대 알림** | private 모임 생성 시 대상 회원에게 **공유 링크를 인앱 알림/푸시로 발송**(현재 수동 복사만). 초대 명단·수락 흐름 최소 골격. | **S~M** | `features/networking/EventEditorForm.tsx`, `app/gatherings/p/[token]/`, `lib/notifications*`, `types/networking.ts` |
| **H3** | **졸업요건 ↔ 학기 로드맵 연동 + 미달 능동 넛지** | 졸업요건 체크표를 `steppingstone` 학기 로드맵과 연결 — "이번 학기 남은 요건 N개"를 마이페이지·NextActionBanner에 노출, 미달 항목 리마인더. 오늘 배포한 정적 체크표를 **행동 유도형**으로. | **M** | `lib/graduation-progress.ts`, `types/graduation.ts`, `features/mypage/GraduationChecklistCard.tsx`, `features/steppingstone/SemesterRoadmap.tsx`, `features/dashboard/NextActionBanner.tsx` |
| **H4** | **M2 상황 맞춤 능동 가이드(발견성 완성)** | NextActionBanner를 시간임박(수업·세미나·todo)에서 **발견성 넛지**로 확장 — "안 채운 포트폴리오·안 써본 진단/암기카드·비어 있는 연구 타이머" 컨텍스트 추천 1~2건. v3 M2의 핵심 미충족분. | **M** | `features/dashboard/NextActionBanner.tsx`, `user_activity_logs`, `lib/portfolio-autofill.ts`, `diagnostic_results`, `flashcards` |

### Medium (1~2개월)

| # | 항목 | 목적·기대효과 | 규모 | 연계 파일 |
|---|---|---|---|---|
| **M1** | **포트폴리오 자동적재 소스 확대** | `AutofillSourceKind`에 심사연습(defense)·수료증(certificate)·연구활동(research)·대외활동 추가 — 오늘 배포한 자동적재의 커버리지 확장. 중복·오귀인 방지 규칙 유지. | **M** | `lib/portfolio-autofill.ts`, `components/profile/PortfolioAutofillDialog.tsx`, `features/defense/*`, `certificate/route.tsx` |
| **M2** | **하드코딩 색상 마이그레이션 번들 1(고빈도 핵심 페이지)** | 6,921곳 중 회원 동선 핵심 파일 우선 raw→`SEMANTIC` 토큰 치환. 상위 hotspot: `features/activities/ActivityDetail.tsx`(76)·`features/research/ResearchReportInterview.tsx`(75)·`features/defense/DefensePracticeRunner.tsx`(71)·`app/courses/[id]/schedule/page.tsx`(54)·`components/mypage/MyPageView.tsx`(42). 다크모드·브랜드 일관성. | **M** | `lib/design-tokens.ts`(SEMANTIC), `DESIGN.md`, 상위 hotspot 파일들 |
| **M3** | **학습효과 개념 시계열 + 알림 연동** | LearningEffectCard를 개념 단위 **추세 그래프**로 확장 + 유의미 개선 시 weekly-digest/알림 연동("○○ 개념 정답률 +X%p"). G2의 "지속 추적" 레버. | **M** | `lib/learning-effect.ts`, `features/mypage/LearningEffectCard.tsx`, `cron/weekly-digest/route.ts` |
| **M4** | **journal 운영 콘솔 + 회원 참여 알림** (v3 M4 carryover) | `/console/journal` 발행호·투고·심사 배정 한눈 관리 + "투고 가능/심사 요청 도착" 회원 알림. journal feature(consent·review·apa7) 재사용. | **M** | `features/journal/*`, `app/console/`(신규 journal), `lib/notifications*` |
| **M5** | **읽기·심사 증명 루프**(v3 M5 carryover) | `paper_reading_logs` 누적→연구 진척 연결 + 심사 STT 채점 시계열·피어 분포. G2/M3와 동일 "증명" 패턴 확장. | **M** | `paper_reading_logs`, `features/defense/*`, `features/mypage/GradActivityDashboard.tsx` |

### Low (여유 시 / carryover)

| # | 항목 | 규모 |
|---|---|---|
| L1 | 색상 마이그레이션 번들 2~3(나머지 ~5,900곳, 도메인 일괄 + ESLint 규칙으로 재생산 차단) | M~L |
| L2 | 부채 정리: `app/boards/[boardId]`·잔존 `network` 라우트 폐기·용어 통합, 종료된 `console/inject-spring-2026-schedule`·`console/migrate-applicants` 제거, cron 공통 유틸 추출 | S~M |
| L3 | 졸업생↔재학생 멘토링 1차(collaborative-research 엔진 확장 + comm-board 1:1 채널) — 외부 의존(§4) | L |
| L4 | 아카이브 인용 벌크 검증 보조(RISS/KCI) — 외부 의존(§4) | M |
| L5 | 잔디 비활성 영역 자동 코칭 · 진단 적응형 동적 문항(codex 교차검증) | M~L |

---

## 3. 운영 효율화 (소수 운영진 부담 경감) — v4 관점

1·2·3차에서 알림·상태전환·넛지·콘텐츠 초안·CSV export까지 자동화. v4는 **오늘 배포한 모임/졸업요건의 운영 자동화 고리**와 **journal 한눈 관리면**에 집중.

| 영역 | 현재 | v4 제안 | 효과 | 규모 |
|---|---|---|---|---|
| 일정 조율 | 캘린더 투표는 있으나 마감·확정 수동 | **H1 마감 리마인더 + 확정 슬롯 자동 캘린더** | 조율 종료까지 자동화 | S~M |
| 모임 초대 | 링크 수동 복사·전달 | **H2 초대 알림 발송** | 링크 전달 부담 제거 | S~M |
| 졸업 관리 | 정적 체크표(콘솔 편집만) | **H3 학기 연동·미달 넛지** | 면담 전 자동 파악 | M |
| 학회지 | 공개 라우트 role-gating만 | **M4 `/console/journal`** | 발행·심사 배정 가시화 | M |
| 유지보수 | 색상 부채 6,921곳·중복 라우트 | **M2·L1·L2** | 부채·혼동 경감 | M~L |

**운영 Quick Win:** H1(투표 마감 리마인더) · L2(종료된 마이그레이션 라우트 정리).

---

## 4. 로드맵 (다음 1~2개월)

원칙: **오늘 배포한 반쪽 고리(투표 마감·모임 초대·졸업요건 연동)를 알림·자동화로 먼저 닫는다.** 그다음 발견성 능동화(H4)·자산 확대(M1)·부채 상환(M2).

### 4-1. Quick Win (1~2주)
- **H1 일정 투표 마감 리마인더** — S~M. cron 확장, 확정 슬롯 자동 캘린더.
- **H2 비공개 모임 초대 알림** — S~M. 알림 발송 골격.
- **L2 잔존/종료 라우트 정리** — S.

### 4-2. 4주 차 핵심 (연동 완성·발견성)
- **H3 졸업요건 ↔ 학기 로드맵 연동 + 미달 넛지**
- **H4 M2 상황 맞춤 능동 가이드(발견성 완성)**

### 4-3. 6~8주 차 (자산·증명·부채)
- **M1 포트폴리오 자동적재 소스 확대**
- **M3 학습효과 개념 시계열 + 알림 연동**
- **M2 색상 마이그레이션 번들 1(핵심 동선)**
- M4 journal 운영 콘솔

### 4-4. 백로그(추후)
- M5 읽기·심사 증명 · L1 색상 번들 2~3 · L2 잔여 부채 · L3~L5

**빠른 효과 vs 큰 투자**
- 빠른 효과: H1, H2, L2
- 큰 투자: H4 발견성, M1 소스 확대, M2 색상 마이그레이션, M4 journal 콘솔, M5 증명 루프

---

## 5. 외부 의존 항목 (운영진 결정·콘텐츠 필요 — 코드만으로 불가)

| 항목 | 막힌 이유 | 필요한 결정 |
|---|---|---|
| H2 모임 초대 알림 | 초대 대상 지정 방식(전체/역할/개별)·푸시 동의 범위 | 운영진이 초대 정책·발송 범위 결정 |
| H3 졸업요건 기준 데이터 | 요건 항목·학점·필수 과목의 **공식 기준** | 학과/운영진이 요건 스펙 확정(콘솔 편집분 검증) |
| M4 journal 운영 | 투고·심사 워크플로(심사위원 배정·라운드·게재 결정) | 편집위원회 운영 규정 확정 |
| G3 포트폴리오 웹 공유 링크 | 현재 export=PDF만. 웹 공유 링크는 공개 범위·개인정보 정책 필요 | 외부 공유 필드·만료 정책 결정 |
| L3 멘토링 | 졸업생 참여 의사·매칭 동의·개인정보 노출 범위 | 졸업생 모집·동의 절차(오프라인) |
| L4 인용 검증 | RISS/KCI API/스크래핑 가용성·저작권 | 외부 데이터 접근 방식 승인 |
| L5 동적 문항 생성 | LLM 출제 정확성 검증 책임(codex 교차검증) | 출제 품질 게이트 정책 |

---

## 6. 핵심 결론 (우선 3가지)

1. **오늘 만든 걸 알림으로 끝맺어라(H1·H2·H3).** gatherings 모임 생성·비공개 링크·캘린더 투표·졸업요건 체크표는 배포됐으나 **투표 마감 리마인더·초대 알림·학기 연동이라는 "닫는 고리"가 비어 있다.** 신규 기능보다 이 고리를 닫는 것이 최고 ROI.
2. **발견성을 능동화하라(H4).** 전역검색(G1)은 "찾으러 가는" 수동 발견. NextActionBanner를 "안 채운 포트폴리오·안 써본 도구"로 확장해 **먼저 권하는** 발견성으로. v3 M2의 핵심 미충족분.
3. **부채를 상환하라(M2).** 색상 부채가 2,157곳→**6,921곳(392파일)**으로 증가 중 — `SEMANTIC` 토큰은 있으나 채택률이 낮다. 핵심 동선부터 번들 마이그레이션 + ESLint 규칙으로 재생산을 차단한다. 잔존 라우트(boards/network/마이그레이션) 정리(L2)도 병행.

---

## 참고 파일 (절대경로, 실측 기반)

- v3 High 완료 확인: `src/components/layout/GlobalSearch.tsx`, `src/lib/learning-effect.ts`, `src/lib/portfolio-autofill.ts`, `src/lib/export-csv.ts`
- 오늘 배포 후속 근거:
  - 졸업요건 학기 미연동: `src/lib/graduation-progress.ts`(semester/plan/roadmap 참조 0건), `src/features/mypage/GraduationChecklistCard.tsx`, `src/app/console/graduation/page.tsx`
  - 투표 마감·초대 알림 부재: `src/app/api/cron/networking-reminder/route.ts`(availability 미커버), `src/features/networking/EventEditorForm.tsx`, `src/app/gatherings/p/[token]/page.tsx`
  - 자동적재 소스 협소: `src/lib/portfolio-autofill.ts`(`AutofillSourceKind = "seminar" | "publication"`)
  - 학습효과 1회성: `src/features/mypage/LearningEffectCard.tsx`
- v3 잔존 근거:
  - M2 부분: `src/features/dashboard/NextActionBanner.tsx`(class/seminar/todo만)
  - M3 멘토링 미착수: `src/types/portfolio.ts`(mentor 역할 타입만), `src/features/collaborative-research/lib/credit-roles.ts`
  - M4 journal 콘솔 부재: `src/app/console/`에 journal 없음 · feature는 `src/features/journal/*`
  - M5 미착수: `src/features/mypage/GradActivityDashboard.tsx`(활동 집계만)
  - 색상 부채: raw 팔레트 **392파일·6,921곳**(hotspot: `src/features/activities/ActivityDetail.tsx` 76곳 등)
  - L2 잔존 라우트: `src/app/boards/[boardId]`, `src/app/network`, `src/app/console/inject-spring-2026-schedule`, `src/app/console/migrate-applicants`

> 본 문서는 4차 기획 산출물. 코드 변경 없음. v1~v3 문서와 보완 관계. v3 High(G1~G4) LIVE 확인 후 제외, Medium/Low 잔존분(M1~M5·L2 등)과 오늘 배포분 후속(H1~H4·M1·M3)으로 재구성.
