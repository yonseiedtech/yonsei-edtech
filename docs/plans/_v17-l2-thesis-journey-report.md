# v17 L2 — 논문 여정 진행률 시각화 구현 보고서

플랜: `docs/plans/service-enhancement-plan-v17.md` L2 (192~194행)
작업 일자: 2026-07-27

## 1. 변경/신규 파일과 역할

| 파일 | 종류 | 역할 |
|---|---|---|
| `src/features/steppingstone/ThesisJourneyProgress.tsx` | 신규 | 논문 여정 4단계(계획서→설계→작성→보고서) 산출물 퍼널 진행률 위젯. 전체 진행률 바 + 4단계 노드(완료/현재/예정) + 다음 단계 CTA. 데이터 없으면 안전 안내. |
| `src/components/mypage/MyPageView.tsx` | 수정(2곳) | (1) import 추가, (2) 마이페이지 "내 연구활동" 카드 아래·`ThesisProgressWidget` 위에 `{isSelf && !readOnly && <ThesisJourneyProgress />}` 렌더. |

- H3 `JourneyStepperWidget.tsx`는 **읽기만** 하고 시각 패턴(WidgetCard, `bg-primary` 진행 바, `text-success` 완료, `bg-muted/40` 트랙, `CheckCircle2`/노드 스타일)만 참고. 미수정.
- `ThesisJourney.tsx` 내부의 기존 `JourneyOutputProgress`(연구 서브페이지 전용, editable일 때만)와 별개로, 마이페이지 메인 대시보드에 H3 톤으로 통일된 독립 위젯을 신설(플랜이 요구한 별도 컴포넌트 분리).

## 2. 단계 판정 데이터 소스 (신규 저장 없이 기존 read-only 훅 재사용)

| 단계 | 훅 (캐시 키) | 완료 판정 |
|---|---|---|
| 계획서 | `useResearchProposal` (`research_proposal`) | `proposal.titleKo \|\| purpose \|\| content` 중 1개+ (ThesisProgressWidget과 동일 기준) |
| 설계 | `useResearchDesign` (`research_design`) | `design.approach.trim()` 또는 `procedureSteps.length > 0` (ThesisJourney `hasDesign`과 동일 기준) |
| 작성 | `useWritingPaper` (`writing_paper`) + `computeThesisProgress` | 장별 작성률 `percent >= 10` (ThesisJourney `writingPercent>=10`과 동일 기준) |
| 보고서 | `useResearchReport` (`research_report`) | `fieldDescription \|\| problemDefinition \|\| fieldProblem \|\| theoryDefinition \|\| priorResearchAnalysis` 중 1개+ (자동 생성된 빈 문서 오탐 방지 위해 내용 필드 검사) |

- 캐시 키가 에디터·`ThesisProgressWidget`(proposal/writing)·`ThesisJourney`(design)와 공유되어 추가 read를 유발하지 않음.
- 현재 위치 = 첫 미완 단계(`findIndex(!done)`), H3·JourneyOutputProgress와 동일한 퍼널 규칙.

## 3. 빈 데이터 안전 처리

- `userId` 없으면 `null` 렌더(비로그인/미확정).
- 4단계 모두 미완(`doneCount === 0`, 논문 미시작)이면 퍼널 대신 "논문 여정을 시작해보세요" CTA 카드 표시 — 크래시·빈 퍼널 노출 없음.
- 각 훅은 문서 0건 시 `null`/`undefined` 반환(react-query v5 대응). `paper ?? null`, `?.`/`?? ""` 방어로 undefined 접근 없음.
- 색만이 아니라 노드 아이콘(`Check` vs 단계 아이콘) + 상태 텍스트("완료"/"진행 중"/"예정") + `aria-label` 3중 인코딩으로 a11y 확보. 진행 바에 `aria-label="논문 여정 진행률 N%"`.

## 4. 검증 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| 타입체크 | `npx tsc --noEmit` | PASS — 0 에러 (무출력) |
| 린트 | `npx eslint src/features/steppingstone/ThesisJourneyProgress.tsx src/components/mypage/MyPageView.tsx` | 0 error / 0 신규 warning (exit 0). 잔존 warning 1건은 기존 `MyPageView.tsx:292` `Date.now` 순수성 경고로, 이번 변경과 무관한 사전 존재분 |
| raw color 래칫 | `node scripts/check-rawcolor-ratchet.mjs` | PASS (1개 / 상한 1개 — 변동 없음) |

- 시맨틱 토큰만 사용(raw hex/팔레트 없음), `next/image` 무관(이미지 없음), array index key 미사용(안정 key `stage.key`), `no-explicit-any` 없음, `useMemo` 의존성 배열 정확(`[proposal, design, paper, report]`).
- DB/firestore.rules/types 무변경. build는 메인 게이트에서 수행(본 작업 미실행).
