# 주제 탐색 → 심화 질의응답 → 연구보고서 연동 고도화 제안서

- 작성일: 2026-07-30
- 범위: 읽기 전용 분석 기반 기능 제안 (코드 변경 없음)
- 전제: **기본 저장기능(추천 주제 방향 저장 + 핵심 주제 지정 + 관련영역 자동노출)은 이미 구현·LIVE**
  (`useSavedTopics.ts`, `CoreTopicBanner.tsx`, `users.savedTopicDirections` 필드, 2026-07-30).
  본 제안은 그 위에 얹는 **① 심화 질의응답**과 **② 연구보고서 자동 연동** 고도화다.

---

## 1. 현황 진단 (파일:라인 근거)

### 1-1. 주제 탐색 인터뷰 — 이미 검증된 경량 엔진

`src/features/research/topic-explorer/topic-explorer-logic.ts`
- 질문은 **순수 데이터 배열** `TE_QUESTIONS`(L50~241)로 정의. 각 질문은 `id / when?(a)=>bool / title / help / options[]` 구조(L18~24). `when` 가드로 **조건 분기**(예: `field==="school_k12"` 일 때만 학교급 세부질문, L64~76).
- 흐름 제어는 순수 함수: `teNextQuestion`(L243), `teActiveQuestions`(L251).
- 추천 산출 `teRecommend`(L375~509) → `TEResult { frames[], caution?, subjectTerms[], interestTerms[] }`(L38~46).
  - **이미 구조화된 의미 정보를 보유**: `target`(연구대상 표현, L381·`TE_FIELD_DETAIL_META` L298~315), `topic`(소재 표현, L382), `subjectTerms`(대상 라벨, L383), `interestTerms`(키워드, L384~387), `approach`(양적/질적/혼합/개발·설계, L31), `researchApproach` 상당 신호(problem×intervention 분기).

`src/features/research/topic-explorer/TopicExplorer.tsx`
- 질문 1개씩 버튼 렌더(L253~294), 답변 localStorage 보존(L79~86), 실행마다 `topicExplorationsApi` 자동 저장(L138~161).
- 추천 프레임을 `useSavedTopics.save()`로 저장(L433), 핵심 주제 토글(L223).

### 1-2. 저장된 주제 데이터 — **의미 손실 지점**

`src/types/topic-exploration.ts`
- `SavedTopicDirection`(L29~42) = `{ id, label(문장), approach?, note?, createdAt, isCore? }`.
  → **주제 문장과 접근 라벨만 남고**, 그 문장을 만든 근거(대상·현장·관심·개입 가능성 = `target/subjectTerms/interestTerms`)는 **버려진다**.
- `TopicExploration`(L10~24)에는 raw `answers`가 남지만, 이 스냅샷은 **보고서와 전혀 연결돼 있지 않다**(비교 화면 전용).

### 1-3. 연구보고서(reportdoc) — 프리필 대상 필드가 이미 존재

`src/types/research-report.ts` `ResearchReport`(L103~241) — 주제 탐색 결과와 **자연 대응되는 필드가 이미 다수**:
| 보고서 필드 | 주제 탐색 출처 |
|---|---|
| `fieldAudience`(L120) / `scopeAudience`(L136) | `target` / `subjectTerms` |
| `fieldSubject`(L124) | `topic` |
| `scopeContext`(L138) | `field`+`fieldDetail` 맥락 |
| `researchApproach`(L145, 타입 L25~31) | `approach`(양적↔analytical 등) |
| `variables`(L231, `PaperVariables` 5종) | `interestTerms`(독립변인 후보 시드) |
| `researchQuestions`(L237) | problem 유형별 문형 |

`src/features/research/ResearchReportEditor.tsx`
- `FormState`(L43~124)가 `ResearchReport`를 미러링, `fromReport()`(L204~305)로 하이드레이션, `setField`(L608)로 필드 단위 갱신.
- 최초 문서 생성 지점 `useEnsureResearchReport`(useResearchReport.ts L25~75) — **빈 문자열로만 초기화**(L36~68). 주제 시드 주입 여지 있음.

### 1-4. 재사용 가능한 인터뷰/동기화 자산

