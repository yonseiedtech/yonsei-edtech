# 마이페이지 간헐 런타임 크래시 — `X.filter is not a function` 진단·수정

작성: 2026-07-30 / debugger
범위: `/mypage`(base 개요) · `/mypage/research?tab=explore` 양쪽에서 트립하던 `[error:마이페이지] TypeError: X.filter is not a function`(X minified) 폴백.
제약: 크래시 수정만, 배포/커밋 금지, `next build` 금지. 검증은 tsc + eslint.

---

## 1. 핵심 규명 (조사 결과 — 오탐 배제 근거)

### (A) Firestore **목록 결과**는 크래시 원인이 아님 — 항상 배열 보장
`dataApi.list`(`src/lib/bkend.ts:308`)는 `snapshot.docs.map(...)` 결과를 `{ data: <배열> }` 로 반환한다(`:327-329`). 따라서 이 위에 얹힌 모든 `listByUser`/`list`/`listByProfile` 계열의 `res.data` 는 **항상 배열**이다.
- 그 결과 아래 후보들은 전부 **안전**함을 확인(오탐 배제):
  - `MyResearchView` 의 `history.filter`(`:204`) — `useWritingPaperHistory` 는 `data ?? []`, queryFn 은 정렬된 배열 반환 → history 는 항상 배열. **작업 지시서의 1순위 후보였으나 크래시 아님**.
  - `useResearchPapers`/`useStudySessions`/`usePosts`/`useSeminars` 및 `MyPageView` 내 `posts/seminars/activities/certificates/papers` 소비 — 모두 배열(대부분 `Array.isArray` 선방어까지 되어 있음).
  - 개요 위젯 `LearningStreak`·`ProfileViewsWidget`·`MyActivityHub`·`ThesisJourney`·`ResearchCockpit`·`TopicExplorer(history)` — 모두 배열 안전.
  - 개요의 개인 위젯 다수는 `WidgetBoundary` 로 격리되어 페이지 경계를 트립하지 않음.

### (B) 진짜 원인 클래스 = **단일 문서 필드**가 레거시 레코드에서 **비배열**
`?? []` 와 옵셔널 체이닝(`x?.method`)은 **null/undefined 만** 막고 **truthy 비배열**(문자열·객체)은 통과시킨다. 이 값에 `.some/.filter/.includes/.forEach/spread` 를 호출하면 `... is not a function` / `not iterable` 크래시.
공유 데이터 소스는 **졸업생 학위논문(AlumniThesis)** 과 **아카이브 개념/변인(ArchiveConcept/Variable)** 문서이며, 그 배열 필드(`keywords`,`analysis.subjects`,`analysis.researchMethods/statMethods`,`conceptIds`,`variableIds`,`measurementIds`,`altNames`,`tags`)가 일부 레거시 문서에서 비배열로 저장돼 있으면 크래시.

이 데이터는 **양쪽 경로의 공유 컴포넌트**에서 소비된다(작업 지시서의 "여러 탭에서 공유되는 컴포넌트" 가설과 정확히 일치):
- `/mypage/research?tab=explore` → `teMatchTheses`/`teMatchConcepts`(주제 탐색 결과 매칭). **MyResearchView 에는 WidgetBoundary 가 전혀 없어** 여기서의 throw 가 곧바로 `/mypage/error.tsx` 페이지 경계를 트립.
- `/mypage`(개요) → `DiagnosticWeakConceptPath`(약점 개념→변인→측정도구→졸업생 논문 큐레이션) + `thesisMethodTags`.

### 재현 조건 (간헐·데이터 의존 설명)
- explore: **이전에 주제 탐색을 완료한 사용자**만 localStorage 답변 복원으로 `result` 가 로드 시점에 존재 → `enabled:!!result` 인 theses/concepts 쿼리 실행 → `teMatch*` 가 레거시 논문/개념 필드를 만나면 크래시. 신규 사용자는 질문만 보여 `result` 없음 → 미실행 → 정상. 관리자 계정이 지금 정상인 것과 부합.
- 개요: 최근 진단에 `weakConceptIds` 가 있는 사용자에서 약점 개념의 변인/측정도구·연결 논문을 조회할 때, 해당 개념/변인/논문 문서의 필드가 비배열이면 크래시.

---

## 2. 수정 내역 (모두 **소비 지점 방어** — 데이터 원본 불변)

