# 주제 탐색 → 연구보고서 연동 P0 구현 (2026-08-05)

근거: `docs/plans/topic-deepdive-report-sync-proposal.md` §4 P0 (P0-1 근거 보존 + P0-2 불러오기 패널).

## P0-1. 주제 근거 보존 (seed)
- `topic-explorer-logic.ts`: `TEResult`에 `target`·`topic` 노출(teRecommend 내부 계산값을 반환에 추가). 기존 sentence에만 녹아 있던 대상·소재를 구조화 재사용 가능하게.
- `types/topic-exploration.ts`: `TopicSeed` 신설(target·topic·subjectTerms·interestTerms·approach, 전부 옵셔널) + `SavedTopicDirection.seed?` 추가. 구버전(seed 없는) 저장분 호환.
- `useSavedTopics.ts`: `save(input.seed?)` 수용 → 엔트리에 조건부 저장(낙관적 update 패턴 그대로).
- `TopicExplorer.tsx`: 저장 버튼(L433)에서 `result.target/topic/subjectTerms/interestTerms` + `frame.approach`를 seed로 전달.

## P0-2. 보고서 "핵심 주제에서 불러오기" 패널
- 신규 `TopicDeepDiveSyncPanel.tsx`: `useCoreTopic()`의 seed를 읽어 보고서 필드에 **비파괴** 반영(ResearchQuestionSyncPanel/VariableSyncPanel import/append 패턴).
  - 최소 매핑: `seed.topic → fieldSubject`, `seed.target(||subjectTerms[0]) → fieldAudience`, `mapApproach(seed.approach||core.approach) → researchApproach`.
  - `mapApproach`: 양적→analytical, 질적/개발·설계→generative, 혼합→mixed_methods.
  - **빈 칸만 채움**(사용자 입력 미덮어씀). 미리보기에 "채움/입력됨" 배지. 채울 것 없으면 버튼 disabled + 안내.
  - `readOnly`(콘솔 열람)면 미노출. 핵심 주제 없으면 null.
- `ResearchReportEditor.tsx` `Field11Context`(1-1 교육 현장) 상단에 삽입 — fieldSubject·fieldAudience가 같은 스텝에 있어 채움 결과가 즉시 보임. onApply가 `setField`로 필드별 반영.

## 데이터/정합성
- 신규 컬렉션·rules 없음(users.savedTopicDirections[].seed). isSelf 편집에서만(readOnly 미노출).
- 접근 매핑에서 target을 fieldAudience로 매핑(제안서의 scopeAudience 대신 — 같은 스텝 가시 필드 우선). scopeAudience/context/exclusion·변인·연구문제 전 필드 매핑은 P1-2로 이월.

## 검증
- TSC 0 / ESLint(변경 6파일) 0 / rawcolor 1 / eslint-warning 래칫 / next build.
- QA: 주제 탐색 저장(seed 포함) → 핵심 지정 → 보고서 1-1 스텝 상단 패널 노출·빈 칸 채움.