- **인터뷰 엔진 2종 존재**:
  - `ResearchReportInterview.tsx`: `SlideDef[]`(L47~68) 기반 리치 엔진(챕터·크로스레퍼런스·lint·isAnswered·references·로직맵·축하). **FormState 강결합**이라 재사용 비용 큼.
  - `ResearchProposalEditor.tsx`: `INTERVIEW_STEPS`(L206~) 기반 경량 스텝 엔진.
  - `topic-explorer-logic.ts`: **가장 가볍고 순수 함수**. 조건 분기·localStorage 보존 내장.
- **동기화 패널 선례(핵심)**: `ResearchQuestionSyncPanel.tsx` — *다른 소스(research_models)에서 생성 → 보고서 필드로 가져오기(덮어쓰기)/추가만* 하는 **import/append 비파괴 패턴**(L59~69, `canImport`/`canAppend` L54~57). `VariableSyncPanel`도 동일 패턴. → **주제→보고서 연동의 이상적 템플릿**.

### 1-5. 단절 요약 (탐색 → 구체화 → 보고서)

1. **구체화 단계 부재**: 주제 문장은 "출발점"(TopicExplorer.tsx L421)일 뿐, 변인·대상·맥락·연구문제로 좁히는 **심화 Q&A가 없다**.
2. **의미 손실**: `SavedTopicDirection`이 문장·라벨만 저장(§1-2) → 근거 정보가 보고서로 못 넘어감.
3. **연동 0**: `CoreTopicBanner`(reportdoc·reading 탭 상단, MyResearchView L434·459)는 **표시 전용** — "불러오기" 액션 없음. 사용자는 탐색에서 답한 내용을 보고서에 **손으로 재입력**해야 함.

---

## 2. 심화 질의응답 설계

### 2-1. 원칙
- **엔진 재사용**: `topic-explorer-logic.ts`의 질문-배열+`when` 패턴을 그대로 차용(신규 엔진 금지). 새 파일 `topic-deepdive-logic.ts`에 `DD_QUESTIONS` + `ddRecommend()` 순수 함수만 추가.
- **시드 주입**: 핵심 주제(`useCoreTopic()`)와 그 원본 탐색 답변(`TopicExploration.answers`)을 시드로 받아, 이미 아는 정보는 **되묻지 않고 프리셀렉트**.
- **데이터 최소 확장**: 신규 컬렉션·rules 없이 `SavedTopicDirection`에 옵셔널 `deepDive` 한 덩어리만 추가.

### 2-2. 질문 세트 예시 (변인·대상·맥락·연구문제 구체화)
핵심 주제 approach에 따라 분기(양적/개발형은 변인 질문 강화, 질적은 맥락·현상 강화).

| # | 질문(prompt) | 시드/분기 | 산출 필드 |
|---|---|---|---|
| D1 | "이 주제에서 **바꾸려는 것(처치·투입)**은 무엇인가요?" | `topic`/`interestTerms` 프리셀렉트 | `variables.independent[]` |
| D2 | "그 결과 **무엇이 달라지길** 기대하나요? (성과·태도·행동)" | problem=effect면 성과 예시 | `variables.dependent[]` |
| D3 | "중간에서 작용하거나(매개) 조건이 되는(조절) 요인이 있나요?" | 선택, 없으면 skip | `variables.mediating/moderating[]` |
| D4 | "**연구 대상**을 더 좁혀볼까요? (학년·인원·소속)" | `target`+`subjectTerms` 프리필 | `population`(→ `scopeAudience`) |
| D5 | "이 교육은 **어떤 환경·기간·도구**에서 이뤄지나요?" | `field`/`fieldDetail` 맥락 | `context`(→ `scopeContext`) |
| D6 | "다루지 **않을** 범위가 있나요?" | 선택 | `scopeExclusion` |
| D7 | "위 변인·대상으로 **연구문제 문장**을 만들어볼까요?" | D1~D4 조합 자동 초안 → 편집 | `researchQuestions[]` |

- D7은 D1~D4를 조합해 문형 자동 생성(기존 `lib/research-question-generator.ts` 문형 재사용 검토). 사용자는 문장을 편집.
- 진행 UI는 TopicExplorer의 단계형 렌더(버튼/텍스트 입력) 재사용. 결과는 즉시 프리뷰.