### 파일 1 — `src/features/research/topic-explorer/topic-explorer-logic.ts`
`teMatchTheses` (before → after):
```ts
// before
const keywords = t.keywords ?? [];
const subjects = t.analysis?.subjects ?? [];
// after
const keywords = Array.isArray(t.keywords) ? t.keywords : [];
const subjectsRaw = t.analysis?.subjects;
const subjects = Array.isArray(subjectsRaw) ? subjectsRaw : [];
```
`teMatchConcepts` (before → after):
```ts
// before
const hay = [c.name, ...(c.altNames ?? []), ...(c.tags ?? [])].join(" ").toLowerCase();
// after
const altNames = Array.isArray(c.altNames) ? c.altNames : [];
const tags = Array.isArray(c.tags) ? c.tags : [];
const hay = [c.name, ...altNames, ...tags].join(" ").toLowerCase();
```
→ `keywords.some`/`subjects.includes`/`spread altNames·tags` 크래시 차단. **explore 크래시(주 보고 경로) 해소.**

### 파일 2 — `src/components/mypage/DiagnosticWeakConceptPath.tsx`
```ts
// before
(concept?.variableIds ?? []).forEach((vid) => {
  const variable = allVariables.find((v) => v.id === vid);
  variable?.measurementIds?.forEach((mid) => measurementIds.add(mid));
});
...
const theses = allTheses.filter((t) => t.conceptIds?.includes(cid))
// after
const variableIds = concept && Array.isArray(concept.variableIds) ? concept.variableIds : [];
variableIds.forEach((vid) => {
  const variable = allVariables.find((v) => v.id === vid);
  const mIds = variable && Array.isArray(variable.measurementIds) ? variable.measurementIds : [];
  mIds.forEach((mid) => measurementIds.add(mid));
});
...
const theses = allTheses.filter((t) => Array.isArray(t.conceptIds) && t.conceptIds.includes(cid))
```
→ `variableIds/measurementIds.forEach`·`conceptIds.includes` 비배열 크래시 차단. **개요(base) 경로 방어.**

### 파일 3 — `src/lib/alumni-thesis-crosslink.ts`
```ts
// before
const tags = [...(t.analysis?.researchMethods ?? []), ...(t.analysis?.statMethods ?? [])]
  .map((s) => s.trim()).filter(Boolean);
// after
const methods = Array.isArray(t.analysis?.researchMethods) ? t.analysis.researchMethods : [];
const stats = Array.isArray(t.analysis?.statMethods) ? t.analysis.statMethods : [];
const tags = [...methods, ...stats].map((s) => s.trim()).filter(Boolean);
```
→ 개요의 졸업생 논문 방법 태그 렌더 시 spread "not iterable" 차단.

---

## 3. 특정 여부
- **원인 필드 특정: 예(클래스 단위).** AlumniThesis(`keywords`,`analysis.subjects/researchMethods/statMethods`,`conceptIds`) 와 ArchiveConcept/Variable(`variableIds`,`measurementIds`,`altNames`,`tags`) 의 **레거시 비배열** 값.
- 정확한 minified 메서드가 `.filter` 로 관측됐으나, 동일 클래스의 `.some/.includes/.forEach/spread` 도 같은 근본 원인(비배열 필드)이며 모두 방어함. (list 결과·프로필 배열 필드는 배열 보장이라 오탐 배제됨.)

## 4. 잔여 위험 / 미변경 (의도)
- **동일 클래스의 다른 소비처**: 편집기 탭(ResearchReportEditor/ProposalEditor/WritingPaperEditor/ResearchDesignEditor/LiteratureMatrix)의 `(report.theoryCards ?? []).filter`, `(design.procedureSteps ?? []).some`, `(card.concepts ?? []).map` 등도 **단일 문서 필드 `?? []`** 패턴이라 이론상 동일 취약성 존재. 단, 본 보고 크래시 경로(개요·explore)가 아니고 과도한 변경을 지양하라는 지시에 따라 **이번 스코프에서 제외**. 후속 라운드에서 동일 전략(Array.isArray)으로 일괄 하드닝 권장.
- **근본적 예방**: `serializeDoc`/API 경계에서 알려진 배열 필드를 정규화하면 전 소비처가 안전해지나, 지시(“데이터 원본 불변·소비 지점 방어”)에 따라 미적용.
- **병렬 경계 준수**: topic-save 신규 파일(`useSavedTopics.ts`·`CoreTopicBanner.tsx`)·대시보드 영역 미변경.

## 5. 검증
- `npx tsc --noEmit` → **0 errors**.
- `npx eslint <3개 변경 파일>` → **exit 0, 0 error / 0 warning**(래칫 146 이내).
- `next build` 미실행(지시 준수 — 메인 게이트).
