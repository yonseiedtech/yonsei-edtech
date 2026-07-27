# v17 M4 — 러닝가이드 완독 → 활동 전환 심화 (완료 보고)

작업일: 2026-07-27
플랜: `docs/plans/service-enhancement-plan-v17.md` M4 (153~159행)

## 1. 변경/신규 파일과 역할

| 파일 | 구분 | 역할 |
|---|---|---|
| `src/features/learning-guides/GuideCompletionCard.tsx` | 신규 | 완독 축하 + 다음 행동 카드. 축하 헤더(뱃지)·스터디 수요 남기기 CTA(prefill 딥링크)·관련 세미나·다음 추천 가이드(카테고리 인접) 노출 |
| `src/app/learning-guides/[slug]/page.tsx` | 수정 | `isCompleted`(전체 완독) 계산 추가, 기존 "마지막 페이지 도달 시 서재로" 블록을 **완독 시에만** `GuideCompletionCard` 조건부 렌더로 교체. 미사용이 된 `BookOpen` import 제거 |
| `src/features/demand/DemandSurveySection.tsx` | 수정 | 마운트 시 `?demandTopic=` 쿼리를 읽어 수요 등록 폼 `body`를 prefill (client-only, DB 무변경) |
| `src/features/activities/ActivityPage.tsx` | 수정 | `?tab=demand` 딥링크 착지 — 수요조사 탭 존재 시 마운트 1회 `statusTab="demand"` 반영. (DemandSurveySection은 이 탭에서만 마운트되므로 prefill이 보이려면 필수) |

## 2. 완독 판정 · prefill 재사용 방식

### 완독 판정 (신규 저장 없음)
- 뷰어는 이미 로그인 사용자의 `learning_guide_progress.readPageIds`(Set)를 읽어 `readCount`를 계산한다.
- v17 H2 확정 기준과 동일하게 **`readCount >= totalPages`(= `guide_pages` 전체 수)** 를 완독으로 판정:
  `const isCompleted = totalPages > 0 && readCount >= totalPages;`
- `GuideCompletionCard`는 `isCompleted`일 때만 렌더 → **미완독 시 미노출**. 기존 `guide_progress` 읽기만 사용하며 신규 컬렉션/필드/저장 없음.
- 기존 블록은 `nextPage === null`(마지막 페이지 도달)만 검사해 중간 페이지를 건너뛰어도 "모두 읽었습니다"를 표기하던 부정확성이 있었는데, 실제 완독 기준으로 교체해 정확도도 개선.

### prefill 재사용
- v16 H4 `DemandInterestCard`·command-routes와 **동일한 딥링크 컨벤션**(`/activities/studies?tab=demand`)을 그대로 사용하고, 여기에 `demandTopic`(가이드 대표 태그 또는 제목)을 URL-encode해 덧붙였다:
  `` `/activities/studies?tab=demand&demandTopic=${encodeURIComponent(topic)}` ``
- 조사 결과 기존 코드에는 **주제 값 자체를 채우는 prefill 로직이 부재**했고, `?tab=demand` 딥링크도 `ActivityPage`에서 탭으로 반영되지 않는 잠재 갭이 있었다. 이를 두 개의 SSR-safe `useEffect`(마운트 시 `window.location.search` 읽기)로 최소 보강:
  - `ActivityPage`: `tab=demand` → 수요조사 탭 착지 (기존 `DemandInterestCard`·command-routes 딥링크도 함께 정상 착지).
  - `DemandSurveySection`: `demandTopic` → 등록 폼 `body` prefill(기존 입력이 있으면 보존).
- 두 effect 모두 빈 deps + 안정적 setter만 사용 → exhaustive-deps 경고 없음, `window`는 effect 내부 접근이라 프리렌더 bailout 없음. DB/rules 무변경.

### 완독 뱃지 · 시각 일관성
- 이어읽기(v16 H3 `ContinueReadingCard`)·뷰어 목차 완료 체크가 쓰는 **success 토큰**(`text-success`/`bg-success/10` 등)과 동일 톤으로 축하 헤더·뱃지(`CheckCircle2`) 구성. raw hex 미사용, 시맨틱 토큰만.

### 관련 세미나 · 다음 가이드 (GuideRelated 매칭 재사용)
- 다음 가이드: `guidesApi.list({ category })`로 **카테고리 인접** 가이드 조회 → 현재 가이드 제외 → 태그 교집합 수 우선 정렬 → 상위 2건.
- 세미나: `seminarsApi.list()` → `upcoming`/`ongoing` 중 가이드 태그(2자+) 키워드가 제목/설명에 걸리는 것 상위 2건 (`Seminar`에 tags 필드가 없어 `GuideRelated`의 제목 키워드 매칭 방식을 차용).
- 조회 실패/0건이면 해당 섹션만 숨기고 축하 + 수요 CTA는 항상 노출(안전한 빈 상태).

## 3. 검증 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| 타입 | `npx tsc --noEmit` | **0 에러** |
| 린트 | `npx eslint <4개 파일>` | **0 에러 / 0 신규 경고** (ActivityPage `joinMutation` 미사용 경고 1건은 stash 대조로 **기존부터 존재** 확인 — 내 편집 라인과 무관) |
| raw color | `node scripts/check-rawcolor-ratchet.mjs` | **PASS (1개 / 상한 1개, 변동 없음)** |

- build는 지시대로 미실행(메인 게이트 수행).

## 4. 제약 준수 확인
- DB/rules/types 무변경 (완독 판정=기존 읽기, 신규 저장 없음). `firestore.rules`·`src/types/**` 미터치.
- 시맨틱 토큰만 사용, raw hex 0 (ratchet 상한 유지).
- 금지 파일 미터치: `src/app/console/cron-logs/**`(M2), `src/types/**`, `src/features/insights/**`, `src/features/dashboard/JourneyStepperWidget.tsx`.
- 신규 ESLint 경고 0.
