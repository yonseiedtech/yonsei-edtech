# 연구 편집기 레거시 비배열 필드 일괄 하드닝

작성: 2026-07-30 / executor
근거: `docs/plans/_mypage-filter-crash-fix.md` §4(잔여 위험) — 편집기 탭의 단일 문서 배열 필드 `?? []` 패턴이 동일 취약성.
제약: 하드닝만. commit/push/배포 금지, `next build` 금지. 검증은 tsc + eslint.

---

## 1. 문제(핫픽스와 동일 클래스)

`?? []` 와 옵셔널 체이닝(`x?.method`)은 **null/undefined 만** 막고 **truthy 비배열**(레거시 문자열·객체)은 통과시킨다. 그 값에 `.filter/.map/.some/.forEach/.reduce/.join/.length`·spread(`...x`)를 호출하면 `X is not a function` / `not iterable` 크래시. 단일 Firestore 문서(research_report·research_proposal·research_design·writing_paper·research_paper)의 배열 필드가 일부 레거시 레코드에서 비배열이면 편집기 탭이 크래시(편집기엔 WidgetBoundary 없음 → 페이지 경계 트립).

## 2. 방식 — 하이드레이션 경계 정규화(우선)

각 편집기가 문서를 폼 상태로 로드하는 함수에서 **알려진 배열 필드를 `Array.isArray` 로 정규화**해 이후 전 소비처를 한 번에 안전화. 공용 헬퍼로 묶음. **데이터 원본 불변**(Firestore write 없음, 읽기/소비 경계 방어만).

### 공용 헬퍼 — `src/features/research/normalize-arrays.ts` (신규)
- `asArray<T>(v): T[]` — `Array.isArray(v) ? v : []`.
- `normalizeVariables(v)` — `PaperVariables` 의 5종 변인 배열(independent·dependent·mediator·moderator·control) 정규화. **원래 존재하던 키만** 유지·정규화(새 키 미추가)해 동기화 판정(sameVariables) 동작 보존.

## 3. 변경 파일·필드 (정규화 vs 가드)

| 파일 | 경계 함수 | 정규화한 필드 | 방식 |
|---|---|---|---|
| `ResearchReportEditor.tsx` | `fromReport` / `migrateTheoryCards` | `problemPhenomena`·`problemEvidences`·`problemCauses`·`problemMeasurements`·`taskSteps`(마이그레이션 조건에 `Array.isArray` 추가), `priorResearchPaperIds`, `priorResearchGroups`(+중첩 `paperIds`), `researchQuestions`, `theoryCards`(+중첩 `concepts`), `variables` | 경계 정규화 |
| `ResearchProposalEditor.tsx` | `fromProposal` | `referencePaperIds`, `researchQuestions`, `variables` | 경계 정규화 |
| `WritingPaperEditor.tsx` | `fromPaper` / `normalizeSections` | `sections[k]`·`paragraphs`(마이그레이션 조건에 `Array.isArray`), `abstractKeywords`, `researchQuestions`(+중첩 `statMethodIds`·`researchMethodIds`), `appendices`, `ethicsChecked`, `instruments`, `procedureSteps` | 경계 정규화 |
| `design/types.ts` | `fromDesign` | `procedureSteps`, `instruments`, `selectedStatMethods`, `ethicsChecked` | 경계 정규화 |
| `literature-matrix.ts` | `readonlyCellValue` | `ResearchPaper.variables.{independent,dependent,mediator,moderator}` | 산발 소비지점 가드(`Array.isArray`) |

- **literature-matrix 가드 이유**: papers 는 `list` 결과(항상 배열)이나, 각 논문 문서의 `variables` **서브필드**는 단일 문서 필드라 레거시 비배열 가능. `v.independent?.length` 통과 후 `.join` 크래시 → 하이드레이션 경계가 없는 소비처라 지점 가드.
- **중첩 배열 정규화**: `variables.*`, `theoryCards[].concepts`, `priorResearchGroups[].paperIds`, `researchQuestions[].statMethodIds/researchMethodIds`, `sections[].paragraphs` — 각 항목이 `for...of`/spread/`.join`/`.map` 으로 iterate 되어 함께 정규화.

## 4. 오검출 배제(미변경) 근거

- **useQuery `list` 결과**: `dataApi.list` → 항상 배열 보장. `useResearchPapers`/`useStudySessions` 등 목록 소비는 미변경.
- **리터럴/확정 배열**: `STEPS`·`INTERVIEW_STEPS`·`CHAPTER_KEYS`·`SECTION_GUIDES`·`ASSUMPTION_GUIDES` 등 모듈 상수 미변경.
- **이미 `Array.isArray` 가드된 곳**: `LiteratureMatrix.saveCell` 의 낙관적 캐시 반영(`Array.isArray(prev)`) 미변경.
- **객체(비배열) 필드**: `participants`·`programDesign`·`designConditions`(`{...EMPTY, ...(d.x ?? {})}`), `chapters`(Record<string,string>) — 배열 메서드 소비 아님, 미변경.
- **병렬 경계 준수**: 이미 수정된 `topic-explorer/topic-explorer-logic.ts`·`DiagnosticWeakConceptPath.tsx`·`alumni-thesis-crosslink.ts`, topic-save 신규 파일, 대시보드 영역 미변경.

## 5. 규율

기존 동작·UX 무변경(방어만 추가). 시맨틱 토큰·타입 안전 유지. `normalizeVariables` 는 기존 키만 보존해 동기화 버튼 활성 판정 불변.

## 6. 검증

- `npx tsc --noEmit` → **exit 0, 0 errors**.
- `npx eslint <변경 6파일>` → **exit 0, 0 error / 0 warning**(래칫 146 이내).
- `next build` 미실행(지시 준수 — 메인 게이트).
