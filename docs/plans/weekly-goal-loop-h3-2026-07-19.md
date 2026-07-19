# v6-H3 주간목표 연속·추세·회고 루프 심화 — 구현 내역 (2026-07-19)

계획 원문: `docs/plans/service-enhancement-plan-v6-2026-07-18.md` H3 항목.

## 목표
`weekly-goal.ts`·`WeeklyGoalCard.tsx` 가 개인 단발 판정만 하던 것을,
주차 마감 기록을 영속화(`weekly_goal_records`)해 **연속 달성 N주 · 최근 6주 추세 · 지난주 회고**로 확장.
달성 판정은 기존 잔디 소스(`countGoalDaysInWeek` / cron `loadLastWeekGoalResults`) 유지.

## 컬렉션 스키마 — `weekly_goal_records`
- **문서 id**: `{userId}_{weekKey}` (플랫 + 복합 id 관행 — 기존 `weekly_goals` 동일 패턴)
- **필드**:
  - `userId: string`
  - `weekKey: string` — 주의 월요일 YYYY-MM-DD
  - `goal: number` — 목표 일수 (판정 당시 target)
  - `achieved: number` — 달성 일수 (해당 주 채널 활동 일수)
  - `met: boolean` — 달성 여부 (achieved ≥ goal)
  - `reflection?: string` — 회원이 남긴 회고 한 줄 (선택, ≤140자)
  - `createdAt` / `updatedAt`
- **적재 주체**:
  - cron(Admin SDK)이 주차 종료 판정 결과(goal/achieved/met)를 매주 월요일 upsert(merge — 회고 보존).
  - 회원이 회고(reflection)를 사후 upsert(merge).

## 수정 파일
1. `src/types/weekly-goal.ts` — `WeeklyGoalRecord` 인터페이스 추가.
2. `src/lib/weekly-goal.ts` — 순수 함수 `computeGoalStreak()`, `recentWeekBars()` + 타입 `WeekMetLite`, `WeekBarCell` 추가.
3. `src/lib/bkend.ts` — `weeklyGoalRecordsApi`(getByKey · listByUser · saveReflection) 추가 + `WeeklyGoalRecord` 타입 import. listByUser 는 복합 인덱스 회피(filter[userId] 단일 + client-side weekKey desc 정렬).
4. `src/app/api/cron/weekly-digest/route.ts` — 지난주 목표 판정 결과를 `weekly_goal_records` 에 upsert(merge). 직전 주(2주 전) 회고 단일 쿼리로 인용 + `LastGoalResult.priorReflection` 필드 추가. `buildSuggestionHtml` 에 회고 인용/프롬프트 1줄 추가.
5. `src/features/dashboard/WeeklyGoalCard.tsx` — 공용 `GoalHistory` 서브컴포넌트 추가(자체 records 쿼리): 연속 달성 배지(≥2주, Flame) + 최근 6주 미니 바 + 지난주 회고 한 줄 입력(저장). 두 브랜치(목표 설정/미설정) 모두 렌더. 시맨틱 토큰만 사용(met=`bg-primary`, 미달=`bg-muted-foreground/30`, 미설정=`bg-muted`).

## Firestore rules 변경
`firestore.rules` 에 `weekly_goal_records/{docId}` match 블록 추가 (`weekly_goals` 스타일 준수):
- read/list: 본인(userId 일치) 또는 admin
- create: 본인 + docId == `{userId}_{weekKey}`
- update/delete: 본인
- cron 은 Admin SDK 로 규칙 우회 적재.

## 검증
- `npx tsc --noEmit` — src 에러 0
- `npx eslint src --quiet` — 통과 (raw 팔레트 미사용)
- build·commit 은 메인 통합 게이트에서 수행(본 작업 범위 외).
