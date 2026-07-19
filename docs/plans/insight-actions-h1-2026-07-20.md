# v7 H1 — 운영 인사이트 액션화 (측정→개선 루프 완성) · 2026-07-20

> 계획 원문: `docs/plans/service-enhancement-plan-v7-2026-07-20.md` H1 항목 구현.
> 관찰용 차트(FunnelSection·SearchMissSection·WeeklyOperationsSummary)를 규칙 기반
> "제안된 운영 액션" 큐로 전환하고, 각 제안을 **기존 표면으로 딥링크**만 한다(새 발송 로직 없음).

## 산출 파일
- `src/features/insights/SuggestedActionsSection.tsx` (신규) — 액션 제안 엔진 + UI
- `src/app/admin/insights/page.tsx` (수정) — 액션 센터 탭 상단에 삽입 + 넛지 패널 앵커 부여

## 표면 배치
- **탭**: 기존 `액션 센터`(`?view=actions`) 탭 상단. 그 아래에 기존 `InsightsActionPanel`(M3 넛지 발송) 배치.
- 넛지 패널은 `<div id="insights-nudge-panel" class="scroll-mt-20">` 로 감싸 앵커 스크롤 대상이 됨.
- 데이터 부족·임계 미달·오류 시 **"데이터 축적 중"** 빈 상태.

## 규칙·임계값 (파일 상단 상수 — 운영 튜닝용)

| 상수 | 값 | 의미 |
|---|---|---|
| `FUNNEL_MIN_CONVERSION` | 0.5 (50%) | 이전 단계 대비 전환율이 이 값 미만인 전환을 이탈 지점으로 승격 |
| `FUNNEL_MIN_ENTRY` | 5 | 퍼널 진입자가 이 미만이면 노이즈로 보고 제안 생략 |
| `FUNNEL_WINDOW_DAYS` | 30 | 퍼널 이벤트 조회 범위(일) |
| `SEARCH_MISS_MIN_COUNT` | 3 | 검색 실패 시드 후보 최소 반복 횟수 |
| `SEARCH_MISS_TOP_N` | 5 | 검색 실패 액션화 상위 질의 수 |
| `INACTIVE_MIN_COHORT` | 3 | 비활성 코호트 넛지 최소 인원 |

## 3소스 → 액션 규칙

| # | 소스(상주 데이터) | 규칙 | 제안 액션 | 딥링크 |
|---|---|---|---|---|
| 1 | 퍼널: `user_activity_logs` (`funnelType=onboarding` / `diagnostic`, `ui:onboarding/*`·`ui:diagnostic/*`) | 진입 표본 ≥ `FUNNEL_MIN_ENTRY` 인 퍼널에서 전환율 < 50% 인 전환 중 **이탈 인원 최대** 지점 1개 | "재개 넛지 발송" | `#insights-nudge-panel` (같은 탭 하단 넛지 패널 스크롤) |
| 2 | 검색실패: `search_misses` (count desc, top N) | count ≥ 3 인 상위 질의 각각 | "아카이브 시드 등록" | `/console/archive?name=<query>` |
| 3 | 비활성: `useMemberMetrics` 세그먼트(`at_risk`/`dormant`) — 운영 요약 탭이 쓰는 소스 재사용 | 해당 세그먼트 인원 ≥ 3 | "재참여 넛지 발송" | `#insights-nudge-panel` |

## 딥링크 목록 (기존 표면 재사용 — 새 로직 없음)
- **넛지 발송** → 같은 `액션 센터` 탭 하단의 기존 `InsightsActionPanel`(M3 운영액션화). 앵커 `#insights-nudge-panel` 로 스크롤. 운영진이 세그먼트(이탈 위험/진단 미응시/복습 정체)를 선택해 dryRun→확인→발송.
- **아카이브 시드** → `/console/archive` (콘솔 아카이브 관리). `?name=<query>` 파라미터를 부착 — 현재 아카이브 페이지는 미소비(무해)하나, M4 작업이 새 항목 프리필을 지원하면 자동 반영되는 **forward-compat** 링크.

## 설계 원칙 준수
- **과설계 금지**: 새 컬렉션·새 발송 API·새 넛지 세그먼트를 만들지 않음. 상주 데이터 조합 + 기존 표면 딥링크만.
- **소스 재사용**: 퍼널/검색 조회는 FunnelSection·SearchMissSection과 동일 스킴, 비활성은 `useMemberMetrics`(운영 요약과 동일 훅).
- **권한·안전**: 각 소스의 기존 firestore.rules/bkend 권한(staff+) 그대로. 오류 시 조용히 숨김·빈 상태.
- **색상**: 시맨틱 토큰(`destructive`/`warning`/`info`)만 사용 — raw 팔레트 부채 미유입.

## 검증
- `npx tsc --noEmit` — src 에러 0
- `npx eslint src/features/insights/SuggestedActionsSection.tsx src/app/admin/insights/page.tsx --quiet` — 통과(0)

## 규율 준수 (미수정 파일)
- `api/cron/adoption-snapshot`, `console/archive/page.tsx`, `features/dashboard/**`, `app/r/**`, `DigestStatsSection`, `api/cron/analytics-retention`, kudos 관련 — **미수정**.
