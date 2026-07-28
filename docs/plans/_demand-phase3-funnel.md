# 수요조사 Phase 3 고도화 — H3 퍼널 지표 + H2 모임장 추천

> 구현일: 2026-07-29
> 범위: `_demand-survey-enhancement.md` H3(퍼널 지표 강화)·H2(모임장 추천)
> 담당 분리: H4(학기 간 트렌드, DemandRetroSection)는 병렬 executor — 본 작업은 미접촉

---

## H3. 퍼널 지표 강화 (statusHistory)

### 데이터 모델
`src/types/comm-board.ts` — `CommQuestion.demandPref` 에 옵셔널 필드 추가:

```ts
statusHistory?: { status: string; at: string; by?: string }[];
```

- 부재 = 이력 없음(레거시). 마이그레이션 불필요.
- `at` = ISO(전환 생성 시점), `by` = 전환 수행자 `user.id`.

### 공용 헬퍼
`src/features/demand/demand-status.ts` (신규):

```ts
appendStatusHistory(pref, status, by?) => DemandStatusHistoryEntry[]
```

- 마지막 기록과 같은 status 면 기존 배열 그대로 반환 → **중복(연속 동일 status) 방지**.
- `pref` 미존재/레거시는 `[]` 로 시작.
- `new Date().toISOString()` 은 mutation 내부에서만 호출 — 렌더 순수성 무관.

### 기록 지점 (모든 상태 전환)
| 파일 | 지점 | 전환 | 기록 |
|------|------|------|------|
| DemandSurveySection.tsx | `submitMutation` (create) | → collecting | `appendStatusHistory(undefined, "collecting", user.id)` |
| DemandSurveySection.tsx | `joinMutation` Q2 자동 전환 | collecting→reviewing | `appendStatusHistory(q.demandPref, "reviewing", user!.id)` |
| DemandSurveySection.tsx | `statusMutation` (수동: 세미나 reviewing/opened·보류·재검토) | 임의 | `appendStatusHistory(q.demandPref, status, user?.id)` |
| StudyLaunchPanel.tsx | `advanceMutation` (leader/designing 등) | patch.status 시 | `appendStatusHistory(question.demandPref, patch.status, user?.id)` |
| StudyLaunchPanel.tsx | `volunteerMutation` | → leader | `appendStatusHistory(question.demandPref, "leader", user!.id)` |
| StudyLaunchPanel.tsx | `saveDesignMutation` | → designing | `appendStatusHistory(question.demandPref, "designing", user?.id)` |
| StudyLaunchPanel.tsx | `openMutation` | → opened | `appendStatusHistory(question.demandPref, "opened", user?.id)` |

- `editMutation`(본문 수정)은 status 미변경 → 기록 안 함(기존 `statusHistory` 는 spread 로 보존).

### 콘솔 지표 (`src/app/console/demand/page.tsx`)
`funnelMetrics` useMemo 추가(순수 데이터 파생 — 렌더 경로 Date.now 없음). "스터디 개설 퍼널" 카드 하단에 렌더:

- **개설 리드타임**: `createdAt` → statusHistory 의 `opened.at` 평균 일수. 개설 이력 있는 건만.
- **단계별 평균 체류**: 인접 단계(collecting→reviewing→leader→designing→opened) **최초 발생 시각** 차 평균. 칩으로 표시(표본 수 n 병기).
- **이탈률**: `declined` / 전체 스터디 수요 (%).
- **이력 추적 수요**: statusHistory 보유 건수.
- **가드**: statusHistory 없는 레거시는 리드타임·체류 계산에서 제외. `tracked===0` 이면 안내 문구만 표시.

---

## H2. 모임장 추천 (StudyLaunchPanel)

`src/features/demand/StudyLaunchPanel.tsx`:

- **경험 판정 쿼리**: `activitiesApi.list("study")` → `leaderId` 집합 `studyLeaderIds`. `enabled: open && canManage`.
- **뱃지**: 참여 희망 명단에서 `studyLeaderIds.has(r.userId)` 인 회원에 `Award` 아이콘 + "모임장 경험" 표시(primary 톤).
- **우선 정렬**: `sortedResponders` useMemo — 경험자 상단. 기존 `responders` 명단·`leaderId` 지정 로직은 보존(표시 순서만 변경).
- domain 관련 경험 등 추가 매칭은 과설계 회피 위해 미도입(경험 유무 단일 축).

---

## 규율 준수
- 방어 가드: `statusHistory ?? []`, `q.demandPref?.…`, 옵셔널 체이닝 전반.
- Date 순수성: 기록은 mutation 내부, 지표 계산은 useMemo 내 파생. 렌더 경로 Date.now 없음.
- raw color 미도입 — 시맨틱 토큰(primary/success/muted/foreground)만 사용.
- 기존 등록·전환·개설·집계 회귀 없음(추가 필드·정렬만, 기존 흐름 미변경).
- DemandRetroSection.tsx 미접촉(H4 병렬 executor 담당).

## 검증 결과
- `npx tsc --noEmit` → **0 errors**
- `npx eslint demand-status.ts DemandSurveySection.tsx StudyLaunchPanel.tsx console/demand/page.tsx comm-board.ts` → **0 errors/warnings**
- next build 미실행(지침).

## 변경 파일
- `src/types/comm-board.ts` — statusHistory 타입
- `src/features/demand/demand-status.ts` — 신규 헬퍼
- `src/features/demand/DemandSurveySection.tsx` — 3개 전환 지점 기록
- `src/features/demand/StudyLaunchPanel.tsx` — 4개 전환 지점 기록 + H2 모임장 추천
- `src/app/console/demand/page.tsx` — funnelMetrics + 렌더