### 2-3. 결과 데이터 구조 (모델 최소 확장)
`src/types/topic-exploration.ts`에 추가:
```ts
export interface TopicDeepDive {
  variables?: PaperVariables;          // 보고서 variables 와 동일 구조(재사용)
  population?: string;                 // 연구 대상 구체화
  context?: string;                    // 환경·기간·도구
  exclusion?: string;                  // 제외 범위
  researchQuestions?: string[];        // 연구문제 초안
  updatedAt?: string;
}
export interface SavedTopicDirection {
  /* 기존 필드 그대로 */
  deepDive?: TopicDeepDive;            // ← 추가 (옵셔널, 구버전 호환)
}
```
- 저장 경로는 기본 기능과 동일하게 `profilesApi.update(user.id, { savedTopicDirections })` (useSavedTopics의 낙관적 update+롤백 패턴 재사용, useSavedTopics.ts L52~66).
- `PaperVariables`를 그대로 써 **보고서 `variables` 필드와 무변환 연동**.

### 2-4. 진입점
- TopicExplorer 결과 카드의 저장 버튼 옆에 **"이 주제 더 좁히기(심화)"** CTA 추가(추천 프레임 영역 L430~450 근처).
- 핵심 주제가 지정돼 있으면 `CoreTopicBanner`에서도 심화 진입 가능.

---

## 3. 연구보고서 연동 설계 (권장 + 대안 비교)

| 안 | 방식 | 장점 | 위험 | 판정 |
|---|---|---|---|---|
| **A. 생성 시 프리필** | `useEnsureResearchReport` 최초 생성 시 coreTopic.deepDive를 시드 | 무마찰·자동 | **1회성**(빈 보고서에만), 이미 보고서 있으면 무효 | 보조 채택 |
| **B. 불러오기 액션 패널** | 보고서에 `TopicDeepDiveSyncPanel`(ResearchQuestionSyncPanel 복제) — 필드별 가져오기/추가만 | **선례 그대로**, 편집 보존, 명시적 동의, 언제든 재실행 | 사용자가 버튼 눌러야 함 | **권장(주)** |
| C. 단일 소스 자동 동기화 | 주제 deepDive ↔ 보고서 실시간 바인딩 | 항상 최신 | 보고서는 수동 대량 편집 모델 → **덮어쓰기 충돌**(에디터가 이미 last-write-wins 경고 방어, Editor L619~630) | 기각 |

### 권장안: **B 주 + A 보조**
1. **B (핵심)**: `TopicDeepDiveSyncPanel`을 `ResearchQuestionSyncPanel.tsx`(L35~195) 복제로 신설.
   - 매핑: `deepDive.variables → form.variables`(VariableSyncPanel 자리), `population → scopeAudience`, `context → scopeContext`, `exclusion → scopeExclusion`, `researchQuestions → form.researchQuestions`, `topic → fieldSubject`, `approach → researchApproach`.
   - **비파괴 규칙**(선례 L54~57 준수): 대상 필드가 비어 있으면 "가져오기", 이미 값이 있으면 "추가만"/"건너뜀"으로 처리해 **사용자 편집 절대 미덮어씀**.
   - 배치: 보고서 `theory` 스텝의 변인/연구문제 패널 상단(Editor L1051~1072) + `field` 스텝 범위 카드 근처.
2. **A (보조)**: 보고서가 아직 없을 때 최초 생성 시에만 deepDive로 시드(빈 문서 한정이라 충돌 없음).
3. **CoreTopicBanner 승격**: 표시 전용(CoreTopicBanner.tsx L24~41) → "연구보고서에 불러오기" CTA 추가(패널로 스크롤/트리거).

### 정합성·권한
- 소유권: deepDive는 본인 프로필 필드 → 보고서도 `isSelf` 게이트(MyResearchView L432·437). 콘솔 열람(readOnly)에서는 패널 미노출(선례 `readOnly` 계약 재사용).
- 중복 방지: import 전 현재 값과 비교(`sameQuestions` 유사 로직) 후에만 활성.

---

## 4. 우선순위 백로그

형식: [문제 → 해결 → 기대효과 → 난이도 → 영향 파일/컬렉션 · 기본기능 의존]

