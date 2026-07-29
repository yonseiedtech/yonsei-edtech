# 대시보드(/dashboard) 개선 프로젝트 제안서

> 상태: **분석·제안 (읽기 전용)** · 구현은 사용자 승인 후 별도 진행
> 대상: `src/app/dashboard/page.tsx` + `src/features/dashboard/*` + `src/lib/dashboard-*`
> 작성 관점: UX (정보위계·인지부하·레이아웃 리듬·정렬)
> 전제: **기존 인프라(편집모드·프리셋·가시성 게이트·시맨틱 토큰·WidgetCard) 재사용**, 신규 대형 시스템 지양

---

## 0. 한 줄 요약

로그인 직후 화면은 **레이아웃 시스템(widgetMap)이 다이어트된 것과 무관하게**, 그 위에 있는 **"고정 상단 스택"이 무한정 비대해져** 인지 부하의 실제 원인이 되고 있다. 고정 스택에는 사용자가 끌 수 없는 **넛지·코칭 카드 6종**이 세로로 나열되고, 블록마다 `mt-6`/`mb-6`/`mb-4`/무마진이 섞여 **세로 리듬이 들쭉날쭉**하며, 상단 2단 그리드는 **컬럼 내부 잔여 마진(CommandCenter `mb-6`)** 때문에 하단 라인이 어긋난다. 해결의 축은 (1) 넛지 슬롯 단일화, (2) 세로 리듬 토큰 규약, (3) 그리드 정렬 구조 교정, (4) "나의 여정"의 밀도-발견성 재배치다.

---

## 1. 현황 진단

### 1-A. 위젯 인벤토리 — 화면은 두 개의 서로 다른 시스템으로 구성됨

대시보드는 실제로 **두 층위**로 나뉜다. 이 구분이 문제 진단의 핵심이다.

**① 고정 상단 스택 (`<section>` 내부, 레이아웃 시스템 밖 — 사용자가 끌 수 없음)**

| # | 블록 | 노출 조건 | 항상 렌더? |
|---|------|-----------|-----------|
| 1 | NewMemberOnboardingCard | 신입·미완료 | 자동 숨김 |
| 2 | FirstStepsMissionCard (B1) | 가입 7일·미완료 | 자동 숨김 |
| 3 | PageHeader (인사 + 버튼 4개 + 역할뱃지) | 항상 | **O** |
| 4 | JourneyGreetingHeader | 항상 | **O** |
| 5 | TodayCard | 액션 있을 때 | 자동 숨김 |
| 6 | NewcomerProgressWidget | 신입 14일 | 자동 숨김 |
| 7 | **JourneyStepperWidget (나의 여정)** | 비신입 | **O** (완주 전) |
| 8 | **2단 그리드** (시간표+CommandCenter / 프로필+사이드+잔디) | 재학생 | **O** |
| 9 | InactivityCoachingCard | 14일 정체 | 자동 숨김 |
| 10 | WeeklyGoalCard | 항상(설정 유무 분기) | **O** |
| 11 | WeeklyReturnNudgeCard (C1) | 끊기기 직전 | 자동 숨김 |
| 12 | ThesisCompletionNudgeCard (C2) | 논문단계 정체 | 자동 숨김 |
| 13 | KudosWidget | 응원 유무 | 자동 숨김 |
| 14 | SemesterKickoffBanner | 개강 D-7~D+14 | 자동 숨김 |
| 15 | HackathonCtaBanner | 행사 전 | 자동 숨김 |
| 16 | NewPostsBadge | 새 글 有 | 자동 숨김 |
| 17 | QuickLinks (타일 6개) | 항상 | **O** |
| 18 | StageRecommendationPanel | 학기 설정자 | 자동 숨김 |
| 19 | TermBriefHero + AcademicCalendarProgress | 재학생 | **O** |

