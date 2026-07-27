# 연세교육공학회 서비스 고도화 백로그 v18 — "위젯 격리 확산 · 크래시 근원 봉합 · 측정→환류" (2026-07-27)

> 작성: 수석 서비스 플래너 (코드 실측 기반 · 채팅 인터뷰 없음)
> 대상: yonsei-edtech (Next.js 16 + Firestore + react-query, LIVE https://yonsei-edtech.vercel.app)
> 실측 일자: 2026-07-27 (v17 전량 LIVE + /mypage 크래시 핫픽스 직후)
> 직전 완료: v17 High H1~H4 · Medium M1/M2/M4/M6 · Low L1~L3 전량 LIVE. 핫픽스(마이페이지 크래시 근본수정 + `WidgetBoundary` 도입 + 런타임 크래시 스윕 12곳 가드 + exhaustive-deps 3건 수정) 완료.

---

## 0. 재제안 금지선 · 기술 부채 게이트 (실측 갱신값)

### 0-1. 기술 부채 래칫 (2026-07-27 실측)

| 지표 | 현재 CEILING | 스크립트 | v17 대비 |
|---|---|---|---|
| ESLint warning | **148** | `scripts/check-eslint-warning-ratchet.mjs:36` (`const CEILING = 148`) | 212→148 (v17-H4 + 핫픽스 149→148). **v17 목표(170) 초과 달성** |
| raw color 파일 | **1** (`design-tokens.ts` 만 허용) | `scripts/check-rawcolor-ratchet.mjs` | 유지 — **추가 여지 없음 확정**(잔여 hex 569건/70파일은 PDF·canvas·차트·OG·이메일 등 Tailwind 스코프 밖) |
| knip deadcode | **9** (`scripts/deadcode-baseline.json:2`) | `scripts/check-deadcode-ratchet.mjs` | 13→9 (v17-M1 완료). **잔여 9건 전부 X3 알림정책 blocked**(§외부 의존) |

> 배포 게이트: 세 래칫 전량 PASS + `tsc` + `build`(prebuild=rawcolor+warning ratchet) + 배포 후 QA 스모크(운영진 홈·수요조사 탭·러닝가이드 서재/뷰어·마이페이지·진단 결과·**+대시보드·세미나 목록/상세·/staff 홈**). 배포는 `npm run deploy:vercel`(토큰). 신규 기능은 **DB/rules 무변경 우선** · 시맨틱 토큰(`var(--color-*)`/`text-*`/`bg-primary` 등)만 · **신규 eslint 경고 0**.

### 0-2. v17 완료 + 핫픽스로 간주 (재제안 금지)

- **운영진 모임 일정조율**(H1·`NetworkingPoll` internal 재사용) · **연결 KPI 대시보드**(H2·Weave KPI) · **여정 완주 스텝퍼**(H3·`JourneyStepperWidget`) · **ESLint 212→148**(H4+핫픽스) · **deadcode 13→9**(M1) · **리마인더 cron 관제**(M2) · **완독→활동 전환**(M4) · **수요조사 학기 회고 골격**(M6) · **img→Image·논문여정·a11y**(L1~L3) — 전량 LIVE.
- **핫픽스(2026-07-27)**:
  - **/mypage 크래시 근본수정** — 레거시 진단문서 `weakConceptIds` 필드 누락→`undefined.length` TypeError→`mypage/error.tsx` 라우트 경계 트립→페이지 전체 붕괴(SSR 200/클라만). 옵셔널 가드 + 신규 `WidgetBoundary`(class ErrorBoundary).
  - **`WidgetBoundary` overview 전량 적용 완료** — `MyPageView.tsx`가 이미 **10개 개인 위젯 전부 래핑**(thesis-journey·thesis-progress·graduation-checklist·diagnostic-readiness·learning-effect·reading-research-loop·defense-practice-trend·continue-reading·demand-interest). **→ /mypage overview 격리는 완결. 재제안 금지.**
  - **런타임 크래시 스윕 12곳 가드 완료**(`_attendeeids-crash-guard-2026-07-27.md`) — `Seminar.attendeeIds` High6·Medium5·`ResearchQuestionItem.researchMethodIds` Low1 **전량 점가드 반영**. `_runtime-crash-sweep`의 H-1~L-1 개별 지점은 **모두 수정 완료. 재제안 금지.**
  - **exhaustive-deps 3건 수정 완료** — H1 `WritingPaperEditor` Ctrl+S(`handleSaveRef` ref패턴, `WritingPaperEditor.tsx:962-976,1193-1194`) · H2 hackathon 폼(`app/console/hackathon/page.tsx:444` deps에 `selConf?.contextId` 추가) · M1 가이드 진도. **재제안 금지.**

### 0-3. v17 이월 (v18 재배치)

- **v17-L1 img→Image 잔여** → v18 **L1** (미완 재측정)
- **v17-L2 논문 여정 진행률 시각화** → v18 **L2**
- **v17-M3 세미나·스터디 출석 관리** → **X5 외부 의존 유지**(§5, 신규 컬렉션·데이터 정책 결정 대기)
- **8~10월 이벤트 데이터 도래 항목** → §6 데이터 대기 유지

---

## 1. v18 핵심 명제

> 핫픽스는 `/mypage` 한 페이지를 구했다. 그러나 실측하면 **같은 구조적 취약점이 서비스 전역에 남아 있다.**
>
> **(1) 위젯 격리가 /mypage 에만 있다.** `WidgetBoundary`(class ErrorBoundary)는 도입됐지만 **`src` 전체에서 `MyPageView.tsx` 단 하나만 사용**(grep 검증: `ErrorBoundary` 정의체 1파일, 사용처 1파일). `/dashboard`(약 20개 위젯·`DraggableWidget` 래핑구조)·`/staff`(홈 5위젯)·`/console`(insights·cron 관제 위젯)은 **위젯 격리가 전혀 없어**, 위젯 하나가 throw 하면 `/mypage`가 겪던 "페이지 전체 붕괴"를 그대로 반복한다. 특히 **`/staff`는 `error.tsx` 라우트 경계조차 없어**(전 19개 `error.tsx` 목록에 부재) 위젯 throw가 **root `app/error.tsx`로 폴백 = 앱 셸 전체가 대체**된다(가장 심각).
>
> **(2) 크래시 근원이 봉합되지 않고 점가드로만 막혀 있다.** 12곳 `?? []` 가드는 *현재 알려진* 지점만 막는다. 근원은 `useSeminars`/`useSeminar`(`useSeminar.ts:23,42`)가 `res.data as unknown as Seminar[]`로 **무가공 반환**한다는 것 — 타입은 필수 배열을 약속하지만 런타임 레거시 문서엔 없다. **새 컴포넌트가 가드를 잊는 순간 재발**하는 구조다. 읽기 경계 1곳에 정규화 계층(`normalizeSeminar()`)을 넣으면 클래스 전체가 봉합된다(`archive-normalize.ts` 선례 존재).
>
> **(3) v17이 심은 측정(Weave KPI)이 개인 단위에 머물러 환류가 약하다.** `JourneyStepperWidget`은 개인의 여정 단계를 판정하지만, 운영진이 **"코호트가 어느 단계에서 이탈하는가"**를 보는 집계 표면이 없다. 순수 읽기 집계로 완주 퍼널을 표면화하면 다음 콘텐츠·넛지 기획 근거가 감(感)에서 데이터로 넘어간다.
>
> v18의 각도를 **"위젯 격리 확산(Isolate) · 크래시 근원 봉합(Normalize) · 측정→환류(Feedback)"**로 잡는다. **핵심은 이미 만든 자산(`WidgetBoundary`·`JourneyStepperWidget`·정규화 선례)의 확산/봉합이며, 전 항목 DB/rules 무변경·외부 의존 없음.**

### 1-1. v18 실측 갭 (2026-07-27 기준)

| # | 렌즈 | 실측된 갭 | 근거(파일) |
|---|---|---|---|
| ① | **위젯 격리 /mypage 한정** | `WidgetBoundary` 사용처가 `MyPageView.tsx` 단 하나(grep: `ErrorBoundary` 정의 1·사용 1). `/dashboard`의 위젯은 `DraggableWidget`으로만 감싸지나 이는 편집모드 UI일 뿐(비편집시 `return <>{children}</>` 투명) 격리 아님 | `components/ui/widget-boundary.tsx` · `app/dashboard/page.tsx:278-441` · `features/dashboard/editing/DraggableWidget.tsx:56-58` |
| ② | **/staff 라우트 경계 부재** | 전 19개 `error.tsx` 목록에 `app/staff/error.tsx` **없음** → StaffHomeTab 위젯 throw가 root `app/error.tsx`(앱 셸 전체)로 폴백. 게다가 `staff/page.tsx`는 `"use client"` 중복(1행·3행) | `app/staff/page.tsx:1,3` · `features/staff/StaffHomeTab.tsx`(5위젯: 팀 진척·처리 대기·개설 대기 수요·내 할당 업무·고정 공지) |
| ③ | **크래시 근원 미봉합(점가드만)** | `useSeminars`가 `res.data as unknown as Seminar[]` 무가공 반환. 12곳 `?? []`는 알려진 지점만 방어 → 신규 코드가 가드 누락 시 재발. 정규화 선례(`archive-normalize.ts`) 있으나 세미나 미적용. `syncAttendeeIds`(`useSeminar.ts:6`) 존재=필드 드리프트 실재 | `features/seminar/useSeminar.ts:22-24,40-42` · `lib/archive-normalize.ts`(선례) |
| ④ | **필수배열 결손 클래스 미전수** | attendeeIds·researchMethodIds·creditRules/milestones는 수정됐으나, 타입상 required 이나 런타임 결손 가능한 **다른 배열 필드**(activities.participants·flashcard decks·comm_board 등)는 미감사 | `_runtime-crash-sweep-2026-07-27.md`(attendeeIds/graduation만 커버) |
| ⑤ | **여정 측정 개인 단위 한정** | `JourneyStepperWidget`이 개인 단계만 판정. 운영진용 코호트 완주 퍼널(단계별 도달 수·이탈 지점) 부재 → 콘텐츠/넛지 기획이 감에 의존 | `features/dashboard/JourneyStepperWidget.tsx` · `app/console/insights/**`(Weave KPI 이웃) |
| ⑥ | **WidgetBoundary 폴백 UX 무음** | 현재 폴백 기본 `null`(조용히 숨김). 데이터 구동 개인 위젯이 무음 소실되면 회원이 "왜 안 보이지" 인지 못함 | `components/ui/widget-boundary.tsx:18,43` |
| ⑦ | **ESLint 상위 규칙 잔존** | 148로 낮췄으나 신학기 대량 커밋 전 추가 상환 없으면 재상승. `no-explicit-any`·`no-array-index-key`·비-mount-once 억제 잔존 | `check-eslint-warning-ratchet.mjs:36` |
| ⑧ | **deadcode 9건 전부 알림계열** | baseline 9건이 전부 `notify.ts`·`useNotifications.ts`·`push.ts`·`emailLogsApi`·`notify-timing.ts` export → X3 알림정책 확정 전 삭제 불가(보존이 정답). **deadcode 감축은 X3 blocked** | `deadcode-baseline.json:9-64` |
| ⑨ | **img→Image 잔여(LCP)** | v17-L1 이월 미완 재측정 | `@next/next/no-img-element` 억제 잔존 파일 |
| ⑩ | **논문 여정 시각화 미착수** | v17-L2 이월 | `features/steppingstone/**` |

---

## 2. 고도화 백로그 (v18 · 13항목)

---

### High (즉시 착수 · 회복탄력성 직결 · 외부 의존 없음)

---

**H1. `/dashboard` 위젯 격리 확산 — `WidgetBoundary` 적용 (갭① · ★핵심)**
- **문제/기회**: `/dashboard`는 `error.tsx`가 있으나(라우트 경계) 위젯 단위 격리가 없다. 위젯 하나(예: `JourneyStepperWidget`·`MyGrowthWidget`·`StaffPriorityPanel`)가 레거시 데이터로 render 중 throw 하면 대시보드 전체가 `error.tsx` 폴백으로 대체된다 — `/mypage`가 핫픽스 전 겪던 것과 동일 구조. `DraggableWidget`은 편집모드 UI일 뿐(비편집 시 `return <>{children}</>` 투명)이라 격리가 아니다.
- **개선안**:
  1. **단일 삽입점 활용**: `DraggableWidget`의 비편집 반환(`:56-58`)을 `<WidgetBoundary label={widgetKey}>{children}</WidgetBoundary>`로 감싸면 `widgetMap`의 모든 위젯이 한 번에 격리된다(편집모드 경로도 본문 `:138-140`을 래핑). `DraggableWidget`은 모든 대시보드 위젯의 공통 래퍼이므로 삽입점 1곳으로 대부분 커버.
  2. **widgetMap 밖 직접 렌더 위젯 개별 래핑**: `NewcomerProgressWidget`(`:584`)·`JourneyStepperWidget`(`:590`)·`DailyClassTimelineWidget`·`ProfileSummaryCard`/`ProfileSideWidget`·`InactivityCoachingCard`(`:626`)·`WeeklyGoalCard`(`:632`)·`KudosWidget`(`:638`)·`StageRecommendationPanel`(`:658`)·`AcademicCalendarProgress`(`:669`)·`StaffPriorityPanel`(`:678`) 등 `DraggableWidget`을 안 거치는 위젯은 `app/dashboard/page.tsx`에서 개별 `<WidgetBoundary>` 래핑.
  3. 폴백은 기본 null(대시보드 위젯은 없어도 페이지 성립) — 단, H1과 짝지어 M4(폴백 UX)에서 핵심 위젯만 미니 폴백.
- **영향 파일**: `src/features/dashboard/editing/DraggableWidget.tsx`(공통 삽입) · `src/app/dashboard/page.tsx`(직접 렌더 위젯 래핑) · (재사용, 무변경) `src/components/ui/widget-boundary.tsx`
- **제약**: DB/rules 무변경 · 시맨틱 토큰 무관 · 신규 eslint 경고 0 · 편집모드 드래그/토글 회귀 없음(래핑이 dnd-kit 구조 위/아래 어디 들어가는지 주의 — 본문 `z-[2]` div 안쪽 권장)
- **검증**: 특정 위젯에 의도적 `throw` 주입 → 그 위젯 자리만 사라지고 나머지 위젯·헤더·편집모드 정상 · 편집모드 드래그/순서변경/표시토글 회귀 없음 · `tsc`·eslint 0
- **복잡도**: **S~M**

---

**H2. `/staff` 이중 격리 — 라우트 경계 신규 + 위젯 격리 (갭② · ★가장 심각)**
- **문제/기회**: `/staff`는 `app/staff/error.tsx`가 **없다**(전 19개 error.tsx 목록에 부재). 따라서 `StaffHomeTab`의 위젯(팀 진척·처리 대기·개설 대기 수요·내 할당 업무·고정 공지) 중 하나가 throw 하면 **root `app/error.tsx`로 폴백 = 앱 셸(헤더·네비 포함) 전체가 대체**된다 — 격리 최악. 각 위젯은 `useStaffReviewQueue`·`useOpeningDemands` 등 데이터를 fetch 하므로 레거시 결손 시 크래시 후보.
- **개선안**:
  1. `src/app/staff/error.tsx` 신규 — `mypage/error.tsx` 패턴 그대로(`SectionError sectionLabel="운영진 페이지"`). 최소한 붕괴 범위를 `/staff` 서브트리로 축소.
  2. `StaffHomeTab.tsx`의 5개 섹션을 각각 `<WidgetBoundary label="staff-*">` 래핑(팀 진척·처리 대기·개설 대기 수요·내 할당 업무·고정 공지). 위젯 하나가 죽어도 나머지 운영진 홈은 생존.
  3. 부수 정리: `app/staff/page.tsx`의 `"use client"` 중복 선언(`:1`,`:3`) 1줄 제거.
- **영향 파일**: `src/app/staff/error.tsx`(신규) · `src/features/staff/StaffHomeTab.tsx` · `src/app/staff/page.tsx`(중복 지시자 제거)
- **제약**: DB/rules 무변경 · 시맨틱 토큰만 · 신규 eslint 경고 0 · 기존 5탭 네비 회귀 없음
- **검증**: StaffHomeTab 한 섹션 의도적 throw → 그 섹션만 폴백·나머지 홈+탭 생존 · `/staff/error.tsx` 존재로 붕괴 시 앱 셸 유지 · 중복 지시자 제거 후 빌드 정상
- **복잡도**: **S**

---

**H3. 세미나 읽기 정규화 계층 — 크래시 근원 봉합 (갭③ · 12점가드의 구조적 대체)**
- **문제/기회**: 크래시 스윕 12곳은 *알려진* 지점만 `?? []`로 막았다. 근원은 `useSeminars`(`useSeminar.ts:22-24`)·`useSeminar`(`:40-42`)가 `res.data as unknown as Seminar[]`로 **무가공 반환** — 타입은 필수 배열을 약속하나 런타임 레거시 문서엔 없다. **새 컴포넌트가 `seminar.attendeeIds`를 가드 없이 쓰는 순간 재발**한다(회귀 취약). `archive-normalize.ts`라는 정규화 선례가 이미 있고, `syncAttendeeIds`(`useSeminar.ts:6`)의 존재 자체가 필드 드리프트가 실재함을 시사한다.
- **개선안**:
  1. `src/lib/seminar-normalize.ts` 신규 — `normalizeSeminar(raw): Seminar`가 `attendeeIds: raw.attendeeIds ?? []`, 기타 필수 배열(`sessionIds` 등 타입 확인 후) 기본값 보장. 순수함수·부작용 없음.
  2. `useSeminars` list 반환·`useSeminar` detail 반환에서 `all.map(normalizeSeminar)` / `normalizeSeminar(res)` 적용 — 읽기 경계 **1~2곳**에서 클래스 전체 봉합.
  3. 12곳 점가드는 **유지**(방어 심층 defense-in-depth) — 제거하지 않는다(다른 fetch 경로·SSR·직접 API 호출 대비).
  4. 정규화 대상 필드는 `types/index.ts`의 `Seminar` 정의를 읽어 **타입상 required array 전수** 반영(추측 금지, 타입 기준).
- **영향 파일**: `src/lib/seminar-normalize.ts`(신규) · `src/features/seminar/useSeminar.ts`(정규화 삽입) · (참조) `src/types`의 `Seminar` 정의
- **제약**: DB/rules 무변경(읽기 측 정규화) · 순수함수 · 기존 데이터 회귀 없음(있는 필드는 그대로 통과) · 신규 eslint 경고 0
- **검증**: 레거시 세미나(필드 결손) 시드 문서로 `/seminars` 목록·`/seminars/[id]` 상세·`/dashboard` 무붕괴 · 정상 세미나 회귀 없음(count·명단 동일) · `tsc` 0
- **복잡도**: **M**

---

**H4. ESLint warning 148→120 추가 상환 (갭⑦ · 기술부채)**
- **문제**: 148로 낮췄으나(v17 목표 170 초과 달성) 신학기 대량 커밋 전 추가 상환 없으면 재상승. 상위 집중 규칙(`@typescript-eslint/no-explicit-any`·`react/no-array-index-key`·비-mount-once exhaustive-deps 억제)이 누적 위험.
- **개선안**: `npx eslint --format json` 파일별 분류 → 상위 10개 집중. 목록형 key 안정화(고유 id)·`any`→구체 타입·불필요 억제 주석 제거. 기능 무변경 리팩터. exhaustive-deps는 v17에서 High/Med 이미 수정됐으므로 **잔여는 audit의 Low(안전) 분류 확인만**(무분별 deps 추가 금지).
- **영향 파일**: ESLint 결과 상위 파일(착수 시 재측정 — 여러 기능 영역 분산이라 병렬 가능)
- **제약**: 기능 무변경 · CEILING 148→120 갱신(`gen-eslint-warning-baseline` 재실행) · 시맨틱 토큰 무관
- **검증**: `npm run lint` 경고 ≤120 · ratchet PASS · `tsc`·`build` 통과
- **복잡도**: **M**

---

### Medium (1~2 스프린트 · 격리 심화·측정 환류·품질)

---

**M1. `/console` 위젯 격리 (갭① 확장)**
- **문제**: `/console`은 `error.tsx`가 있으나 insights(Weave KPI·retention·adoption 스냅샷)·cron 관제(v17 M2) 등 **데이터 구동 위젯이 다수** 모인 페이지라 한 위젯 throw 시 콘솔 전체 붕괴. 운영진 도구가 통째로 죽으면 운영 마비.
- **개선안**: `console/insights` 및 콘솔 홈의 데이터 위젯을 `WidgetBoundary`로 개별 래핑. H1의 대시보드 패턴 재사용(공통 래퍼가 있으면 그것에, 없으면 위젯별).
- **영향 파일**: `src/app/console/insights/**` · 콘솔 홈 위젯 렌더 지점
- **제약**: DB/rules 무변경 · 운영진 전용 · 시맨틱 토큰만 · eslint 0
- **검증**: insights 위젯 하나 throw 시 그 위젯만 폴백·나머지 콘솔 생존
- **복잡도**: **S~M**

---

**M2. 필수배열 Firestore 필드 회귀 감사 (갭④ · 크래시 스윕 후속)**
- **문제**: attendeeIds·researchMethodIds·creditRules/milestones는 수정됐으나, **같은 클래스의 다른 배열 필드**(타입상 required 이나 런타임 결손 가능)는 미전수 감사. 예: `activities`의 participants/likes, flashcard decks의 카드 배열, comm_board answers, 진단 결과의 다른 배열 필드.
- **개선안**: `types/` 전반에서 `xxx: SomeType[]`(required, non-optional) 배열 필드 목록화 → 각 필드가 render 경로에서 `.length`/`.map`/`.includes` 무가드 접근되는지 grep 스윕(`_runtime-crash-sweep` 방법 재사용) → High(전 회원 render 경로)만 우선 가드/정규화. **전량 수정 아님 — render 경로 무가드만.** 결과를 `docs/plans/_required-array-audit-v18.md`로 저장.
- **영향 파일**: 감사 후 확정(분산) · 감사 산출물 문서
- **제약**: 점가드 또는 H3식 정규화 · 기능 무변경 · 추측 금지(타입+grep 증거 기반)
- **검증**: 발견 High 지점 결손 시드로 무붕괴 확인 · 정상 데이터 회귀 없음
- **복잡도**: **M**

---

**M3. 회원 여정 완주율 코호트 퍼널 (갭⑤ · 측정→환류 · v17 H3와 짝)**
- **문제**: v17 `JourneyStepperWidget`은 **개인의** 여정 단계(가입/프로필→진단→가이드→활동)만 판정한다. 운영진이 "코호트가 어느 단계에서 이탈하는가"를 보는 집계 표면이 없어, 다음 콘텐츠·넛지 기획이 감에 의존한다.
- **개선안**: `console/insights`(Weave KPI 이웃)에 "여정 완주 퍼널" 패널 — 4단계 각 도달 회원 수·전 단계 대비 전환율·최대 이탈 단계 하이라이트. 판정 소스는 `JourneyStepperWidget`의 개인 판정 로직을 **집계로 재사용**(profiles approved·diagnostics 존재·`guide_progress` 존재·participants/likes 존재) — 순수 읽기, **신규 컬렉션·cron·외부 의존 없음**. 표본 미달 시 "데이터 부족" 레이블(H2 Weave 패턴 준수).
- **영향 파일**: `src/app/console/insights/**`(신규 패널 또는 Weave 확장) · `features/dashboard/JourneyStepperWidget.tsx`의 단계 판정 헬퍼 추출·읽기 재사용 · profiles/diagnostics/guide_progress/activities 조회 재사용
- **제약**: DB/rules 무변경(읽기 집계) · 운영진 전용 · 시맨틱 색 뱃지(양호/주의)만 · eslint 0
- **검증**: 실제 회원 데이터로 각 단계 수·전환율 정확 · 최대 이탈 단계 표시 · 표본 0에서 "데이터 부족" 안전 표시 · 개인 스텝퍼(v17 H3)와 단계 정의 일치
- **복잡도**: **M**

---

**M4. `WidgetBoundary` 폴백 UX 개선 — 핵심 위젯 미니 폴백 (갭⑥ · H1/H2와 짝)**
- **문제**: 현재 `WidgetBoundary` 폴백 기본 `null`(조용히 숨김). 데이터 구동 개인 위젯(진단 준비도·학습효과 등)이 무음 소실되면 회원이 "왜 안 보이지" 인지 못하고, 운영진도 발생을 놓친다(`componentDidCatch`의 `console.error`는 사용자 미노출).
- **개선안**: `WidgetBoundary`에 이미 있는 `fallback` prop을 활용해 **선택된 핵심 위젯만** "일시적으로 불러오지 못했어요 · 새로고침" 미니 폴백 카드 제공(공용 `SectionError` 소형 변형 또는 경량 노드). 무음 유지가 나은 보조 위젯(kudos·peer feed 등)은 기본 null 유지. 남용 금지 — 여정/진단/학습 등 리텐션 핵심만.
- **영향 파일**: `src/components/ui/widget-boundary.tsx`(변경 없이 prop 활용) · 핵심 위젯 래핑 지점(H1/H2 산출물)에 `fallback` 전달 · (선택) 경량 폴백 컴포넌트
- **제약**: 시맨틱 토큰만 · 라이트/다크 스모크 · a11y(aria) · eslint 0
- **검증**: 핵심 위젯 throw 시 미니 폴백+재시도 노출·클릭 시 리마운트 · 보조 위젯은 무음 유지
- **복잡도**: **S**

---

**M5. exhaustive-deps 잔여 안전 재확인 + 신규 유입 차단 (갭⑦ 보강 · 품질)**
- **문제**: v17에서 High2·Med1 수정 완료. audit의 Low 43건은 "의도적 안전"으로 분류됐으나, H4 리팩터 중 새 억제 주석이 유입되면 재발 위험. 지속 감시 표면이 없다.
- **개선안**: (a) audit Low 43건 중 mount-once/폼동기화가 **아닌** 것 재확인(스팟체크). (b) 향후 신규 `eslint-disable ... exhaustive-deps` 유입을 막기 위해 H4 상환 시 **억제 주석 총량을 ratchet 후보로 검토**(과도하면 별도 스크립트 없이 코드리뷰 규율로). 전량 수정 아님.
- **영향 파일**: audit 대상 스팟 · (선택) 리뷰 규율 문서화
- **제약**: 각 건 런타임 검증 필수(무분별 deps 추가 금지) · 기능 무변경
- **검증**: 재확인한 effect의 리페치/상태 동작 눈확인 · 회귀 없음
- **복잡도**: **S**

---

### Low (여유 시 · 경량 개선)

---

**L1. img→Image 잔여 전환 (갭⑨ · v17-L1 승계 · LCP)**
- `@next/next/no-img-element` 억제 잔여 파일 재측정 → 고빈도 노출(히어로·카드 썸네일) 우선 `next/image` 전환. PDF·data URL 컨텍스트는 억제 유지+사유 주석.
- **영향 파일**: 착수 시 `eslint --rule` 재측정 대상 · **복잡도 M**

---

**L2. 논문 여정 진행률 시각화 (갭⑩ · v17-L2 승계)**
- 마이페이지 논문 여정 4단계(계획서→설계→작성→보고서) 퍼널 진행률 바 + 현재 위치 강조. v17 H3 여정 스텝퍼·M3 코호트 퍼널과 시각 일관. `ThesisJourneyProgress`(이미 존재·무혐의 검증됨)와 중복 회피 — 강화/재사용.
- **영향 파일**: `src/features/steppingstone/**` · `src/app/mypage/research/**` · **복잡도 S~M**

---

**L3. 접근성 스윕 — WidgetBoundary 확산 위젯 + 폴백 (품질)**
- H1~H2·M3~M4 신규/변경 표면 a11y 점검(대비·aria-label·키보드·터치타깃 44px). M4 미니 폴백 카드에 `role="status"`·재시도 버튼 포커스. 색만으로 상태 구분하는 뱃지에 텍스트/아이콘 병기(M3 퍼널 뱃지).
- **영향 파일**: H1~M4 산출 위젯 · **복잡도 S**

---

## 3. 즉시 착수 Top 5 (병렬 편성안 · 파일 영역 비중복)

| 트랙 | 항목 | 파일 영역 | 착수 |
|---|---|---|---|
| **트랙 A** | **H1** /dashboard 위젯 격리 | `features/dashboard/editing/DraggableWidget.tsx` · `app/dashboard/page.tsx` | 즉시 (핵심) |
| **트랙 B** | **H2** /staff 이중 격리 | `app/staff/error.tsx`(신규) · `features/staff/StaffHomeTab.tsx` · `app/staff/page.tsx` | 즉시 (A와 독립 영역) |
| **트랙 C** | **H3** 세미나 정규화 계층 | `lib/seminar-normalize.ts`(신규) · `features/seminar/useSeminar.ts` | 즉시 (A·B와 독립) |
| **트랙 D** | **H4** ESLint 148→120 | ESLint 상위 파일(기능 영역 분산) | 즉시 (독립 리팩터) |
| **트랙 E** | **M3** 여정 완주 코호트 퍼널 | `app/console/insights/**` · `JourneyStepperWidget` 판정 헬퍼 읽기 | 즉시 (A~D와 독립) |

> **병렬 규칙:**
> - **A·B·C·E는 파일 영역 완전 분리** → 동시 launch 안전. D(ESLint)는 분산 리팩터라 다른 트랙과 파일이 겹치면 **해당 파일만 순차**(D는 마지막 병합 권장).
> - **M1(/console 격리)은 H1 완료 후 착수** — H1이 확립한 위젯 래핑 패턴(공통 래퍼 vs 개별)을 재사용하고, M3(트랙 E)와 `console/insights` 파일이 겹치므로 **E 완료 후 M1**.
> - **M4(폴백 UX)는 H1·H2 완료 후** — 두 트랙이 만든 래핑 지점에 `fallback` prop을 얹는 후속 작업.
> - **M2(필수배열 감사)는 H3 완료 후** — 세미나 정규화 패턴을 다른 타입에 확장 적용하는 흐름이 자연스럽다.
> - **배포 게이트**: `tsc`·`build`·rawcolor(≤1)·ESLint ratchet(≤120 갱신 시)·deadcode ratchet(≤9 유지) 전량 PASS + QA 스모크(운영진 홈·수요조사·러닝가이드·마이페이지·진단 결과·**+대시보드(위젯 격리)·세미나 목록/상세·/staff 홈**). **의도적 throw 위젯 주입 테스트**로 격리를 눈으로 확인(H1·H2·M1 공통).
> - **rules 변경**: v18 전 항목 **rules 무변경**(격리·정규화·읽기 집계뿐). M3 신규 컬렉션 없음.

---

## 4. 수치 목표 요약

| 지표 | 현재(2026-07-27) | v18 목표 | 핵심 항목 |
|---|---|---|---|
| WidgetBoundary 커버리지 | `/mypage` overview 10위젯만 | **+`/dashboard`(~20)·`/staff`(5)·`/console`** | H1·H2·M1 |
| `/staff` 라우트 경계 | 부재(root 폴백=앱 셸 전체) | **`staff/error.tsx` 신설** | H2 |
| 크래시 근원 봉합 | 12곳 점가드(회귀 취약) | **읽기 경계 정규화 계층 1곳** | H3 |
| 필수배열 결손 클래스 | attendeeIds/graduation만 감사 | **타입 전수 render경로 감사** | M2 |
| 여정 측정 | 개인 단위(스텝퍼) | **운영진 코호트 완주 퍼널** | M3 |
| 위젯 폴백 UX | 무음 null | **핵심 위젯 미니 폴백+재시도** | M4 |
| ESLint warning | CEILING=148 | **CEILING=120** (28건↓) | H4 |
| raw color 파일 | CEILING=1 | **유지(≤1)** | — |
| knip deadcode | CEILING=9 | **유지(≤9, X3 blocked)** | §5 |

---

## 5. 외부 의존 (운영진 결정 필요 — 별도 트랙)

| 항목 | 의존 대상 | 코드 연결 |
|---|---|---|
| **X5: 세미나/스터디 회차 출석 관리**(신규 컬렉션 여부) | 운영진·데이터모델 판단 | v17-M3 이월. 옵셔널 필드 우선 or 정식 컬렉션(rules 설계·architect 협업). 결정 전 미착수 |
| **X2: 연결 클릭 이벤트 로깅 도입 여부** | 운영진 데이터 정책(개인정보·저장량) | Weave KPI/코호트 퍼널 정밀 전환율(진단→가이드 실클릭)은 경량 로깅 필요. 미도입 시 M3는 상태 도달 집계만으로 시작 |
| **X3: 알림 채널 정책**(push/email quiet-hours·수신자) | 운영진 알림 정책 | **deadcode 9건(notify·push·email export) 안전삭제 blocked** — 정책 확정 전 보존이 정답. 결정 시 deadcode 9→목표 재산정 |
| **X4: 신학기 수요조사·일정조율 캠페인** | 운영진 콘텐츠 발행 | v17 H1 일정조율·발견성 진입점 코드 준비됨 |
| **X1: 러닝가이드 신규 콘텐츠 발행** | 운영진 콘텐츠 저작·검수 | CMS 준비됨 — Weave 측정·완독 전환 품질은 발행 수에 비례 |
| **X6: Firestore 정기 백업 GCP 스케줄** | GCP 설정 | 장기 carryover(v15~이월) |

---

## 6. 데이터 대기 항목 (도래 시 전환)

| 항목 | 의존 데이터 | 재평가 시점 |
|---|---|---|
| **cron 임계경보 값**(v17 M2 경보선) | 리마인더 cron 성공률/발송량 2개월 분포 | 8월 초 |
| **web_vitals 목표선**(v15-M4 이월) | 라우트별 p75 2개월 누적 | 8월 초 |
| **kudos 리더보드**(v15-M5 이월) | 해커톤·개강 kudos N≥50 | 9월 이후 |
| **여정 완주율 벤치마크**(M3 튜닝) | 신학기 신입 코호트 여정 데이터 | 9월 개강 후 |
| **수요조사 학기 회고 실데이터**(v17 M6) | 한 학기 수요·개설 사이클 완료 | 학기 경계(9월/2월) |
| **해커톤 회고 집계**(v15-L3 이월) | 8/22 행사 실데이터 | 8/22 이후 |

---

## 7. 진행 로그

- **2026-07-27 v18 기획 생성**: v17 전량 LIVE + 핫픽스(마이페이지 크래시·WidgetBoundary·크래시 스윕 12곳·exhaustive-deps 3건) 완료 상태에서 실측. 핵심 갭 = 위젯 격리가 `/mypage`에만 존재(grep 검증: `WidgetBoundary`/`ErrorBoundary` 사용처 1파일) · `/staff` 라우트 경계 부재 · 세미나 읽기 무정규화(`useSeminar.ts:22-24,40-42`) · 여정 측정 개인 단위 한정.
- **다음 재검토**: H1~H4 병렬 배포 완료 후 + 8월 이벤트 데이터 도래 시 planner 재소환(v19). X3(알림정책) 결정 시 deadcode 목표 재산정.

---

*파일: `docs/plans/service-enhancement-plan-v18.md` | 생성: 2026-07-27 | 근거: `_runtime-crash-sweep-2026-07-27.md` · `_mypage-load-error-debug.md` · `_exhaustive-deps-audit-2026-07-27.md` · `_attendeeids-crash-guard-2026-07-27.md` · `service-enhancement-plan-v17.md` + `src/` 실측*
