# C1 — 주간 재방문 리듬 & 복귀 넛지 (in-app 전용) 구현 노트

> 근거: `docs/plans/service-enhancement-plan-v19-acquisition.md` §C1 (P0, in-app 무의존)
> 범위: in-app 넛지 전용. 이메일/푸시는 범위 밖(⚠️X3 알림정책 blocked).
> 검증: `npx tsc --noEmit` = 0 errors · `npx eslint <변경 3파일>` = 0 errors / 0 warnings.

## 변경 파일

| 파일 | 종류 | 내용 |
|---|---|---|
| `src/lib/weekly-return.ts` | 신규(순수 유틸) | `assessWeeklyReturnRisk()` — 잔디 집계에서 "이번 주 리듬 위험" 파생 판정 |
| `src/features/dashboard/WeeklyReturnNudgeCard.tsx` | 신규(위젯) | 위험 시 부드러운 복귀 넛지 1건 렌더, 아니면 null |
| `src/app/dashboard/page.tsx` | 편집(+2줄 import·+블록) | WeeklyGoalCard 인접에 `empty:hidden` + `WidgetBoundary` 로 마운트 |

## 기존 위젯과의 역할 구분 (중복 아님 — 최우선 분석 결과)

C1의 고유 각도는 **"이번 주(current week) 재방문 리듬이 끊기기 직전인 예방 구간"**이다.
대시보드의 유사 위젯 전부를 정독해 각자 담당과 빈 갭을 확정했다:

| 위젯 | 담당(각도) | C1과의 경계 |
|---|---|---|
| `InactivityCoachingCard` (M4) | 최근 **14일 완전 비활성**(멈춘 습관) 영역별 코칭. 신입(60일) 제외 | 창(14일 멈춤)과 대상(이미 멈춘 사람)이 다름 |
| `LearningStreak` `justBroke` 넛지 | **지난주가 통째로 비어** 스트릭이 **이미 끊긴** 뒤의 복구 유도 | C1은 지난주까지 활동이 **살아 있는** 상태(상호 배타). 게다가 대시보드에선 `compact=월별뷰`라 justBroke 넛지 자체가 **렌더되지 않음** → 대시보드엔 이 예방 표면이 애초에 부재 |
| `WeeklyGoalCard` (M1) | 회원이 **스스로 세우는 능동적 주간 목표** 설정·달성·회고 루프 | C1은 목표 설정과 무관한 **수동적 위험 파생**. 목표를 안 세운 사람에게도 리듬 위험을 감지 |
| `FirstStepsMissionCard` (B1) | **신입(가입 7일 이내)** 첫걸음 미션 | C1은 **가입 7일 초과 비신입** 한정(게이트로 명시 분리) |
| `NextActionBanner` | 시간 임박 액션 + 발견성 넛지 | 주간 리듬 개념 아님 |

**결론**: "직전 주까지 연속(≥2주)이 살아 있으나 이번 주 들어 아직 활동이 0"인 예방 구간은
위 어떤 위젯도 대시보드에서 커버하지 않는 빈 갭 → 최소 신규 카드 1개로 채웠다.
기존 카드(특히 WeeklyGoal/LearningStreak)를 소폭 확장해 채우려 검토했으나,
(1) LearningStreak 는 대시보드에서 compact 월별뷰라 이 넛지 표면이 없고 LIVE 보호 대상,
(2) WeeklyGoalCard 는 "목표 설정" 개념이라 각도가 상이 — 신규 카드가 더 정합적이라 판단.

## 위험 판정 방식 (읽기 전용 · 신규 컬렉션/저장 없음)

`assessWeeklyReturnRisk(scoresByDay, frozenWeeks, now = new Date())` — 순수 함수.

- **입력**: 잔디 일별 점수 `scoresByDay: Map<"YYYY-MM-DD", 점수>` (기존 `useGradActivityData` 재사용),
  얼린 주 집합 `frozenWeeks`(기존 `streak-freeze` 재사용).