**② 레이아웃 시스템 (widgetMap · 사용자 편집/프리셋/가시성 대상)**
`myTodos · notices · recentPosts · statCards · myAcademicActivities · comprehensiveExam · dailyReflection · aiForumLive · spacedRepetition · peerActivityFeed · diagnosisReadiness · myGrowth · thesisProgress · semesterCalendar` (기본 노출 8종으로 다이어트 완료) → 이후 seminars + ActivityFeed.

> **★핵심 진단:** `DEFAULT_VISIBLE_WIDGETS`(14→8) 다이어트와 신입 minimal 프리셋은 **오직 ② 시스템만** 축소했다. 그러나 첫인상 과밀의 실제 주범은 **① 고정 스택**이다. ①은 성장 백로그가 누적되며(B1·C1·C2·kudos·weekly-goal·inactivity·stage-rec…) **6개의 코칭/넛지 카드**가 세로로 쌓였고, **사용자가 하나도 끌 수 없다.** 다이어트 노력이 정작 과밀 원인을 비껴간 구조다.

### 1-B. 정보위계·밀도 문제

- **"무엇을 먼저 보나"가 3중 중복된다.** 상단에서 `JourneyGreetingHeader`(인사·여정) → `TodayCard`(오늘 액션) → `JourneyStepperWidget`(여정 단계) → `NextActionBanner`(다음 액션, ②) → `StageRecommendationPanel`(추천 한 걸음)이 **모두 "다음에 뭘 하라"**를 각기 다른 카드로 반복한다. 시선의 1순위가 분산된다.
- **넛지 동시 발화.** InactivityCoaching·WeeklyGoal·WeeklyReturnNudge·ThesisCompletionNudge·Kudos·StageRec는 각기 `empty:hidden`으로 자동 숨지만, 조건이 겹치면 **2~3개가 동시에** 세로로 쌓인다. 각 카드가 독립적으로 "나를 봐"라고 경쟁 → 넛지의 총량이 늘수록 개별 넛지의 설득력은 떨어진다(넛지 피로).
- **above-the-fold 추정** (노트북 ~900px): 접힘선 위에는 사실상 PageHeader + JourneyGreetingHeader + TodayCard 상단 일부만 보인다. **정작 매일 봐야 할 2단 그리드(시간표·연구 현황)는 접힘선 아래로 밀린다.** 인사/여정성 카드가 fold를 독점.

### 1-C. 레이아웃·간격·정렬 문제

