# H4 — 대시보드 위젯 배치 fetch 통합 (v7)

- 작성: executor · 대상: `src/app/dashboard` 렌더 트리 위젯
- 방식: react-query queryKey 통일(공통 커스텀 훅) — Context prop drilling 대공사 없이 캐시 공유로 중복 fetch 제거
- 동작 불변: 화면 결과물·위젯 UI/로직 변경 없음. fetch 계층만 통합.

---

## 1. 실측 — 대시보드 위젯별 useQuery 전수 (기존 상태)

`src/features/dashboard/**` 의 useQuery 를 전수 나열. **이미 이전 라운드(주석 "Phase A queryKey 정리")에서 대부분의 공유 컬렉션은 통일 완료** 상태였다. 아래는 통일된 그룹과, 이번 H4에서 새로 발견한 미통일 중복이다.

### 1-1. 이미 통일된 공유 소스 (재작업 불필요 — 확인만)

| 표준 queryKey | 컬렉션(호출) | 공유 위젯 |
|---|---|---|
| `["activities","all"]` | `activitiesApi` 전체 | MyAcademicActivities·AlumniHomeWidgets·DailyClassTimeline·MyTodos·TodayTodosPopup |
| `["seminars", undefined]` | `seminarsApi`(limit 200) | useSeminars·AlumniHomeWidgets·NextActionBanner·TodaySummaryCard |
| `["my-course-todos", userId]` | `courseTodosApi` | MyTodos·NextActionBanner·TodaySummaryCard·TodayTodosPopup·DailyClassTimeline |
| `["my-enrollments", userId]` | `courseEnrollmentsApi` | DailyClassTimeline·NextActionBanner·TodaySummaryCard·AddTodoDialog |
| `["course-offerings", year, term]` | `courseOfferingsApi` | DailyClassTimeline·NextActionBanner·TodaySummaryCard·AddTodoDialog |
| `["today-flashcards", userId]` | `flashcardsApi` | NextActionBanner·TodayCard |
| `["mentor-stats", userId]` | 멘토 통계 | AlumniHomeWidgets·/mentoring |

### 1-2. **미통일 중복(이번 H4 대상)** — 동일 컬렉션 · 서로 다른 key

**컬렉션: `diagnosticResultsApi.listByUser(userId)`** — 대시보드 1회 진입에 **동일 read 를 4개의 서로 다른 queryKey 로 최대 4중 호출**.

| # | queryKey (기존) | 위젯 | 소비 형태 |
|---|---|---|---|
| 1 | `["dashboard-diagnosis-readiness", userId]` | DiagnosisReadinessWidget | 최신 1건 (`list[0] ?? null`) |
| 2 | `["my-growth-diagnosis", userId]` | MyGrowthWidget | 최신 1건 (`list[0] ?? null`) |
| 3 | `["onboarding-card-diagnosis", userId]` | NewMemberOnboardingCard | 존재 여부 boolean (`list.length > 0`) |
| 4 | `["stage-rec-diagnostics", userId]` | StageRecommendationPanel · NextActionBanner · InactivityCoachingCard · QuickLinks | 전체 배열 |

- key 1·2·3 은 각각 **독립 네트워크 read**. key 4 는 이미 4개 위젯이 공유(1 read).
- 따라서 진단 컬렉션의 **distinct 네트워크 read = 4회** (1+1+1+1).
- `invalidateQueries`/`refetchQueries`/`setQueryData` 로 위 4개 key 를 참조하는 외부 코드 **0건**(전 src grep 확인) → 통일 시 캐시 무효화 동작에 영향 없음. staleTime 은 모든 소비처가 동일하게 5분.

> 나머지 위젯의 개별 useQuery(예: `["dashboard-recent-posts"]`·`["dashboard-networking-events"]`·`["profile-side-*"]`·`["peer-feed",*]` 등)는 **각기 다른 컬렉션**을 부르므로 중복이 아니다 — 통합 대상 아님(과설계 금지).

---

## 2. 통합 방식 (구현)

**공통 커스텀 훅 신설**: `src/features/dashboard/useUserDiagnostics.ts`

- 단일 canonical queryKey `["user-diagnostics", userId]` 로 `diagnosticResultsApi.listByUser` 를 **1회만** 호출.
- 제네릭 `select` 파라미터로 위젯별 필요한 형태를 파생 → 네트워크 read 는 1회, 각 옵저버가 캐시에서 변환:
  - 최신 1건: `useUserDiagnostics<DiagnosticResult | null>(userId, (list) => list[0] ?? null)`
  - boolean: `useUserDiagnostics<boolean>(userId, (list) => list.length > 0)`
  - 전체 배열: `useUserDiagnostics(userId)`
- `staleTime` = 5분(`USER_DIAGNOSTICS_STALE_TIME`)으로 기존과 동일. `enabled: !!userId` 유지.
- `Array.isArray` 가드로 비정상 응답 시 `[]` 반환(기존 소비처 중 배열 캐스팅만 하던 4곳도 안전하게 정규화 — 정상 데이터에선 출력 동일).

7개 소비 위젯을 모두 이 훅으로 교체하고, 사용하지 않게 된 `useQuery`·`diagnosticResultsApi`·`DiagnosticResult` import 를 정리.

---

## 3. 통합 후 쿼리 수 비교

| 항목 | 통합 전 | 통합 후 | 감소 |
|---|---|---|---|
| 진단 컬렉션(`listByUser`) distinct 네트워크 read / 대시보드 진입 | **4** | **1** | **−3** |
| 진단 컬렉션 관련 queryKey 종류 | 4 | 1 | −3 |
| 진단을 읽는 위젯 수(캐시 공유) | 7 (4그룹) | 7 (1그룹) | — |

- 실제 절감량은 렌더된 위젯 조합(레이아웃 가시성)에 따라 다르나, DiagnosisReadiness·MyGrowth·NewMemberOnboardingCard 가 함께 렌더될수록 최대 −3 read.
- 그 외 공유 소스(§1-1)는 이전 라운드에서 이미 통일 완료라 추가 감소 없음.

---

## 4. 수정 파일

- 신규: `src/features/dashboard/useUserDiagnostics.ts`
- 교체(7): `DiagnosisReadinessWidget.tsx` · `MyGrowthWidget.tsx` · `NewMemberOnboardingCard.tsx` · `StageRecommendationPanel.tsx` · `NextActionBanner.tsx` · `InactivityCoachingCard.tsx` · `QuickLinks.tsx`

## 5. 검증

- `npx tsc --noEmit` → src 에러 0
- `npx eslint src --quiet` → 통과(exit 0)
- 색상 라운드3 시맨틱 토큰 className: 미변경(fetch 계층만 수정)
- 금지 영역(onboarding/insights/console/hackathon/cron): 미접촉
