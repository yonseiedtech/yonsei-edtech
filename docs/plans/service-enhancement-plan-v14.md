# 연세교육공학회 서비스 고도화 백로그 v14 — "ESLint 경고 급감 · 코드 부채 상환 · 타입 안전성" (2026-07-21)

> 작성: 수석 서비스 플래너 (코드 실측 기반 · 채팅 인터뷰 없음)
> 대상: yonsei-edtech (Next.js 16 + Firestore + bkend, LIVE https://yonsei-edtech.vercel.app)
> 실측 일자: 2026-07-21
> 직전 완료(v13): raw color CEILING=1 달성 · ESLint warning CEILING=360 래칫 구축 · knip deadcode 59→39 달성

---

## 0. 재제안 금지선 (v13까지 완료)

- raw color CEILING=1 (design-tokens.ts 의도적 잔존 1건만 허용)
- ESLint warning 래칫 스크립트(`scripts/check-eslint-warning-ratchet.mjs`, CEILING=360)
- knip deadcode 래칫(`scripts/check-deadcode-ratchet.mjs`, CEILING=39)
- H2 신입 온보딩 리허설: 사용자 직접 수행(8/18까지) — 재제안 금지
- H4 cron 임계 경보: 8/1~5 데이터 도래 후 — 외부 의존
- M1 web_vitals 목표선: 8/1~5 착수 — 외부 의존
- M4 kudos 리더보드: 9/1 이후 — 외부 의존

---

## 1. v14 핵심 명제

> v13까지 "raw color 0·warning 래칫·deadcode 래칫" 세 게이트를 세웠다. 게이트가 생겼으니 이제 **게이트 수치를 실제로 내린다**. 코드 실측 결과 ESLint warning 360건 중 상위 6개 파일이 **77건(21%)** 을 점유하며, 그 원인은 세 패턴으로 집중된다: (1) `opts` 인라인 객체 래칫 회피, (2) 배열 인덱스 키(`key={i}`), (3) 렌더 루프 안 상수 재정의. v14는 이 패턴들을 체계적으로 상환해 **ESLint CEILING 360→290** 목표를 잡는다. 동시에 knip deadcode **39→28**, 타입 단언(`as unknown as`) **주요 호출부 정리**, 그리고 1,200줄 초과 파일 분리를 진행한다.

---

## 2. 실측 근거 — ESLint warning 분포 (2026-07-21 직접 파악)

| 파일 | warning 수 | 주요 원인 (코드 실측) |
|---|---|---|
| `src/features/insights/useMemberMetrics.ts` | 22 | `(data ?? []) as Type[]` 타입 단언 12회, 쿼리별 isLoading 미추적 |
| `src/features/research/ResearchDashboard.tsx` | 18 | `opts` 객체 useMemo 안에서 참조하면서 deps에 `periodStart, periodEnd` 직접 나열 → exhaustive-deps 9회 |
| `src/features/research/ResearchReportPrint.tsx` | 16 | 동일 `opts` 패턴, 8회 useMemo |
| `src/app/directory/page.tsx` | 11 | 동일 `dirLoading` 5개 별칭(`staffLoading = presLoading = … = dirLoading`), `key={i}` |
| `src/app/console/research/page.tsx` | 10 | 1,208줄 단일 파일, 내부 컴포넌트 8개(WritingTab·ReadingTab·ProposalTab 등) |
| `src/app/admin/analytics/page.tsx` | 10 | `ROLE_KR`·`ROLE_COLOR` 상수를 `.map()` 콜백 내부 재정의, recharts `<Cell key={i}>` |
| **소계** | **87** | 전체 360건 중 **24%** |

---

## 3. 고도화 백로그 (v14 · 17항목)

> 형식: **[문제(파일·라인) → 제안 → 기대효과 → 예상 파일 · 작업 범위]**

---

### High (외부 의존 없음 · ESLint/타입 부채 직접 상환)

---

**H1. `opts` stable reference 패턴 수정 — ResearchDashboard + ResearchReportPrint (34건 해소)**

- **문제**: `ResearchDashboard.tsx:38` 과 `ResearchReportPrint.tsx:54` 가 각각 `const opts = { periodStart, periodEnd }` 를 **렌더 함수 본문에서 인라인 객체로 생성**한다. 이 `opts` 를 useMemo 콜백 안에서 사용하면서 deps 배열에는 `opts` 대신 `periodStart, periodEnd` 를 직접 나열한다. ESLint `react-hooks/exhaustive-deps` 는 콜백 안에서 참조된 변수(`opts`)가 deps에 없으므로 9+8=17 useMemo 호출에 각 1건씩 경고를 생성한다.

  ```tsx
  // 현재 — opts가 deps에 없어 exhaustive-deps 경고
  const writingDays = useMemo(
    () => computeWritingDays(history, opts),
    [history, periodStart, periodEnd]  // opts 누락
  );
  ```

- **제안**: `opts` 를 `useMemo` 로 안정화한다.

  ```tsx
  const opts = useMemo(
    () => ({ periodStart, periodEnd }),
    [periodStart, periodEnd]
  );
  // 이후 각 useMemo deps를 [history, opts] 로 변경
  const writingDays = useMemo(
    () => computeWritingDays(history, opts),
    [history, opts]
  );
  ```

- **기대효과**: ResearchDashboard 18건 + ResearchReportPrint 16건 = **34건 즉시 해소**. ESLint CEILING 360→326 이동.
- **예상 파일**:
  - `src/features/research/ResearchDashboard.tsx` (lines 38~52)
  - `src/features/research/ResearchReportPrint.tsx` (lines 54~75)
- **작업 범위**: 두 파일 각 5~10 라인 수정. 로직 변경 없음. 순수 hook deps 정합.

---

**H2. `admin/analytics/page.tsx` — 렌더 루프 상수 호이스팅 + recharts key 개선 (10건 해소)**

- **문제**: `AnalyticsPage.tsx:437~448` 에서 `ROLE_KR`(역할 한글 라벨)과 `ROLE_COLOR`(역할별 CSS 클래스) 두 Record 객체를 **`.map()` 콜백 내부에서 재정의**한다. ESLint `no-inner-declarations` 또는 `@typescript-eslint/no-use-before-define` 계열이 이를 경고하며, 렌더마다 GC 압박도 유발한다. 같은 값이 모듈 상단 `COLORS` 배열(line 44)과 `ROLE_KR`(line 143, `analytics` useMemo 내부)에 **이미 중복 정의**되어 있다.
  - `<Cell key={i} fill={COLORS[i % COLORS.length]} />` — recharts Cell에 배열 인덱스 key 사용(line 540, 576).

- **제안**:
  1. 모듈 상단에 `ROLE_KR_LABELS` / `ROLE_BADGE_CLS` 를 단일 const로 정의하고 컴포넌트 내 중복 정의를 제거한다.
  2. recharts `<Cell>` 에 `key={entry.name}` 처럼 데이터 기반 key를 사용한다.

- **기대효과**: 10건 해소 → CEILING 326→316.
- **예상 파일**:
  - `src/app/admin/analytics/page.tsx` (lines 44, 143~150, 294~300, 437~448, 540, 576)
- **작업 범위**: 50줄 이내 수정. 상수 2개 module-level 이동, Cell key 3곳 교체.

---

**H3. `directory/page.tsx` — dirLoading 별칭 5개 제거 + skeleton key 개선 (11건 해소)**

- **문제**:
  1. `directory/page.tsx:167`: `const staffLoading = dirLoading, presLoading = dirLoading, advLoading = dirLoading, memLoading = dirLoading, alumLoading = dirLoading;` — 동일 값 5개 별칭. `isLoading = staffLoading || presLoading || …`(line 169)도 실질적으로 `dirLoading` 과 동일하다. ESLint `prefer-destructuring` 또는 `@typescript-eslint/no-unused-vars` 계열 경고, 코드 가독성 저하.
  2. 로딩 skeleton의 `key={i}` / `key={j}` (lines 380, 382) — `react/no-array-index-key` 경고.

- **제안**:
  1. line 167 전체를 제거하고 line 169 를 `const isLoading = dirLoading;` 한 줄로 대체.
  2. skeleton 행 key 를 `key={`row-${i}-cell-${j}`}` 처럼 조합 문자열로 교체.

- **기대효과**: 11건 해소 → CEILING 316→305.
- **예상 파일**:
  - `src/app/directory/page.tsx` (lines 167~169, 380, 382)
- **작업 범위**: ~10 라인 수정. 로직 변경 없음.

---

**H4. `useMemberMetrics.ts` — 타입 단언 정비 + 전체 isLoading 반환 (22건 해소 목표)**

- **문제**:
  1. `useMemberMetrics.ts:155~166`: `(attendeesRes?.data ?? []) as SeminarAttendee[]` 형태의 타입 단언이 12회 반복된다. bkend API 반환 타입이 `ListResponse<unknown>` 으로 추론되어 매번 단언이 필요한 구조적 문제.
  2. `isLoading: loadingMembers` 만 반환하므로 12개 쿼리 중 나머지 11개 로딩 상태가 소비자에게 숨겨진다. members 데이터는 왔는데 attendees가 아직 로딩 중이면 UI는 로딩 완료처럼 보인다.

- **제안**:
  1. `dataApi.list<SeminarAttendee>()` 등 이미 제네릭이 지정된 호출에서 반환값을 `as SeminarAttendee[]` 단언 없이 `.data` 로 받을 수 있도록 bkend 반환 타입을 `ListResponse<T>` 로 강화하거나, 단언을 `satisfies` 로 교체.
  2. `UseMemberMetricsResult.isLoading` 을 `isLoading: loadingMembers || !attendeesRes || !postsRes || …` 로 확장해 전체 데이터 준비 완료 여부를 정확히 반영.

- **기대효과**: 타입 단언 경고 12건 + isLoading 관련 2~3건 → 최대 22건 해소, CEILING 305→283.
- **예상 파일**:
  - `src/features/insights/useMemberMetrics.ts` (lines 155~166, 317)
  - `src/lib/bkend.ts` (ListResponse 제네릭 보강, 선택적)
- **작업 범위**: useMemberMetrics.ts 15~20 라인 수정. bkend.ts 제네릭 보강은 가능하면 포함.

---

**H5. `eslint-disable` suppress 전환 — exhaustive-deps 억제 14건 정당화 또는 수정**

- **문제**: `// eslint-disable-next-line react-hooks/exhaustive-deps` 가 14개 파일에 산재한다. 억제가 올바른 경우(mount-once effect, 의도적 구독)와 실제 버그 위험(stale closure, deps 누락)이 혼재되어 있다. v13 CEILING=360 은 현재 suppressed 건은 카운트하지 않으므로, 억제 제거 시 경고가 표면으로 나와야 올바른 측정이 된다.

- **제안**: 각 suppressed 위치 14곳을 코드 실측으로 분류한다.
  - **안전한 억제(mount-once)**: 주석 업그레이드 — `// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once intentional` 처럼 의도를 명시.
  - **실제 문제인 경우**: `useCallback`/`useRef`/`stable ref` 패턴으로 수정해 억제 제거.
  - 대상: `src/features/activities/ActivityDetail.tsx:347`, `src/app/dashboard/page.tsx:162`, `src/features/seminar-live/LectureNotesEditor.tsx:40`, `src/features/research/ResearchModelEditor.tsx:155` 등 14곳.

- **기대효과**: 숨겨진 stale closure 버그 조기 발견 및 경고 카운트 정확성 향상. 직접 warning 수 감소는 파일당 0~3건(수정 전환 시).
- **예상 파일**:
  - `src/app/diagnosis/page.tsx:281`
  - `src/features/admin/AdminMemberTab.tsx:407`
  - `src/features/studio/StudioEditor.tsx:422`
  - `src/app/dashboard/page.tsx:162`
  - `src/features/admin/settings/GreetingSection.tsx:62`
  - `src/features/steppingstone/SemesterRoadmap.tsx:447`
  - `src/app/courses/page.tsx:193`
  - `src/features/activities/ActivityDetail.tsx:347`
  - `src/components/profile/ProfileAcademicActivities.tsx:172, 241`
  - `src/features/conference/ConferenceProgramEditor.tsx:835`
  - `src/app/steppingstone/onboarding/page.tsx:472`
  - `src/features/seminar-live/LectureNotesEditor.tsx:40`
  - `src/features/defense/DefensePracticeRunner.tsx:874`
  - `src/features/research/ResearchModelEditor.tsx:155`
  - `src/features/research/ResearchDesignEditor.tsx:368`
  - `src/features/research/ResearchReportInterview.tsx:1693`
- **작업 범위**: 파일당 1~5 라인 수정 또는 주석 보강. 16곳 순차 검토.

---

**H6. knip deadcode CEILING 39→28 — 미사용 export 추가 상환**

- **문제**: v13 래칫 달성 시점(39건) 이후 신규 기능 추가로 죽은 export가 누적될 수 있다. v14 구현 과정에서 기존 타입/상수 정리와 병행해 추가 항목을 수거할 기회가 있다.

- **제안**: `npx knip --reporter json` 실행 후 현재 리포트를 기준으로 미사용 타입 정의·상수·utility 함수 중 **안전하게 제거 가능한** 11건 목표로 정리한다(기능 삭제 없이 미사용 export만). 주요 예상 후보:
  - `src/types/research-report.ts:55,64` (eslint-disable no-unused-vars 마킹 → 실제 미사용 타입)
  - `src/types/seminar.ts:172`, `src/types/steppingstone.ts:118`, `src/types/user.ts:221,240,317`
  - `src/lib/bkend.ts:137` (eslint-disable no-unused-vars 마킹 함수)

- **기대효과**: CEILING 39→28 달성, 타입 파일 가독성 향상.
- **예상 파일**:
  - `src/types/research-report.ts`, `src/types/seminar.ts`, `src/types/steppingstone.ts`, `src/types/user.ts`
  - `src/lib/bkend.ts`
  - `scripts/deadcode-baseline.json` (ceiling 수치 갱신)
- **작업 범위**: 타입/함수 삭제 + 참조 grep 확인. 파일 10~15개 점검.

---

### Medium (1~2 스프린트 · 코드 품질·구조)

---

**M1. `console/research/page.tsx` 컴포넌트 분리 — 1,208줄 단일 파일 해체**

- **문제**: `src/app/console/research/page.tsx` 는 1,208줄로 `ConsoleResearchPage`(페이지), `ResearchRow`, `WritingTab`, `ReadingTab`, `ProposalTab`, `DesignTab`, `ReportTab`, `MiniProgress`, `DetailBlock`, `KV`, `ProgressBar`, `FullField`, `ToggleFullButton` 총 13개 컴포넌트와 2개 헬퍼 함수를 한 파일에 포함한다. ESLint 10건의 상당수는 이 거대 파일의 지역 컴포넌트 안에서 발생하는 hook/type 경고다. 파일이 커서 per-file warning 카운트가 높고, PR diff 충돌 위험도 높다.

- **제안**: 독립적인 feature 디렉토리로 분리한다.
  ```
  src/features/console-research/
  ├── ConsoleResearchPage.tsx     (페이지 오케스트레이터, 300줄 이하)
  ├── ResearchRow.tsx             (아코디언 행)
  ├── WritingTab.tsx
  ├── ReadingTab.tsx
  ├── ProposalTab.tsx
  ├── DesignTab.tsx
  ├── ReportTab.tsx
  └── shared.tsx                  (DetailBlock, KV, ProgressBar, FullField, ToggleFullButton)
  ```
  `src/app/console/research/page.tsx` 는 re-export stub으로 교체(`export { default } from "@/features/console-research/ConsoleResearchPage"`).

- **기대효과**: 파일별 ESLint 카운트 분산(파일당 ~2건으로 분산), PR 충돌 위험 감소, 테스트 단위화 용이.
- **예상 파일**:
  - `src/app/console/research/page.tsx` (→ stub으로 교체)
  - `src/features/console-research/` (신규 디렉토리 8개 파일)
- **작업 범위**: 순수 파일 분리. 로직·prop 인터페이스 불변.

---

**M2. recharts `<Cell key={i}>` 배열 인덱스 key — 차트 컴포넌트 전수 수정**

- **문제**: `react/no-array-index-key` — recharts `<Cell>` 에 배열 인덱스를 key로 사용하는 패턴이 `ResearchDashboard.tsx:101,122`, `admin/analytics/page.tsx:540,576` 등에 존재한다. 데이터 순서 변경 시 잘못된 셀에 기존 DOM이 재사용될 수 있다. `key={i}` 패턴 전체로는 139개 파일이 해당하지만 차트 렌더 경로가 가장 위험하다.

- **제안**: 차트 Cell의 key를 데이터 기반으로 교체한다.
  ```tsx
  // Before
  {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
  // After
  {data.map((entry, i) => <Cell key={entry.name ?? i} fill={COLORS[i]} />)}
  ```
  우선순위: `admin/analytics/page.tsx`, `ResearchDashboard.tsx`, 그 외 차트 파일(8개 파일 내외).

- **기대효과**: 차트 Cell key 경고 ~12건 해소, 리렌더 정확성 보장.
- **예상 파일**:
  - `src/app/admin/analytics/page.tsx`
  - `src/features/research/ResearchDashboard.tsx`
  - `src/features/research-analytics/MultiAxisTrend.tsx`
  - `src/features/research-analytics/SubjectDistribution.tsx`
  - `src/features/insights/AdoptionTrendSection.tsx`
- **작업 범위**: 파일당 2~4 라인 수정.

---

**M3. `as unknown as` 타입 단언 — bkend.ts networking API 정리**

- **문제**: `src/lib/bkend.ts` 에 `data as unknown as Record<string, unknown>` 패턴이 **28회** 반복된다(networking, received_business_cards, conference 관련 API 래퍼). 제네릭 `dataApi.create<T>()` 가 `Record<string, unknown>` 을 data 파라미터로 받기 때문에 타입이 넓은 곳으로 강제 단언이 필요한 구조다.

- **제안**: 해당 API 래퍼의 data 파라미터 타입을 `Partial<T> | Record<string, unknown>` 유니언으로 완화하거나, 직접적으로 `dataApi.create<NetworkingEvent>(…)` 에서 data를 typed 방식으로 전달하도록 래퍼 시그니처를 수정한다. 단일 helper `toRecord<T>(data: T): Record<string, unknown>` 를 추출해 단언을 한 곳으로 집중한다.

- **기대효과**: `as unknown as` 28회 → 1회(helper 내부)로 감소, bkend.ts 타입 신뢰성 향상.
- **예상 파일**:
  - `src/lib/bkend.ts` (lines 572~688 networking 섹션, 974~999 card 섹션)
- **작업 범위**: helper 함수 1개 추가 + 호출부 28곳 교체. 런타임 행동 불변.

---

**M4. `@next/next/no-img-element` — Image 컴포넌트 전환 우선순위 배치**

- **문제**: `// eslint-disable-next-line @next/next/no-img-element` 억제가 20개 파일에 있다. `<img>` 직접 사용은 Next.js Image 최적화(lazy load·WebP·srcSet)를 받지 못해 LCP 저하 원인이 된다. v9-H6 성능 계측에서 LCP 개선이 필요하다고 확인되었을 경우 이 전환이 효과적이다.

- **제안**: 자주 노출되는 라우트 우선으로 `<img>` → `<Image>` 전환한다.
  - 1순위(로그인 없이 노출): `src/components/members/MemberCard.tsx`, `src/components/profile/ProfileHeader.tsx`, `src/components/popup/SitePopupModal.tsx`
  - 2순위(학회원 노출): `src/features/card/BusinessCard.tsx`, `src/features/activities/ActivityPage.tsx`, `src/features/activities/ActivityDetail.tsx`
  - `@react-pdf/renderer` 내부 `<Image>`(pdf context)와 `BusinessCardPrintPdfDocument.tsx`는 PDF 전용 컨텍스트로 변환 불가 — 억제 유지 + 주석 이유 추가.

- **기대효과**: LCP 기여 img 6개 → Next Image, 억제 6건 제거.
- **예상 파일**: 위 6개 파일 각 1~5 라인 수정.
- **작업 범위**: `import Image from "next/image"` + width/height 지정 필요 — 동적 크기면 `fill` + `relative` 래퍼.

---

**M5. ESLint warning CEILING 360→290 공식 갱신 — 래칫 수치 낮추기**

- **문제**: H1~H4 + M1~M4 구현 완료 후 실제 warning 수가 290 미만으로 내려가면 CEILING을 낮춰 회귀 차단 수위를 높여야 한다. 현재 `scripts/check-eslint-warning-ratchet.mjs:31` 의 `CEILING = 360` 이 그대로면 290건이 추가 유입될 여지가 열려 있다.

- **제안**: H1~H4 + M1~M4 배포 후 `node scripts/check-eslint-warning-ratchet.mjs` 실행 → 실제 건수 확인 → `CEILING` 을 실제 건수로 낮춘다. 목표 수치: **290** (70건 감소).

- **기대효과**: 래칫 수위 향상, 신규 warning 도입 즉각 차단.
- **예상 파일**: `scripts/check-eslint-warning-ratchet.mjs:31`
- **작업 범위**: 1줄 수정(`const CEILING = 290;`). H1~H4·M1~M4 선행 의존.

---

**M6. `ResearchDashboard` 차트 color — design token 적용 (raw color 잔존 방어)**

- **문제**: `ResearchDashboard.tsx:101` 의 `fill="#3b82f6"`, `fill="#f97316"`, `fill="#6366f1"` 은 raw hex 직접 사용이다. raw color CEILING=1 이 달성되어 있으나 이 파일이 그 "의도적 잔존 1건"이 아닌 경우 회귀다. 확인 후 `var(--color-cat-1)` 등 CSS 변수 또는 `hsl(var(--cat-1))` 형태로 교체한다.

- **제안**:
  1. `gen-rawcolor-baseline.mjs` 재실행으로 현재 raw color 파일 목록 확인.
  2. `ResearchDashboard.tsx` 가 포함되어 있으면 recharts Cell/Bar의 `fill` 을 design token 변수로 교체.
  3. recharts는 CSS 변수를 `fill` prop으로 직접 받지 않으므로 `getComputedStyle(document.documentElement).getPropertyValue("--cat-1")` 래퍼 또는 Tailwind config에서 color 값 직접 임포트.

- **기대효과**: raw color CEILING=1 방어, 다크모드 차트 색상 일관성.
- **예상 파일**: `src/features/research/ResearchDashboard.tsx` (lines 101, 122)
- **작업 범위**: 10 라인 수정.

---

### Low (여유 시 · carryover 성격)

---

**L1. OG·메타태그 커버리지 감사 — v9-L4 carryover (감사형 · S)**

- 대상: `hackathon`·`research/tools`·`steppingstone` 하위 등 v9 이후 신설 라우트.
- 방법: `src/app/**/page.tsx` 에서 `export const metadata` 또는 `generateMetadata` 없는 파일 grep 후 누락 표 산출. 정정은 개별 항목화.
- 예상 파일: `src/app/hackathon/**`, `src/app/mypage/research/tools/**`
- 작업 범위: 감사+리포트(코드 무수정). 정정은 파일당 5~10 라인.

---

**L2. `console/research` 탭 lazy loading — 무거운 Tabs 초기 렌더 최적화 (M)**

- **문제**: `ConsoleResearchPage` 의 펼침 패널(아코디언 `open=true` 시)에서 5개 탭 컨텐츠(WritingTab, ReadingTab, ProposalTab, DesignTab, ReportTab)가 **모두 즉시 렌더**된다. 회원 수 × 5개 탭 렌더는 초기 TTI에 부담이 된다.
- **제안**: M1 분리 완료 후 `next/dynamic` 으로 각 Tab 컴포넌트를 지연 로드한다(`{ ssr: false, loading: () => <Skeleton /> }`).
- 예상 파일: `src/features/console-research/ConsoleResearchPage.tsx` (M1 선행)
- 작업 범위: import 5개 교체 + Skeleton fallback.

---

**L3. 색상 부채 라운드5 — CEILING 1 유지하며 잔존 파일 0 목표 (M)**

- v9-L3 carryover. board·leaderboard·seminars·gatherings 등 잔존 raw color 파일.
- raw color baseline 재실행 후 해당 파일 시맨틱 토큰 배치 교체.
- 예상 파일: `src/app/board/**`, `src/app/leaderboard/**`, `src/features/networking/**`
- 작업 범위: 파일당 10~30 라인 교체. 로직 불변. design-tokens.ts 의도적 잔존 1건 유지.

---

**L4. 단축키 상시 힌트 — v9-L1 carryover (S)**

- 팔레트(`Cmd+K`) 등 이미 구현된 단축키의 툴팁 병기.
- 예상 파일: `src/components/layout/CommandPalette.tsx`, 핵심 액션 버튼 3~5곳.

---

## 4. 즉시 착수 Top 5 (병렬 편성안)

| 순위 | 항목 | 근거 | 파일 트랙 |
|---|---|---|---|
| 1 | **H1 `opts` stable ref** | 34건 즉시 해소, 2파일 독립 | 트랙 A |
| 2 | **H2 analytics 상수 + Cell key** | 10건 해소, 1파일 독립 | 트랙 B |
| 3 | **H3 directory alias 제거** | 11건 해소, 1파일 독립 | 트랙 B |
| 4 | **H4 useMemberMetrics 타입 정비** | 22건 목표, 1파일 + bkend 선택 | 트랙 C |
| 5 | **H6 knip 39→28** | 래칫 수치 달성, 타입 파일 정리 | 트랙 D |

> **병렬 편성 (파일 영역 비중복)**:
> - **트랙 A**: H1 (`features/research`) + M6 (ResearchDashboard color)
> - **트랙 B**: H2 (`admin/analytics`) + H3 (`directory/page`) + M2 (recharts Cell)
> - **트랙 C**: H4 (`features/insights/useMemberMetrics`) + M3 (bkend.ts networking)
> - **트랙 D**: H6 (knip · `types/`) + M5 (CEILING 갱신 · `scripts/`)
> - **순차 의존**: H5(suppress 전환)은 H1~H4 배포 후 실제 경고 파악 뒤 착수. M1(분리)은 독립. M4(Image 전환)는 독립.

---

## 5. 수치 목표 요약

| 지표 | v13 완료 시점 | v14 목표 | 핵심 항목 |
|---|---|---|---|
| ESLint warning | CEILING=360 | **CEILING=290** (70건↓) | H1(34)·H2(10)·H3(11)·H4(22)·M2(12) |
| raw color 파일 | CEILING=1 | **유지** (1 이하) | M6 방어 |
| knip deadcode | CEILING=39 | **CEILING=28** (11건↓) | H6 |
| `as unknown as` 건수 | 40+ (bkend.ts) | **~12** (28건↓) | M3 |
| eslint-disable 억제 | 16건 | **~8건** (8건 정당화·수정) | H5 |

---

## 6. 참고 파일 (절대경로 · 실측 2026-07-21)

- `C:\work\yonsei-edtech\src\features\research\ResearchDashboard.tsx` — `opts` 패턴 L38, useMemo L42~52 → **H1**
- `C:\work\yonsei-edtech\src\features\research\ResearchReportPrint.tsx` — `opts` 패턴 L54, useMemo L68~75 → **H1**
- `C:\work\yonsei-edtech\src\app\admin\analytics\page.tsx` — ROLE_KR/ROLE_COLOR L437~448, Cell key L540·L576 → **H2**
- `C:\work\yonsei-edtech\src\app\directory\page.tsx` — loading 별칭 L167~169, skeleton key L380·L382 → **H3**
- `C:\work\yonsei-edtech\src\features\insights\useMemberMetrics.ts` — 타입 단언 L155~166, isLoading L317 → **H4**
- `C:\work\yonsei-edtech\src\types\research-report.ts:55,64` / `src\types\seminar.ts:172` / `src\types\user.ts:221,240,317` / `src\lib\bkend.ts:137` — eslint-disable no-unused-vars → **H6 후보**
- `C:\work\yonsei-edtech\scripts\check-eslint-warning-ratchet.mjs:31` — `CEILING = 360` → **M5**
- `C:\work\yonsei-edtech\scripts\check-deadcode-ratchet.mjs` / `scripts\deadcode-baseline.json` → **H6**
- `C:\work\yonsei-edtech\src\app\console\research\page.tsx` — 1,208줄 단일 파일 → **M1**
- `C:\work\yonsei-edtech\src\lib\bkend.ts:572~688` — `as unknown as Record<string,unknown>` 28회 → **M3**
