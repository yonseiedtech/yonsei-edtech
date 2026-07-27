# 마이페이지 로드 에러(Error Boundary 트립) 근본원인 추적 — v17 L2 디버깅

작성: 2026-07-27 · debugger

## 증상 (Symptom)
사용자가 `/mypage`(및 중첩 `/mypage/research`)에서 아래 폴백 화면을 봄:
> "마이페이지 화면을 불러오지 못했어요 / 이 구간에서만 발생한 일시적 문제입니다 / 작성 중이던 내용은 자동 저장 이력에서 복원할 수 있습니다"

서버 라우트는 HTTP 200(SSR 정상) → 클라이언트 render 중 throw 로 error boundary 트립.

## 경계 특정 (증거)
- 이 메시지는 `src/components/ui/section-error.tsx:31-34` 의 `SectionError` 문구와 **정확히 일치**.
- `SectionError` 는 `src/app/mypage/error.tsx:6` 에서 `sectionLabel="마이페이지"` 로 렌더됨.
- `src/app/mypage/error.tsx` 는 `/mypage` **서브트리 전체**(중첩 `/mypage/research` 포함 — 해당 경로에 자체 error.tsx 없음)를 감싼다. 즉 서브트리 안 **아무 위젯이든** render 중 throw 하면 페이지 전체가 이 폴백으로 교체된다.

## 크래시 메커니즘 (왜 SSR 200 인데 클라이언트만 붕괴하나)
- `src/lib/query-provider.tsx:10-27` 의 QueryClient 는 `throwOnError`/`suspense` **미설정**. → react-query 의 **비동기 fetch 실패는 error boundary 로 전파되지 않는다**(isError 세팅만, data=undefined). 따라서 **fetch 에러는 boundary 를 트립할 수 없다.**
- 결론: boundary 트립은 **동기 render throw** 이며, **비동기 데이터가 클라이언트에 도착한 뒤 re-render 시점**에 발생한다. SSR 에서는 `useAuthStore` 의 user 가 null(Firebase 인증은 클라이언트 해석) → 개인 위젯들이 `isSelf` 게이트로 렌더 안 됨 → SSR 무사(200). 클라이언트 인증+fetch 후 위젯이 렌더되며 throw.

## 강한 용의자 #1 — ThesisJourneyProgress: **무혐의 (증거 기반)**
`src/features/steppingstone/ThesisJourneyProgress.tsx` 전체 정독 결과 render throw 경로 **없음**:
- 4개 훅(`useResearchProposal/Design/WritingPaper/Report`)은 모두 문서 0건·userId 없음 시 **null 반환**(예: `useResearchProposal.ts:17` `sorted[0] ?? null`). react-query queryFn 이 throw 해도 `throwOnError` 미설정이라 **boundary 로 전파 안 됨**. → 훅은 boundary 를 트립할 수 없음.
- `computeThesisProgress({ paper: paper ?? null, ... })`: `thesis-progress.ts:65-78 chapterCharCount` 가 `paper` null/undefined, `sections?.[key]`, `chapters?.[key] ?? ""` 를 전부 옵셔널 처리 → `paper: null` 안전.
- 렌더 접근 전부 가드됨: `stages[activeIdx].href` 는 `activeIdx >= 0` 가드(`ThesisJourneyProgress.tsx:199-201`), `doneCount === 0` 안내 분기(86), `!userId` 조기 반환(83, 단 훅 이후라 hook order 안전).
- `WidgetCard`(`widget-card.tsx:81`)의 `SEMANTIC[semantic]` 도 무혐의: `design-tokens.ts:16` `SemanticTone` 에 `"info"`, `"success"` 존재, `SEMANTIC` 에 두 키 정의됨(83, 128).
- L2 커밋(844d7605)의 `MyPageView.tsx` diff 는 **import 1줄 + `{isSelf && !readOnly && <ThesisJourneyProgress />}` 렌더 1곳** 뿐. 위젯 자체가 안전하므로 **이 위젯이 직접 throw 하지는 않는다.**

