# 대시보드 P1 구현 기록 (P1-1 코칭 슬롯 + P1-2 나의 여정 스트립/시트)

> 대상 제안서: `docs/plans/dashboard-improvement-project.md` §1-B·§2·§3(P1-1·P1-2)
> 범위: 대시보드 영역만. bkend/types/admin/grad-life/profile 무변경. P0 규약(고정 스택 `space-y-6` 컨테이너 소유, 개별 마진 없음) 유지.
> 검증: tsc + eslint (next build 미실행 — 메인 게이트).

## 변경 파일

| 파일 | 변경 |
|------|------|
| `src/features/dashboard/CoachingSlot.tsx` | **신규** — 코칭/넛지 단일 슬롯 오케스트레이터(P1-1) |
| `src/features/dashboard/JourneyStepperWidget.tsx` | 완주 전 대형 카드 → 1줄 스트립 + 온디맨드 Dialog(P1-2) |
| `src/features/dashboard/WeeklyReturnNudgeCard.tsx` | `onDismiss?` prop 추가(슬롯 제어 시 닫힘 통지) |
| `src/features/dashboard/ThesisCompletionNudgeCard.tsx` | `onDismiss?` prop 추가(동일) |
| `src/app/dashboard/page.tsx` | 흩어진 6개 넛지 마운트 → `<CoachingSlot />` 1개로 대체 + import 정리 |

## P1-1. CoachingSlot — predicate 기반 단일 슬롯

### 방식
- 각 후보를 고정 순서의 `useXxxCandidate()` 훅으로 등록 → `{ active: boolean; node: ReactNode }` 반환. 슬롯은 모든 훅을 **고정 순서로 무조건 호출**(rules-of-hooks 안전) 후, 우선순위 배열에서 **첫 `active` 후보의 `node` 1개만** 렌더. 없으면 null(→ `empty:hidden`).
- node 는 eager 생성(React element)이나 winner 만 커밋되므로 loser 렌더 비용 없음.

### 우선순위(제안서 §3 + WeeklyGoal 예외 반영)
1. **ThesisCompletion**(C2, 이탈 임박) 2. **InactivityCoaching**(M4, 14일 정체) 3. **WeeklyReturnNudge**(C1, 끊기기 직전) 4. **StageRec**(추천) 5. **Kudos**(사회적) 6. **WeeklyGoal**(fallback)

> ★WeeklyGoal 강등 사유: 제안서 §3 본문은 WeeklyGoal 을 4순위로 적었으나, WeeklyGoal 은 로딩 후 두 브랜치(목표 설정/미설정) 모두 항상 렌더 = "항상 true". 4순위에 두면 하위 StageRec·Kudos 가 영구 억제된다. 따라서 §3 지침("항상 렌더라면 최하위 fallback 으로 둔다")대로 **최하위로 강등** — 상위 후보가 없을 때만 노출해 모든 후보의 도달성을 보존.

### 카드별 predicate 추출 방식 (추가 read 0 — 기존에도 6장이 empty:hidden 로 항상 마운트되어 동일 쿼리 실행)
- **C2 ThesisCompletion**: `isThesisStageSemester(getEffectiveSemesterCount(user))` + `!isAlumni` 게이트 → `useGraduationSummary`(졸업요건) + `useGradActivityData`(연구활동 최근성) → `assessThesisRetention(researchDays, graduationMet).phase !== "hidden"` + `!isLoading` + 닫힘 아님. 닫기 스코프(stall=weekKey / completion=done) 카드와 동일 키 재계산.
- **M4 Inactivity**: `useUserDiagnostics` + `useGradActivityData` → `pickInactivityCoaching(activityByDay)` 순수 판정 + `getMemberStage !== "newcomer"`.
- **C1 WeeklyReturn**: `daysSinceJoinKst`(비신입) + `!isAlumni` + `useGradActivityData(scoresByDay)` + `frozenWeekSet(parseFreezes(...))` → `assessWeeklyReturnRisk(...).atRisk` + `!isLoading` + 닫힘 아님(주차 스코프).
- **StageRec**: `user.thesisJourneyStage` 오버라이드 또는 `getEffectiveSemesterCount` 로 `JOURNEY_STAGES` 스테이지 산출 → `stage != null`(순수, 쿼리 불요).
- **Kudos**: `useCohortPeers` → `useCohortKudos`(kudosTargets) + `useReceivedKudos`(thisWeekCount) → 받은 응원 또는 보낼 대상 존재.
- **WeeklyGoal**: fallback — `!!user`(로딩 게이트는 카드가 자체 null 처리).

