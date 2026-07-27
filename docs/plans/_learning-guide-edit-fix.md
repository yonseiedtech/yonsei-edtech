# 러닝 가이드 로드 실패 수정 — required-array(`tags`) 결손 크래시

작성: 2026-07-27 · 대상 URL: `/console/learning-guides/6iGAaINxoNHLZC4ejfin/edit` (및 가이드 뷰어 `/learning-guides/[slug]`)

## 결론 (근본원인)

`LearningGuide` 타입은 `tags: string[]` 를 **required 배열**로 선언한다(`src/types/learning-guide.ts:12`). 그러나
MVP 초기(2026-07-23)나 API 우회로 생성된 **레거시 문서에는 `tags` 필드가 없다**. `guidesApi` 가 Firestore/API
응답을 사실상 무가공(`as unknown as LearningGuide`) 반환하므로, `tags` 가 `undefined` 인 채로 소비 경계에 도달해
**동기 렌더 경로에서 `undefined.length/.some/.map` → TypeError → 렌더 throw → Next error.tsx 경계 트립**으로
페이지 전체가 폴백/붕괴한다. 이 코드베이스의 반복 크래시 클래스(required-array 결손, `normalizeSeminar` 선례)와 동일.

프로덕션 digest(3955795463)로 보고된 "Server Components render" 메시지는 이 크래시 클래스의 표현이다.
편집 라우트 자체는 `"use client"` + `loading=true` 게이트라 SSR 단계에선 Skeleton만 렌더하므로 서버에서 직접
throw 하지 않는다. 실제 throw 는 인증·fetch 완료 후 재렌더 시(클라이언트) 아래 무가드 접근에서 발생한다.

### 확인된 무가드 접근 지점 (`guide.tags` — required array)

| 파일 | 라인 | 접근 | 트리거 |
|---|---|---|---|
| `src/app/learning-guides/[slug]/page.tsx` (뷰어) | 497 | `guide.tags.length > 0` + `<GuideRelated tags={guide.tags} />` | 가이드 열람 시 **항상** — 1순위 크래시 |
| `src/app/learning-guides/page.tsx` (공개 목록) | 65 | `g.tags.some((t) => ...)` | 검색어 입력 시 |
| `src/features/learning-guides/GuideCompletionCard.tsx` | 28·33·84 | `current.tags.map` / `g.tags.reduce` / `guide.tags.length` | 완독(리텐션 정점) 도달 시 |

> 참고: 편집 페이지(`[id]/edit/page.tsx`)의 렌더는 이미 `Array.isArray(guide.tags)` 가드가 있어 자체
> throw 하진 않지만, 동일 문서를 다루므로 읽기 경계 정규화로 함께 안전화했다.

## 적용한 수정 (최소·방어적 — 읽기 경계 정규화)

`normalizeSeminar`(`src/lib/seminar-normalize.ts`) 선례를 따라 **읽기 경계 1곳**에서 정규화한다.
각 소비 지점에 산발적 옵셔널 가드를 흩뿌리는 대신, `guidesApi` 가 반환하는 모든 가이드에 `tags` 배열을 보장해
뷰어·목록·완독카드·편집 **모든 표면**을 한 번에 안전화(단일 소스, 회귀 없음).

### 신규 파일
- **`src/features/learning-guides/normalize.ts`**
  - `normalizeGuide(raw: LearningGuide): LearningGuide` — 순수함수. `tags: Array.isArray(raw.tags) ? raw.tags : []`
    로 유일한 required array 필드 기본값 보장. 정상 문서는 그대로 통과.

### 수정 파일
- **`src/features/learning-guides/api.ts`**
  - `import { normalizeGuide } from "./normalize";` 추가.
  - `guidesApi.getById` — `dataApi.get` 결과를 `normalizeGuide()` 로 감쌈 (편집 페이지 로드 경계).
  - `guidesApi.getBySlug` — `.data` 존재 시 `normalizeGuide()` 적용 (뷰어 로드 경계).
  - `guidesApi.list` — `(json.data ?? []).map(normalizeGuide)` (공개 목록 + GuideCompletionCard `pickNextGuides` 경계).
  - `guidesApi.listAll` — `(json.data ?? []).map(normalizeGuide)` (콘솔 목록 경계). 부수로 `data` null 대비 `?? []` 방어도 추가.

이로써 뷰어 497행 `guide.tags.length`, 목록 65행 `g.tags.some`, GuideCompletionCard 28/33/84행 접근 모두
`tags` 가 항상 배열이라 throw 하지 않는다. GuideRelated 는 `tags` prop 이 항상 배열로 전달돼 안전.

## 회귀 안전성
- `normalizeGuide` 는 정상 문서(`tags` 존재)를 변형하지 않음(스프레드 + 동일 배열 통과).
- 반환 타입/시그니처 불변: `list`/`listAll` 은 여전히 `{ data: LearningGuide[] }`, `getBySlug` 은 `{ data: LearningGuide | null }`, `getById` 은 `LearningGuide`. 기존 소비부(`res.data`, `res.data.filter`, `setGuide(...)`) 무수정.
- DB/firestore.rules/서버 라우트 무변경. 클라이언트 읽기 경계만 강화.

## 검증
- `npx tsc --noEmit` → **TSC_EXIT=0** (통과)
- `npx eslint src/features/learning-guides/normalize.ts src/features/learning-guides/api.ts` → **ESLINT_EXIT=0** (에러 0)
- `npm run build` prebuild ratchet PASS (raw color 1/상한 1). 전체 빌드는 게이트 단계에서 확인 권장.

## 배포/후속
- 커밋·배포는 하지 않음(메인 오케스트레이터 검증 후 게이트).
- 스모크 권장: 배포 후 `/learning-guides/[slug]` (레거시 가이드) + `/console/learning-guides/6iGAaINxoNHLZC4ejfin/edit` 실접속으로 렌더 정상 확인.
