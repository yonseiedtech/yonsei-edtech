# 대시보드 P0 구현 기록 (P0-1 세로 리듬 통일 + P0-2 2단 그리드 하단 정렬)

> 구현일: 2026-07-29 · 근거: `docs/plans/dashboard-improvement-project.md` §1-C, §3(P0-1·P0-2), §5
> 범위: 대시보드 고정 상단 스택 세로 리듬 + 2단 그리드 정렬. 신규 기능·데이터 변경 없음(시각/레이아웃만).

## 변경 파일 (5개)

| 파일 | 변경 |
|------|------|
| `src/lib/design-tokens.ts` | `DASHBOARD_STACK_GAP = "space-y-6"` 신설 (WIDGET_GAP 정책 정합 주석) |
| `src/app/dashboard/page.tsx` | 고정 상단 `<section>` 에 `DASHBOARD_STACK_GAP` 부여 + 직속 자식 `mt-*/mb-*` 전면 제거 + 2단 그리드 정렬 교정 |
| `src/features/dashboard/DashboardCommandCenter.tsx` | 루트 `<div className="mb-6">` → `<div>` (자체 하단 마진 제거) |
| `src/features/dashboard/SemesterKickoffBanner.tsx` | 배너 루트 `mb-4` 2곳(휴학/일반 분기) 제거 |
| `src/features/dashboard/NewPostsBadge.tsx` | 링크 루트 `mb-4` 제거 |

## 적용 방식

### P0-1 — 세로 리듬 통일 (컨테이너가 간격 소유)
- 고정 상단 `<section>` className 을 `cn("mx-auto max-w-6xl px-4", DASHBOARD_STACK_GAP)` 로 변경 → 인접 블록 간 24px 를 컨테이너가 단일 소유.
- 직속 자식 수직 마진 제거:
  - JourneyGreetingHeader 래퍼 `mt-6 mb-5` → 무마진
  - newcomer / journey-stepper 래퍼 `mt-6 empty:hidden` → `empty:hidden`
  - 그리드 래퍼 `mt-6 mb-6 …` → 세로 마진 제거
  - 코칭·넛지·stage-rec 래퍼 6곳 `mb-6 empty:hidden` → `empty:hidden`
  - QuickLinks 래퍼 `mb-6` → 무마진
- 배너 3종 내부 마진 제거: SemesterKickoffBanner `mb-4`×2, NewPostsBadge `mb-4`. HackathonCtaBanner 는 원래 무마진이라 변경 없음(일관 상태 확인).
- `empty:hidden` 유지: 빈 블록은 `display:none` 이라 `space-y` 의 `> * + *` 에서 갭을 생성하지 않음 → 유령 여백 0. 컴포넌트가 `null` 반환 시엔 DOM 노드 자체가 없어 역시 갭 미생성.
- PageHeader·JourneyGreetingHeader 등 내부 자체 간격은 손대지 않음(직속 래퍼 마진만 정리).

### P0-2 — 2단 그리드 하단 정렬 (자연 높이 + sticky 사이드바)
- `DashboardCommandCenter` 자체 `mb-6` 제거 → 좌측 컬럼 마지막 요소의 24px 잔여 마진(정렬 어긋남 직접 원인) 소거. 간격은 부모 `gap`/`space-y` 가 소유.
- 그리드 교정(권장안):
  - `items-stretch` → `items-start` (자연 높이 병치)
  - 우측 컬럼에 `lg:sticky lg:top-20` 부여(사이드바 승격)
  - 우측 마지막 위젯의 억지 stretch filler(`<div className="flex flex-1 flex-col [&>*]:flex-1">`) 제거 → `<LearningStreak compact />` 직접 렌더
  - 좌측 내부 `gap-5` → `gap-4` (좌·우 gap 통일)
- 폴백(시간표 비대상) 분기: `mt-6 mb-6 space-y-5` → `space-y-4` (세로 마진은 부모 space-y-6 소유, 내부 간격 규약 정합).

## 배너 재사용처 확인 (회귀 없음)
`grep` 결과 `DashboardCommandCenter`·`SemesterKickoffBanner`·`HackathonCtaBanner`·`NewPostsBadge` 는 모두 `src/app/dashboard/page.tsx` 에서만 렌더된다(whats-new/page.tsx 매치는 주석 문자열, whats-new-meta.ts·JourneyStepperWidget 매치는 무관 심볼). 따라서 내부 마진 제거가 대시보드 외부에 영향을 주지 않음.

## 검증 결과
- `npx tsc --noEmit` → **0 errors** (TSC_EXIT=0)
- `npx eslint <변경 5파일>` → **0 errors / 0 warnings** (ESLINT_EXIT=0)
- `next build` 미실행(다른 executor 병렬 · .next lock 회피 지시 준수)

## 주의/후속
- 런타임 시각 회귀(모바일/데스크톱·다크모드·`empty:hidden` 유령 여백 0)는 배포 후 스모크로 눈 확인 필요.
- 병렬 경계 준수: `bkend.ts`·`grad-life.ts`·`features/admin/**`·`features/grad-life/**`·`components/profile/**` 미변경.