## 실제 최유력 크래시 지점 (증거)
`src/components/mypage/MyPageView.tsx:610` (수정 전):
```tsx
{latestDiagnostic.weakConceptIds.length > 0 && (
  <DiagnosticWeakConceptPath weakConceptIds={latestDiagnostic.weakConceptIds} ... />
)}
```
- `weakConceptIds` 는 타입상 `string[]`(필수, `types/diagnostic.ts:285`)이지만 **런타임에 레거시 Firestore 문서에는 필드가 없을 수 있음**(형제 필드 `weakConceptNames` 는 `?` optional — 필드가 나중에 추가되었음을 시사).
- 이 블록은 `isSelf && !readOnly` + `diagnosticResultsApi.listByUser` 쿼리(`MyPageView.tsx:253-266`, `enabled: !!user && isSelf`)에 의존 → **SSR 미실행, 클라이언트 fetch 후에만 렌더** → SSR 200 / 클라이언트 크래시 패턴과 **정확히 일치**.
- 필드 누락 문서면 `undefined.length` → `TypeError` → `/mypage/error.tsx` 트립.
- overview 서브트리에서 **비동기 데이터에 대한 유일한 무가드 프로퍼티 체인 접근**(585/597행은 숫자 읽기라 undefined/NaN 렌더뿐, 290행은 `?.` 가드됨).

## 근본원인 (구조)
`src/` 전체에 **React ErrorBoundary(componentDidCatch/getDerivedStateFromError) 부재** — 격리는 Next `error.tsx` 라우트 경계에만 의존. 따라서 **어떤 개별 위젯이든 한 번 throw 하면 `/mypage` 전체가 붕괴**한다(위젯 단위 격리 없음). 이것이 "위젯 하나 → 페이지 전체 실패" 심각도의 구조적 원인.

## 적용한 수정 (Minimal, 기능·레이아웃 유지)
1. **정밀 가드 (구체 throw 지점 제거)** — `MyPageView.tsx:610`:
   `latestDiagnostic.weakConceptIds.length > 0` → `(latestDiagnostic.weakConceptIds?.length ?? 0) > 0`, prop 도 `weakConceptIds={latestDiagnostic.weakConceptIds ?? []}`. (2줄, 로직·표시 불변)
2. **위젯 단위 격리 도입** — 신규 `src/components/ui/widget-boundary.tsx`:
   재사용 가능한 class ErrorBoundary(React 는 함수형 boundary 미제공). 위젯이 render 중 throw 하면 그 자리에서만 조용히 폴백(기본 null)하고 페이지 나머지는 유지. 비동기 fetch 실패는 react-query 가 흡수하므로 이 경계는 동기 render throw 만 대상.
3. **신규 위젯 격리 적용** — `MyPageView.tsx`: `import WidgetBoundary` 추가 후 `<ThesisJourneyProgress />` 를 `<WidgetBoundary label="thesis-journey">` 로 래핑(상관관계 있던 L2 신규 위젯 봉쇄).

## 수정하지 않은 것 (이유)
- **ThesisJourneyProgress / 4개 훅 / computeThesisProgress**: 증거상 무혐의(위 참조). 추측 수정 금지 원칙에 따라 미변경.
- **`Date.now()` purity 경고** (`MyPageView.tsx:293`, `needsRediagnosis`): 사전 존재 경고이며 **throw 아님**(impure-render 경고일 뿐, boundary 트립과 무관). 근본 수정은 useState/useEffect 도입이 필요해 최소 디프 범위를 벗어남 → 미변경.

## 권고 (후속 — 이번 최소 디프 밖)
`WidgetBoundary` 를 overview 의 나머지 fetch 구동 개인 위젯에도 확장 적용 권장:
진단평가 블록(`MyPageView.tsx` 559~648), `ThesisProgressWidget`, `GraduationChecklistCard`, `LearningEffectCard`, `ReadingResearchLoopCard`, `DefensePracticeTrendCard`, `ContinueReadingCard`, `DemandInterestCard`. 각 위젯을 개별 래핑하면 어느 위젯이 미래에 throw 해도 페이지 전체 붕괴를 구조적으로 차단. `/mypage/research` 가 계속 붕괴하면 해당 페이지 컴포넌트는 별도 조사 필요(이번 스코프는 `/mypage` overview).

## 검증 결과
- `npx tsc --noEmit` → **exit 0** (타입 에러 0).
- `npx eslint src/components/mypage/MyPageView.tsx src/components/ui/widget-boundary.tsx` → **exit 0**. `widget-boundary.tsx` 경고 0, `MyPageView.tsx` 경고 1개(사전 존재 `Date.now` purity, 신규 아님). **신규 경고 0.**
- `node scripts/check-rawcolor-ratchet.mjs` → **PASS (1/상한 1)**.
- DB/firestore.rules 무변경.
