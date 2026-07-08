# H4 — 상황 맞춤 능동 가이드(발견성 넛지) 구현 리포트

> 작성일 2026-07-08 · 대상 `src/features/dashboard/NextActionBanner.tsx` · v4 계획 H4 (v3 M2 승계)
> H3가 같은 파일에 추가한 "졸업요건 넛지(최저 우선순위)" 구조를 그대로 계승·확장.

## 1. 개요

NextActionBanner를 "시간 임박 액션(수업·세미나·todo) 1건"에서 **발견성 넛지**로 확장했다.
시간 임박 액션(`top`)이 없을 때, 회원 컨텍스트를 근거로 **먼저 권하는** 추천 1건을 노출한다.
H3의 졸업요건 넛지는 발견성 넛지보다 낮은 우선순위로 편입해 함께 정렬했다.

## 2. 넛지 우선순위표

시간 임박 액션이 없을 때(`!top`) 아래 순서로 **딱 1건만** 노출. 위에서 먼저 해당되는 것이 이긴다.

| 순위 | 넛지 | 노출 조건 | 문구 | 이동 |
|---|---|---|---|---|
| 1 | 미응시 진단 | `diagnostic_results` 0건 | "연구 준비도 진단 받아보기" | `/diagnosis` |
| 2 | due 암기카드 | `dueAt ≤ 오늘(KST)` 카드 N장 > 0 | "오늘 복습할 카드 N장" | `/flashcards` |
| 3 | 빈 포트폴리오 | 수상·대외활동·콘텐츠 합계 0건 | "활동 자동 불러오기로 포트폴리오 채우기" | `/mypage/portfolio` |
| 4 | 졸업요건(H3) | 미충족 요건 ≥ 1 (`useGraduationSummary`) | "졸업요건 N개 남음" | `/mypage#graduation-checklist` |

- 로딩 중(진단 이력 `undefined`)에는 넛지를 **조용히 보류**해 깜빡임·오노출을 막는다.
- 데이터 로딩 실패·비로그인 시 각 쿼리가 빈 배열/null로 수렴 → 넛지 미노출(크래시 없음).
- 기존 "오늘 그만 보기"(localStorage `dashboard.nextActionBanner.hiddenUntil.<userId>`) 동작은 그대로 — 배너 전체가 하루 숨김.

## 3. 쿼리 비용 분석

"대시보드 초기 로드에 무거운 신규 쿼리를 얹지 말 것" 원칙에 따라 캐시 재사용·지연 로드로 마감했다.

| 데이터 | 캐시 키 | 재사용 대상 | enabled | staleTime | 추가 비용 |
|---|---|---|---|---|---|
| 진단 이력 | `["stage-rec-diagnostics", userId]` | **StageRecommendationPanel**(대시보드 상주) | `!!userId` | 5분 | **0** (dedupe) |
| 암기카드 | `["today-flashcards", userId]` | **TodayCard**(대시보드 상주) | `!!userId` | 5분 | **0** (dedupe) |
| 포트폴리오 합계 | `["nudge-portfolio-count", userId]` | 신규(대시보드 비상주) | **지연**: `!top && diagnosticCount>0 && dueCardCount===0` | 5분 | 앞 넛지가 모두 해당 없을 때만 3콜(awards·external·content) |

- 진단·암기카드는 대시보드에 이미 상주하는 위젯(StageRecommendationPanel·TodayCard)과 **동일 캐시 키**라 react-query dedupe로 순수 추가 로드 0. `dashboard/page.tsx`에서 두 위젯이 NextActionBanner와 함께 마운트됨을 확인.
- 포트폴리오만 신규 쿼리(3콜). **enabled 게이트**로 "시간 임박 액션 없음 + 진단 응시함 + due 카드 없음"일 때만 발화 → 대부분의 세션에서 미발화. 워터폴이지만 의도된 비용 회피.
- 암기카드 due 판정은 기존 `isDueToday`(`@/lib/flashcard-srs`) 재사용 — 자체 로직 신설 없음.

## 4. 변경 파일

- `src/features/dashboard/NextActionBanner.tsx` (단일 파일)
  - import 확장: `Activity·Layers·FolderPlus`(lucide), `diagnosticResultsApi·flashcardsApi·awardsApi·externalActivitiesApi·contentCreationsApi`(bkend), `isDueToday`, 타입 `DiagnosticResult·Flashcard`.
  - `DiscoveryKind`/`DiscoveryNudge` 타입 추가.
  - 넛지 쿼리 3종 + `discovery` 선정 `useMemo` 추가.
  - `!top` 렌더 분기에 발견성 넛지 블록을 졸업요건 넛지 앞에 삽입(H3 emerald 넛지와 동일 시각 패턴, 넛지별 blue/indigo/violet 액센트·다크모드 대응).

bkend.ts·firestore.rules·다른 컴포넌트 수정 없음.

## 5. 검증

- `npx tsc --noEmit` → **통과(exit 0)**.
- 커밋·배포 없음(계획대로).
