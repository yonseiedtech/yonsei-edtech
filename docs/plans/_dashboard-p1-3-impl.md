# 대시보드 P1-3 구현 기록 (상단 "시선 1순위" 정리 + 2단 그리드 fold 승격)

> 구현일: 2026-07-30 · 근거: `docs/plans/dashboard-improvement-project.md` §1-B·§3(P1-3)·§5
> 선행: `_dashboard-p0-impl.md`(space-y-6 컨테이너 리듬), `_dashboard-p1-impl.md`(CoachingSlot·나의 여정 스트립)
> 범위: 대시보드 영역만(`src/app/dashboard/page.tsx`, `src/features/dashboard/JourneyGreetingHeader.tsx`).
> 규약 유지: 고정 스택 `space-y-6` 컨테이너 소유(개별 마진 없음)·`empty:hidden`·WidgetBoundary·페르소나 게이트·데이터 로직 **일절 무변경**. 순서 재배치 + 그리팅 경량 압축만.
> 검증: tsc + eslint (next build 미실행 — 메인 게이트).

## 변경 파일 (2개)

| 파일 | 변경 |
|------|------|
| `src/app/dashboard/page.tsx` | 고정 상단 스택에서 **나의 여정 스트립(JourneyStepperWidget)을 2단 그리드 아래로** 재배치(그리드 fold 승격). 블록 이동만 — 각 블록의 래퍼(`empty:hidden`·WidgetBoundary)·게이트·데이터 무변경 |
| `src/features/dashboard/JourneyGreetingHeader.tsx` | 외곽 패딩 `p-4 sm:p-5` → `p-3.5 sm:p-4` 경량 압축(세로 여백만 축소, 콘텐츠·CTA·시그니처 전부 보존) |

## 1. 상단 순서 재배치 (블록 리스트 전/후)

고정 상단 `<section space-y-6>` 직속 자식 순서. **신입 온보딩 2종(NewMemberOnboardingCard·FirstStepsMissionCard)** 은 섹션 밖 최상단에 그대로 유지(신입 자동노출, 비신입 self-hide) — 무변경.

### 재배치 전
1. PageHeader
2. JourneyGreetingHeader
3. TodayCard (오늘 할 일)
4. NewcomerProgressWidget (신입, empty:hidden)
5. **JourneyStepperWidget (나의 여정 스트립, empty:hidden)**
6. **2단 그리드** (시간표+CommandCenter / 프로필+ProfileSide+잔디)
7. CoachingSlot (empty:hidden)
8. SemesterKickoffBanner
9. HackathonCtaBanner
10. NewPostsBadge
11. QuickLinks
12. TermBriefHero(+AcademicCalendarProgress)

### 재배치 후
1. PageHeader
2. JourneyGreetingHeader (압축)
3. TodayCard (오늘 할 일)
4. NewcomerProgressWidget (신입, empty:hidden) — **신입 흐름 위치 유지**(TodayCard 직후)
5. **2단 그리드** ← fold 위로 승격(그리팅·오늘할일 직후)
6. **JourneyStepperWidget (나의 여정 스트립)** ← 그리드 아래로 하강
7. CoachingSlot (empty:hidden)
8. SemesterKickoffBanner
9. HackathonCtaBanner
10. NewPostsBadge
11. QuickLinks
12. TermBriefHero(+AcademicCalendarProgress)

### 최소 diff 방식
- 실질 변경은 **블록 5 ↔ 6 스왑 1건**. 더 작은 블록(journey-stepper, 7줄)을 그리드 아래로 이동 — 그리드 블록(≈27줄)은 물리적으로 그대로 두어 diff 최소화.
- 결과: 비신입은 NewcomerProgress가 `empty:hidden`(빈)이라 **그리팅 → TodayCard → 2단 그리드** 가 fold(노트북 ~900px) 안에 위치. 매일 보는 시간표·연구 현황이 접힘선 위로 승격.
- 나의 여정은 이제 48px 스트립(P1-2)이라 그리드 아래로 내려도 발견성 유지 — CoachingSlot·배너·QuickLinks·TermBriefHero 보다는 위에 있어 밀도-발견성 균형.
- **P0/P1 규약 유지**: 이동한 journey-stepper 래퍼는 기존 `<div className="empty:hidden"><WidgetBoundary label="journey-stepper">…` 그대로. 개별 세로 마진 미부여(부모 `space-y-6` 이 24px 리듬 소유). CoachingSlot·그리드 구조 무변경.