순수 판정/데이터 훅은 카드가 쓰는 것과 **동일 함수·동일 쿼리 키**를 재사용. winner 카드가 렌더될 때 predicate 와 카드가 같은 훅을 2번 호출하나 React Query 가 동일 키로 dedupe → 네트워크 read 증가 없음. Date 직접 호출 없음(카드와 동일하게 순수 유틸 default 인자 위임 + useMemo) → purity 래칫 보호.

### 닫기 → 다음 후보 승계 (C1/C2)
- 카드의 X 버튼 `handleDismiss` 가 기존 localStorage 기록 + 내부 override 에 더해 `onSlotDismiss?.()` 호출. 슬롯의 candidate 훅이 `useState` override 를 세워 즉시 `active=false` → 슬롯이 다음 우선순위 넛지로 넘어감(같은 탭 즉시성 확보 — storage 이벤트는 동일 탭 미발화라 override 필요). 다음 세션엔 predicate 의 `useLocalBoolean` 이 localStorage 를 읽어 계속 숨김.
- M4/StageRec/Kudos/WeeklyGoal 은 닫기 없음(데이터로 자동 숨김) → predicate 는 순수 데이터 판정.

### page.tsx 배치
- 2단 그리드 직후에 `<div className="empty:hidden"><WidgetBoundary label="coaching-slot"><CoachingSlot /></WidgetBoundary></div>` 1개. 기존 6개 마운트(inactivity/weekly-goal/weekly-return/thesis-completion/kudos + 하단 StageRec) 전부 제거. 개별 마진 없음 → 부모 `space-y-6` 리듬 유지. StageRec 은 하단에서 슬롯 후보로 흡수(중복 제거).

## P1-2. JourneyStepperWidget — 스트립 + 온디맨드 시트

- **데이터·판정 무변경**: steps/doneCount/total/allDone/nextStep/pct/deepeningCtas 전부 그대로 재사용. `useState(open)` 만 추가(모든 hooks 이후·early return 이전 — rules-of-hooks 안전).
- **완주 전(비-allDone)**: 고정 스택엔 `<button>` 1줄 스트립(아이콘 + "나의 여정 n/total" + 얇은 진행바 + 데스크톱에서 "다음: {cta}", ≈48px)만 상주. 클릭 시 `open=true`.
  - a11y: 스트립은 `<button aria-expanded aria-controls="journey-stepper-sheet">` + 서술형 `aria-label`(진행/다음단계). 미니 진행바는 `aria-hidden`(장식), 의미 있는 `role="progressbar"`(aria-valuenow=pct)는 시트 내부에 유지.
- **시트/모달**: 기존 `@/components/ui/dialog`(Base UI Dialog — Sheet 부재로 Dialog 재사용, 신규 의존 없음) 사용. 모바일은 DialogContent 가 `inset-x-0 top-0 bottom-0`(전체화면 시트형), 데스크톱은 중앙 모달(`sm:max-w-md`). 포커스 트랩은 프리미티브 기본. 상세 4단계 리스트 + 다음 CTA(현행 표현 그대로 이동), 미완 스텝/CTA 링크 클릭 시 `setOpen(false)`.
- **완주자(allDone)**: 현행 "여정 완주 🎉" WidgetCard 분기 **그대로 유지**(밀도 최소, 스트립/시트 미적용).
- SSR-safe, Date 순수성 유지(신규 Date 호출 없음).

## 검증 결과
- `npx tsc --noEmit` → **0 errors**.
- `npx eslint CoachingSlot.tsx JourneyStepperWidget.tsx WeeklyReturnNudgeCard.tsx ThesisCompletionNudgeCard.tsx page.tsx` → **0 errors / 0 warnings**(래칫 146 미초과 — 신규 경고 없음).
- `next build` 미실행(메인 게이트 담당).

### 회귀 주의(구현 반영)
- 6종 개별 조건은 슬롯 predicate 에서 카드와 동일하게 유지 → 동시 2개 이상 노출 불가(항상 ≤1).
- 넛지 닫으면(C1/C2) 그 자리에 하위 우선순위 넛지가 자연 승계.
- 나의 여정 스트립↔시트 펼침/닫힘, 완주 분기 정상.