### P0 — 연동의 뼈대 (심화 없이도 즉시 가치)
- **P0-1. 주제 근거 보존 확장**
  문제: `SavedTopicDirection`이 문장·라벨만 저장(§1-2), 대상·맥락·키워드 유실.
  해결: 저장 시 `frame`의 `target/subjectTerms/interestTerms/approach`를 함께 담도록 `SavedTopicDirection`에 `seed?` 필드 추가(또는 deepDive.seed).
  기대: 심화·보고서 연동의 입력 확보. 난이도: **S**.
  파일: `types/topic-exploration.ts`, `useSavedTopics.ts`(save), `TopicExplorer.tsx`(save 호출부 L433). 의존: 기본 저장기능 위에 직접 확장.
- **P0-2. 보고서 "주제 불러오기" 패널 (B안)**
  문제: CoreTopicBanner가 표시 전용 → 재입력 노동.
  해결: `TopicDeepDiveSyncPanel` 신설(ResearchQuestionSyncPanel 복제), 최소 매핑(`topic→fieldSubject`, `approach→researchApproach`, `target→scopeAudience`)부터.
  기대: 탐색→보고서 1클릭 이관. 난이도: **M**.
  파일: 신규 `TopicDeepDiveSyncPanel.tsx`, `ResearchReportEditor.tsx`(패널 삽입 L829·L1051 근처). 의존: P0-1.

### P1 — 심화 질의응답 본체
- **P1-1. 심화 Q&A 엔진·질문셋**
  문제: 구체화 단계 부재(§1-5).
  해결: `topic-deepdive-logic.ts`(질문 배열+`ddRecommend`, topic-explorer 패턴 재사용) + `TopicDeepDive.tsx`(TopicExplorer 렌더 재사용). §2-2 질문셋.
  기대: 변인·대상·맥락·연구문제 산출. 난이도: **M**. 파일: 신규 2종 + `topic-exploration.ts`(TopicDeepDive 타입). 의존: P0-1.
- **P1-2. 심화 결과 → 보고서 전 필드 매핑**
  문제: P0-2는 최소 매핑만.
  해결: `variables/population/context/exclusion/researchQuestions` 전체를 패널 매핑에 연결(§3 매핑표), 비파괴 import/append.
  기대: 완전 프리필. 난이도: **M**. 파일: `TopicDeepDiveSyncPanel.tsx`. 의존: P0-2·P1-1.
- **P1-3. CoreTopicBanner 액션 승격**
  해결: 배너에 "심화하기"·"보고서에 불러오기" CTA. 난이도: **S**. 파일: `CoreTopicBanner.tsx`. 의존: P1-1·P1-2.

### P2 — 완성도·확장
- **P2-1. 생성 시 자동 시드(A안)**: `useEnsureResearchReport` 최초 생성 시 deepDive 시드(빈 문서 한정). 난이도: **S**. 파일: `useResearchReport.ts` L36~68. 의존: P1-1.
- **P2-2. 계획서(proposal)로 동일 연동**: `ResearchProposal`도 `variables/researchQuestions` 보유(research-report.ts L265~267) → 동일 패널 재사용. 난이도: **S**. 파일: `ResearchProposalEditor.tsx`.
- **P2-3. 연구방법 마법사 연동**: `frame.methodSeedKeys`(logic L35)로 심화 결과에 연구방법 가이드 링크. 난이도: **S**.

---

## 5. 단계적 실행 순서
1. P0-1(근거 보존) → P0-2(최소 불러오기 패널) — **심화 없이도 즉시 탐색→보고서 다리 확보**.
2. P1-1(심화 엔진) → P1-2(전 필드 매핑) → P1-3(배너 승격) — **탐색→구체화→보고서 완결**.
3. P2(자동 시드·계획서 확장·방법 연동) — 완성도.

## 6. 재사용/비확장 원칙 (요약)
- 인터뷰: `topic-explorer-logic.ts` 질문-배열 패턴 재사용(신규 엔진 금지).
- 연동: `ResearchQuestionSyncPanel`/`VariableSyncPanel`의 import/append 비파괴 패턴 복제.
- 저장: `useSavedTopics` 낙관적 update, `profilesApi`(신규 컬렉션·rules 불필요).
- 데이터: `SavedTopicDirection`에 `deepDive`(+`seed`) 옵셔널 1덩어리, `PaperVariables` 재사용으로 무변환 연동.
- 시맨틱 토큰·기존 UI 컴포넌트 그대로 사용.