## 2. JourneyGreetingHeader 압축 (경량)

- **적용:** 외곽 `<section>` 패딩 `p-4 sm:p-5`(16/20px) → `p-3.5 sm:p-4`(14/16px). 순수 여백 축소로 세로 점유 약 8px 감소.
- **보존:** 리브랜딩 시그니처("지금은 {단계} — {목표}" 그라디언트 문구), 인사·정체성, 논문 진행률/미반영 지도 뱃지, "나의 논문 여정" CTA, 모바일 TodaySummaryCard(inline) **전부 유지**. 시맨틱 토큰/그라디언트/다크모드 무변경.
- **CTA 중복 축소 관련 판단(과감한 삭제 회피):** 그리팅의 "나의 논문 여정" 버튼과 하단 나의 여정 스트립이 여정 진입을 이중 제공하나, CTA 버튼 제거는 콘텐츠 삭제(과감한 변경)에 해당하고 확신이 없어 **보류**. 지침("확신이 없으면 순서 재배치만, 그리팅은 여백 축소 수준")대로 여백 압축만 수행. `stage.goal`(학기 단계 목표)은 TodayCard의 "오늘 할 일"(구체 액션)과 층위가 달라 중복으로 보지 않고 시그니처로 보존.

## 3. "다음 할 일" 중복 정리 — 이번 스킵(문서화)

- 위젯맵의 `NextActionBanner`가 TodayCard와 "다음 액션"을 중복 노출할 수 있으나, page.tsx가 "TodayCard가 액션을 렌더했는지"를 알려면 TodayCard 내부 쿼리(암기카드·이어쓰기·지도노트·모임 RSVP 5종)를 복제해야 함 → **데이터 로직 추가**가 되어 "로직 재작성 금지·데이터 로직 일절 변경 금지" 규약 위반.
- 지침("애매하면 이번엔 건너뛰고 문서화, 과감한 변경 금지")에 따라 **이번 라운드 보류**. NextActionBanner는 기본 가시성/편집모드 대상이라 사용자가 끌 수 있고, TodayCard와 완전 동일 문구는 아니므로 시급도 낮음. 향후 TodayCard가 렌더 여부를 context/prop 으로 상향 노출하는 별도 작업에서 게이트 처리 권장.

## 페르소나·반응형 무회귀 확인 (정적)

- 이동한 journey-stepper 는 `empty:hidden` + 컴포넌트 자체 null 렌더(신입 창엔 양보)로 self-hide — 재배치 후에도 신입/재학/논문/졸업/운영진 각각 동일 게이트 동작.
- NewcomerProgressWidget 은 TodayCard 직후 위치 유지(신입 흐름). 2단 그리드는 `canShowWidget(user.role, "dailyClassTimeline")` 게이트·`items-start`/`lg:sticky` 구조(P0-2) 그대로 이동 없이 유지 — lg 그리드·다크모드·시맨틱 토큰 무회귀.
- 그리팅 패딩만 축소 → 반응형(sm 분기 유지)·다크모드 무영향.

## 검증 결과
- `npx tsc --noEmit` → **0 errors** (TSC_EXIT=0)
- `npx eslint src/app/dashboard/page.tsx src/features/dashboard/JourneyGreetingHeader.tsx` → **0 errors / 0 warnings** (ESLINT_EXIT=0, 래칫 146 미초과)
- `next build` 미실행(메인 게이트 담당).

## 후속
- 런타임 시각 회귀(페르소나 5종 로그인 시 상단 fold 구성·모바일/데스크톱·다크모드·`empty:hidden` 유령 여백 0)는 배포 후 스모크로 눈 확인 필요.
- 미완료: P1-3 항목 3(NextActionBanner↔TodayCard 중복 게이트)은 로직 변경 회피로 보류 — TodayCard 렌더 상태 상향 노출 작업과 함께 후속.