- **파생 지표**(존재/카운트 수준만 — v19 §4 "상태 도달"):
  - `thisWeekActiveDays`: 이번 주(월~오늘, `weekly-goal` 의 `currentWeekKey`/`weekDays`) 활동 일수.
  - `priorStreakWeeks`: 직전 주부터 과거로 **연속 활동 주 수**(한 주라도 score>0 이면 활동 주).
- **atRisk 조건(전부 충족)**:
  1. 이번 주가 **"연구 쉼표"로 얼려지지 않음**(의도적 휴식이면 넛지 억제 — `streak-freeze` 일요일 주 키 규약 사용).
  2. **주 중반(수요일) 이후** — 월·화 이른 넛지로 압박하지 않음(`MID_WEEK_DAY_INDEX=2`).
  3. `thisWeekActiveDays === 0`.
  4. `priorStreakWeeks >= 2` (살아 있던 리듬이 끊길 위험일 때만).
- **재사용**: `currentWeekKey`/`weekDays`/`addWeeks`/`localYmd`(weekly-goal), `weekStartYmd`(streak-freeze).
  신규 fetch 없음 — `useGradActivityData` 는 InactivityCoaching/WeeklyGoal 과 **동일 캐시 키**라 추가 read 0.

## 노출 게이트 (graceful · 페르소나 분리)

- **노출**: 로그인 + **비신입(가입 7일 초과** — 신입은 B1 담당, 중복 회피, `null` createdAt 은 기존 회원 간주)
  + **졸업생 제외**(`isAlumni`) + **이번 주 리듬 위험**(atRisk) + **사용자 닫음 아님**.
- **자동 숨김**: 위험 아님 / 신입 / 졸업생 / 이번 주 얼림 / 로딩 중 / 닫음 → `null` 렌더.
  마운트는 `empty:hidden` 래퍼 + `WidgetBoundary label="weekly-return-nudge"` 로 위젯 격리(v18).
- **사용자 닫기**: per-user + **이번 주차(weekKey) 스코프** localStorage
  (`yedu_weekly_return_nudge_dismissed.{userId}.{weekKey}`) → **다음 주엔 키가 바뀌어 다시 노출 가능**.
  `useSyncExternalStore` 로 SSR-safe(FirstStepsMissionCard 패턴 재사용).
- **비활성 시 쿼리 미실행**: `useGradActivityData(active ? userId : undefined)` — 신입/졸업/미로그인은 read 0.

## 톤 · CTA (비압박)

- 헤더: "{이름}님, 이번 주 15분만 다시 시작해볼까요?" — 죄책감 유발 금지, 따뜻한 초대형.
- 본문: "{N}주째 이어온 연구 리듬이에요. 이번 주 한 번의 기록이면 흐름이 그대로 이어집니다."
- **단일 CTA**: "논문 읽기 타이머로 15분 시작" → `/mypage/research?tab=reading`
  (FirstStepsMissionCard 와 동일한 실측 딥링크).
- **시맨틱 토큰만**: `border-info/30`·`bg-info/10`·`text-info`·`bg-primary`·`text-primary-foreground`·
  `text-muted-foreground` 등(raw 팔레트 없음). a11y: 닫기·CTA `aria-label`, 장식 아이콘 `aria-hidden`.

## Date 순수성 (warning 래칫 147 보호)

렌더 경로에서 `new Date()`/`Date.now()` 직접 호출 없음. 모든 시각 의존은 **기본 인자를 갖는 순수 유틸**
내부에서만 평가되고, 컴포넌트는 `useMemo` 로 감싸 호출한다:
`daysSinceJoinKst(createdAt)` · `currentWeekKey()` · `assessWeeklyReturnRisk(scoresByDay, frozenWeeks)`.
FirstStepsMissionCard/WeeklyGoalCard 의 검증된 패턴과 동일.

## 검증 결과

- `npx tsc --noEmit` → **TSC_EXIT=0** (0 errors).
- `npx eslint src/lib/weekly-return.ts src/features/dashboard/WeeklyReturnNudgeCard.tsx src/app/dashboard/page.tsx`
  → **EXIT=0** (0 errors / 0 warnings).
- `next build` 은 지침에 따라 실행하지 않음(메인 최종 게이트).