**(1) 세로 리듬 불일치 (사용자 이슈 #2)**
고정 스택 블록들이 간격 방향을 제각기 쓴다:
- `mt-6 mb-5`(그리팅), 무마진(TodayCard), `mt-6`(newcomer/journey), `mt-6 mb-6`(그리드), `mb-6`×6(넛지들), `mb-4`(kickoff 내부), **무마진(HackathonCtaBanner)**, `mb-4`(NewPostsBadge 내부), `mb-6`(QuickLinks), `mb-6`(stage-rec).
- **구체 증상 (사용자 지적):** `HackathonCtaBanner`는 루트에 마진이 **전혀 없다**(`flex items-center gap-3 rounded-xl …`). 그 아래 `QuickLinks`는 `<div className="mb-6">`로 **bottom** 마진만 갖는다. → **해커톤 배너와 QuickLinks 사이 상단 간격 = 0px.** 반면 다른 구간은 `mb-6 + mt-6`가 겹쳐 최대 48px까지 벌어진다. `mt`와 `mb`를 혼용하고 일부 블록은 아예 마진이 없어, `empty:hidden` 붕괴까지 겹치면 **0~48px 편차**가 발생.
- **이미 있으나 안 쓰는 자산:** `design-tokens.ts`에 `WIDGET_GAP = "mt-5"` 토큰이 존재하지만 고정 스택은 이를 쓰지 않는다.

**(2) 하단 수평 정렬 불일치 (사용자 이슈 #3)**
```
<div className="mt-6 mb-6 grid items-stretch gap-4 lg:grid-cols-[1fr_336px]">
  <div className="flex min-w-0 flex-col gap-5">
    <DailyClassTimelineWidget /><DashboardCommandCenter />   ← 좌
  </div>
  <div className="flex flex-col gap-4">
    <ProfileSummaryCard/><ProfileSideWidget/>
    <div className="flex flex-1 flex-col [&>*]:flex-1"><LearningStreak compact/></div>  ← 우
  </div>
</div>
```
- **원인 ①(결정적):** `DashboardCommandCenter`가 **자체적으로 최상위 `<div className="mb-6">`**를 갖는다(컴포넌트 내부 line 146). 좌측 컬럼의 마지막 요소인데 24px 잔여 하단 마진을 만들어, `items-stretch`로 높이를 맞춰도 **콘텐츠 하단 라인이 24px 어긋난다.**
- **원인 ②(구조적):** `items-stretch`는 두 컬럼의 **박스 높이**만 같게 만든다. 우측은 `flex-1 [&>*]:flex-1`로 잔디를 늘려 하단을 채우지만, **좌측에는 늘어나는 filler가 없다.** 좌측 콘텐츠(시간표+CommandCenter)가 우측보다 짧으면 좌측 박스는 늘어나도 내부 콘텐츠는 자연 높이에 머물러 **하단에 빈 공간**이 남는다. 두 컬럼의 자연 높이가 데이터에 따라 매번 달라지므로 **어느 쪽이 길지 예측 불가** → 하단 정렬은 근본적으로 취약한 목표.

**(3) "나의 여정" 상시 카드의 밀도 비용 (사용자 이슈 #4)**
`JourneyStepperWidget`은 완주 전까지 **항상** 렌더(진행바 + 4단계 리스트 + 다음 CTA 버튼 ≈ 세로 220~260px)되며, 상단 fold 근처의 큰 면적을 상시 점유한다. 리텐션 넛지로서 발견성은 좋으나 밀도 비용이 크다.

---

## 2. 개선 원칙 (설계 기준)

1. **정보위계 단일화:** fold 안에 "지금 할 일" 시선 1순위를 **하나만** 둔다. 여정·추천·오늘 액션의 3중 중복을 1개 주도 + 나머지 종속으로 정리.
2. **점진적 공개(Progressive disclosure):** 요약(1줄) → 필요 시 펼침(sheet/모달). 상시 노출 총량을 줄이되 정보는 없애지 않는다.
3. **넛지 단일 슬롯:** 여러 코칭/넛지 카드를 동시에 쌓지 않는다. **우선순위 오케스트레이터**가 시점당 **최대 1개**만 노출.
4. **일관 리듬:** 고정 스택 전 구간에 **단일 세로 간격 토큰**을 적용(방향 혼용 금지). 마진은 개별 블록이 아니라 **컨테이너가 소유**.
5. **페르소나 우선:** 신입/재학연구/논문단계/졸업/운영진별로 상단에 **다른 것**이 보이도록 기존 가시성·프리셋 재사용.

---

## 3. 개선 백로그 (우선순위 P0 / P1 / P2)

### P0 — 즉시형 저위험 (간격·정렬 2건, 시각 회귀 위험 낮음)

#### P0-1. 세로 리듬 통일 (사용자 이슈 #2)
- **문제:** 고정 스택이 `mt`/`mb`/무마진 혼용 → 0~48px 편차, 해커톤 배너↔QuickLinks 간격 0px.
- **해결안:** 고정 스택의 개별 블록 마진을 제거하고 **부모 `<section>`에 `space-y-6`(또는 토큰화한 `DASHBOARD_STACK_GAP`)을 부여**해 컨테이너가 리듬을 소유. `empty:hidden`은 유지(빈 블록은 `space-y`에서도 갭을 만들지 않으므로 유령 여백 없음). PageHeader처럼 내부 요소는 예외 관리.
  - 구체: `mt-6 mb-5`, `mb-6`×N, 무마진(HackathonCtaBanner), `mb-4`(내부 배너) → 전부 컨테이너 `space-y-6`로 수렴. 배너 컴포넌트 내부의 `mb-4`/무마진도 제거(래퍼가 간격 담당).
  - 토큰: `design-tokens.ts`에 `DASHBOARD_STACK_GAP = "space-y-6"` 신설(또는 기존 `WIDGET_GAP` 정책과 정합) → 값 한 곳에서 관리.
- **기대효과:** 전 구간 균일 24px 리듬. 해커톤 배너↔QuickLinks 포함 모든 인접 간격 일관.
- **난이도:** **S** (마진 제거 + 컨테이너 1곳)
- **영향:** `src/app/dashboard/page.tsx`(섹션 래퍼), `HackathonCtaBanner`·`SemesterKickoffBanner`·`NewPostsBadge`(내부 마진 제거), `src/lib/design-tokens.ts`

#### P0-2. 2단 그리드 하단 정렬 교정 (사용자 이슈 #3)
- **문제:** CommandCenter 자체 `mb-6` 잔여 마진 + 좌측 filler 부재로 하단 라인 어긋남.
- **해결안 (2단계):**
  1. **`DashboardCommandCenter` 최상위 `mb-6` 제거** — 이 컴포넌트는 이제 그리드/스택 컨테이너 안에서만 쓰이므로 자기 마진을 갖지 않아야 한다(간격은 부모 `gap`/`space-y`가 소유). 이 한 줄이 정렬 어긋남의 직접 원인.
  2. **하단 강제 정렬 목표를 완화**: `items-stretch` + 우측만 `flex-1`로 억지 정렬하는 대신, 좌측 컬럼 마지막 요소(CommandCenter)에도 `mt-auto` 또는 좌측 컨테이너에 `justify-between`을 주어 **양쪽 모두 하단을 채우게** 하거나 — 더 견고하게는 **하단 정렬 목표 자체를 포기하고 `items-start`로 자연 높이 병치**(우측 사이드바는 `lg:sticky lg:top-20`으로 승격). 권장: **후자**(자연 높이 + sticky 사이드바). 억지 stretch는 데이터 변동에 취약.
- **기대효과:** CommandCenter 하단과 우측 잔디 하단이 일치하거나(옵션1), 애초에 정렬 불일치가 시각적으로 문제되지 않는 자연 병치(옵션2·권장).
- **난이도:** **S**(옵션1: 마진 제거+`mt-auto`) ~ **M**(옵션2: sticky 사이드바 전환)
- **영향:** `DashboardCommandCenter.tsx`(line 146 `mb-6`), `dashboard/page.tsx`(그리드 컨테이너)

---

### P1 — 정보밀도 재편 · 나의 여정 팝업 (첫인상 과밀 핵심 해소)

#### P1-1. 넛지/코칭 단일 슬롯 오케스트레이터 (★최고 레버리지)
- **문제:** InactivityCoaching·WeeklyGoal·WeeklyReturnNudge·ThesisCompletionNudge·Kudos·StageRec 6종이 고정 스택에 개별 나열, 동시 2~3개 발화 → 첫인상 과밀의 실제 주범이자 사용자가 끌 수 없음.
- **해결안:** 6종을 **`<CoachingSlot>` 단일 컨테이너**로 감싸고, **우선순위 규칙으로 시점당 최대 1개**만 렌더. 각 카드는 지금처럼 자기 조건에서 노드/`null`을 반환하되, 슬롯이 "가장 우선순위 높은 non-null 1개"만 선택.
  - 우선순위(예): ThesisCompletion(이탈 임박) > InactivityCoaching(14일 정체) > WeeklyReturnNudge(끊기기 직전) > WeeklyGoal(능동 목표) > StageRec(추천) > Kudos(사회적). 페르소나·긴급도 기반.
  - **기존 인프라 재사용:** 컴포넌트·판정 로직 무변경, 상위에서 "선택"만 추가. 신규 대형 시스템 아님.
- **기대효과:** 고정 스택 세로 길이 대폭 축소, 넛지 피로 해소, 시점당 "가장 중요한 다음 행동" 1개로 시선 집중.
- **난이도:** **M**
- **영향:** `dashboard/page.tsx`, 신규 얇은 `CoachingSlot`(컴포넌트 6종은 그대로 자식으로)

#### P1-2. "나의 여정" 팝업/접힘 재배치 (사용자 이슈 #4)
- **권장안: 상시 "요약 스트립" + 온디맨드 바텀시트(모바일)/팝오버(데스크톱)**
  - 고정 스택에는 **1줄 스트립**만 상주: `나의 여정 2/4 · 다음: 3분 진단하기 →` (진행바 얇게 + 다음 CTA). 세로 ~48px.
  - 스트립 탭 시 **바텀시트(모바일)/팝오버·모달(데스크톱)**로 4단계 전체 스텝퍼 펼침. 완주자는 스트립을 작은 축하 뱃지로 축소하거나 숨김(현행 allDone 분기 재사용).
- **근거(밀도 vs 발견성 트레이드오프):**
  - **가장 가치 있는 정보는 "진행률 + 다음 한 걸음" 1줄**이다. 이것만 상시 노출하면 발견성·넛지력은 보존되고, 4단계 상세(220px)는 밀도에서 제거된다 → progressive disclosure의 교과서적 적용.
  - 넛지 도구의 생명은 "반복 노출"이다. 완전 팝업(최초 1회/버튼)에 숨기면 미완료자가 다시 안 볼 위험 → 넛지력 상실.
- **대안 비교:**
  | 안 | 발견성 | 밀도 | 넛지 지속성 | 방해도 | 평가 |
  |----|--------|------|-------------|--------|------|
  | A. 최초 1회 모달 | 1회만 高 | 최상 | 낮음(one-shot) | 높음(진입 차단) | ✗ |
  | B. 헤더 버튼 트리거 모달 | 버튼 인지 의존(中) | 최상 | 낮음 | 낮음 | △ |
  | **C. 요약 스트립→시트(권장)** | **높음(1줄 상시)** | **높음** | **높음** | **없음** | **✓** |
  | D. 현행 상시 대형 카드 | 최상 | 낮음 | 최상 | 없음 | 밀도 비용 큼 |
- **난이도:** **M** (기존 스텝 데이터·판정 재사용, 표현만 스트립+시트로 분리. Radix/shadcn Dialog·Sheet 기존 사용 여부에 맞춤)
- **영향:** `JourneyStepperWidget.tsx`(요약/상세 분리), `dashboard/page.tsx`

#### P1-3. 고정 스택 상단 "시선 1순위" 정리 (정보위계)
- **문제:** GreetingHeader·TodayCard·JourneyStepper·NextActionBanner·StageRec가 "다음 할 일"을 3~5중 반복.
- **해결안:**
  - **TodayCard를 상단 유일한 "오늘의 액션" 주도 카드로** 지정(액션 있을 때). `NextActionBanner`(②)·`StageRecommendationPanel`은 TodayCard가 액션을 렌더할 때 종속(중복 회피 게이트) 또는 P1-1 코칭 슬롯으로 흡수.
  - `JourneyGreetingHeader`는 인사·정체성만(액션 CTA 최소화), 여정 진척은 P1-2 스트립이 담당하도록 역할 분리.
  - **2단 그리드를 fold 안으로 끌어올림**: 매일 보는 시간표·연구 현황이 인사/여정 카드보다 위 또는 동등 높이에 오도록 순서 조정(그리팅 압축).
- **기대효과:** fold 안 시선 1순위 단일화, "먼저 볼 것" 명확화.
- **난이도:** **M**
- **영향:** `dashboard/page.tsx`(상단 순서·게이트), `TodayCard`/`NextActionBanner` 중복 게이트

#### P1-4. 고정 넛지의 사용자 제어권 부여 (선택)
- **문제:** 고정 스택 넛지는 편집모드·프리셋 대상이 아니라 **끌 수 없다.**
- **해결안:** P1-1 CoachingSlot을 **레이아웃 시스템의 단일 키(예 `coachingSlot`)로 편입** → 기존 편집모드 토글·프리셋으로 on/off. `DASHBOARD_WIDGET_KEYS`에 1개 키만 추가(개별 6키 아님) → 마이그레이션 부담 최소(getSortedWidgets 자동 보충 로직 재사용).
- **난이도:** **M**
- **영향:** `types/dashboard-layout.ts`(키 1개), `widgetMap`, `dashboard-presets.ts`

---

### P2 — 심화 (구조·페르소나 고도화)

#### P2-1. 페르소나별 상단 프리셋 자동 적용 확장
- 현재 신입에게만 `minimal` 자동 적용(가입 30일). 이를 **재학연구/논문단계/졸업/운영진**까지 확장해, 최초 진입 시 페르소나 프리셋으로 상단 구성을 차등화. `getUserPersona`·`getMemberStage`·`buildPresetLayout` 재사용. (기존 프리셋 5종을 페르소나에 매핑.)
- **난이도:** **M** · **영향:** `dashboard/page.tsx`(프리셋 자동적용 훅), `dashboard-presets.ts`

#### P2-2. 고정 스택 → 레이아웃 시스템 통합 정리(부채 상환)
- 장기적으로 고정 스택의 개인화 대상 블록들을 widgetMap 체계로 흡수해 "두 시스템" 이원화를 해소. 데이터 의존(seminars/ActivityFeed)만 인라인 유지. 큰 리팩터이므로 P0·P1 안정화 후.
- **난이도:** **L** · **영향:** `dashboard/page.tsx` 전반, `dashboard-layout.ts`

#### P2-3. above-the-fold 계측
- 실제 뷰포트별 fold 위치·스크롤 도달률을 간이 계측(기존 분석 이벤트 재사용)해 P1 재편 효과를 검증. 데이터 기반 후속 튜닝.
- **난이도:** **M**

---

## 4. 정보밀도 재편안 — 페르소나별 상단 구성(유지/접기/숨김/통합)

> 원칙: **상단 유지 = 매일 보는 것 + 지금 할 일 1개.** 나머지는 접기(스트립/슬롯)·기본숨김·통합. 기존 `canShowWidget`·`getUserPersona`·`DEFAULT_VISIBLE_WIDGETS`·프리셋 재사용.

| 블록 | 신입(newcomer) | 재학·연구(grad) | 논문단계 | 졸업(alumni) | 운영진(staff) |
|------|----------------|-----------------|----------|--------------|----------------|
| PageHeader | 유지(간소) | 유지 | 유지 | 유지 | 유지 + 콘솔 |
| GreetingHeader | 유지 | 유지(압축) | 유지(압축) | 유지(압축) | 압축 |
| TodayCard(오늘 액션) | 유지 | **상단 유지(주도)** | 유지(주도) | 액션시 | 유지 |
| 나의 여정 | Newcomer가 대체 | **스트립(P1-2)** | 스트립 | 축약 스트립 | 스트립 |
| 2단 그리드(시간표/연구) | 유지 | **fold로 승격** | 승격 | 시간표 숨김→프로필 폴백 | 유지 |
| 코칭/넛지 6종 | Newcomer 흐름 우선 | **슬롯 1개(P1-1)** | 슬롯(논문 넛지 우선) | 슬롯(활동 넛지) | 슬롯 최소 |
| StageRec/NextAction | 통합→TodayCard | TodayCard/슬롯로 통합 | 통합 | 숨김 | 통합 |
| QuickLinks | 신입 링크셋 | 연구 링크셋 | 연구 링크셋 | 졸업 링크셋 | 운영 포함 |
| TermBriefHero | 유지 | 유지 | 유지 | **숨김**(alumni) | 유지 |
| ②widgetMap(notices/recentPosts…) | minimal(3) | 기본 8 | research 프리셋 | alumni 위젯 | staff 프리셋 |

**재사용 매핑:** `newcomer→minimal`, `grad→default(8)`, `논문단계→research`, `alumni→(학사 위젯 canShowWidget=false로 자동 숨김)+AlumniHomeWidgets`, `staff→staff` 프리셋. 신규 정책 파일 없이 기존 프리셋에 페르소나만 연결.

---

## 5. 표준 간격/정렬 규약 (구현 시 참조)

### 5-A. 세로 리듬 토큰
- **규칙:** 고정 스택의 **인접 블록 간 세로 간격은 컨테이너가 소유**한다. 개별 블록에 `mt-*`/`mb-*`를 붙이지 않는다.
- **토큰:** `DASHBOARD_STACK_GAP = "space-y-6"` (24px). 서브 그룹(밀접 관련 카드)만 `space-y-4`. `design-tokens.ts`에 정의, `WIDGET_GAP`(mt-5)과 정책 정합.
- **배너 컴포넌트:** 내부 `mb-4`/무마진 제거 → 래퍼가 간격 담당. `empty:hidden` 유지(빈 블록은 `space-y` 갭 미생성).

### 5-B. 컬럼 정렬
- **권장:** 2단 그리드는 **`items-start` + 자연 높이**, 우측을 `lg:sticky lg:top-20` 사이드바로. 억지 `items-stretch` 지양.
- **stretch 유지 시:** 좌·우 **양쪽 모두** 마지막 요소에 filler(`mt-auto` 또는 컨테이너 `justify-between`)를 두어야 하단이 맞는다. **자식 컴포넌트 자체 마진(CommandCenter `mb-6`) 금지** — 컨테이너 gap만 간격을 소유.
- **컨테이너 gap:** 좌측 내부 `gap-5`, 우측 내부 `gap-4` 혼용 → **동일 값(`gap-4`)으로 통일** 권장.

---

## 6. 단계적 실행 순서 (승인 후)

1. **P0-1 + P0-2** (S, 저위험): 세로 리듬 토큰화 + CommandCenter `mb-6` 제거 + 그리드 정렬 교정. 시각 회귀만 확인하면 즉시 배포 가능.
2. **P1-2**: 나의 여정 → 요약 스트립 + 시트. 밀도 체감 개선 즉효.
3. **P1-1**: 코칭 슬롯 오케스트레이터. 첫인상 과밀 핵심 해소.
4. **P1-3**: 상단 시선 1순위 정리 + 그리드 fold 승격.
5. **P1-4**(선택): 코칭 슬롯을 레이아웃 키로 편입(사용자 제어).
6. **P2**: 페르소나 프리셋 확장 → 이원 시스템 통합 → fold 계측.

> 전 과정 **기존 컴포넌트·시맨틱 토큰·WidgetCard·가시성 게이트·프리셋 재사용**, 신규 대형 기능 없음. 각 단계는 독립 배포 가능하도록 분리.

---

## 7. 검증 관점 (구현 후 확인 항목)

- 페르소나 5종(신입/재학/논문/졸업/운영진) 각각 로그인 시 상단 구성이 의도대로 차등화되는가.
- 넛지 조건 2~3개 동시 충족 시 **슬롯에 1개만** 노출되는가(우선순위 순).
- 인접 블록 간격이 전 구간 24px 균일한가(해커톤 배너↔QuickLinks 포함).
- 2단 그리드 좌/우 하단 라인(또는 자연 병치)이 데이터 변동(시간표 유무·잔디 밀도)에도 어긋나지 않는가.
- "나의 여정" 스트립 → 시트 펼침/닫힘, 완주자 축소가 정상 동작하는가.
- 모바일/데스크톱 반응형·다크모드·`empty:hidden` 유령 여백 0 확인.
