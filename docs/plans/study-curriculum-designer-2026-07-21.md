# 스터디 교수설계 마법사 (Study Curriculum Designer)

작성일: 2026-07-21 · 상태: 구현 완료(검증 통과)

교수설계 마스터처럼 **다양한 조건에 맞춘** 회차 커리큘럼을 규칙 기반으로 설계한다.
고정 프리셋이 아니라 조건 입력 → 설계 규칙 매핑 → 회차별 커리큘럼 초안 생성 → 편집 → 스터디 회차로 스캐폴딩.

- **LLM 호출 없음.** 순수 규칙 함수 + 수동 편집이 정본.
- **신규 컬렉션 없음.** 기존 `activity_progress`(회차) + `activities`(스터디 문서) 확장으로 구현.

---

## 1. 화면 흐름

```
스터디 상세 → [진행 현황] 탭 → "교수설계 마법사" 버튼(스터디, 운영진/모임장)
  └ Dialog 1단계: 조건 입력(전부 선택형, ~1분)
       스터디 유형 / 목표 유형 / 총 회차 수(2~16) / 주당 시간 / 인원 규모 / 학습자 수준 / 시작 날짜
  └ [커리큘럼 초안 생성] → generateCurriculum() (순수 함수)
  └ Dialog 2단계: 초안 편집
       · 적용 설계 모형 배지(근거 이론 title) + 아카이브 개념 딥링크(실재 개념만)
       · 회차별 표: 주제 / 학습목표 / 활동 구성 / 과제  (편집·추가·삭제·순서 이동)
  └ [N개 회차로 저장]
       · activityProgress 회차 일괄 생성(objective/activityPlan/assignment/designPhase)
       · activities.curriculumDesign 설계 메타 저장
소비:
  스터디 주차 페이지(/activities/studies/[id]/weeks/[week])
    · "이번 회차 목표" 카드(objective/활동 구성/과제)
    · 마지막 회차: 회차별 목표 달성 점검(달성/부분/미달) → activities.curriculumGoalCheck 저장
건너뛰기: 마법사를 쓰지 않고 기존 "주차 추가"/"주 단위 일괄 생성" 그대로 사용 가능(기존 흐름 불변).
```

---

## 2. 조건 → 설계 규칙 매핑

### (a) 목표 유형 → 기반 설계 모형 · 회차 활동 골격

| 목표 유형 | 기반 모형 (근거 이론) | 회차 활동 골격 | 아카이브 개념(실재) |
|---|---|---|---|
| 지식 이해 | 가녜 9 수업사태 축약 (Gagné's Nine Events) | 발제 → 핵심 쟁점 토론 → 정리 퀴즈로 이해 점검 | 학습의 조건, 교수설계 모형 |
| 기능 숙달 | 메릴 시연-적용 원리 (Merrill's First Principles) | 시연 → 함께 따라하기 → 개별 독립 연습 → 상호 피드백 | 스캐폴딩, 피드백 |
| 산출물 완성 | PBL + 백워드 설계 | 최종 산출·성공 기준 정의(앞) → 마일스톤 역산 → 중간 크리틱 | 프로젝트 기반 학습, 문제 기반 학습, 교수설계 모형 |
| 시험 합격 | 완전학습 + 간격 반복 | 개념 정리 → 문제풀이 → 오답 복습(간격) → 후반 모의고사 (암기카드 연계) | 완전학습, 반복 |
| 연구 성과 | 인지적 도제 + 세미나식 | 문헌 발제 → 방법 워크숍 → 초안 크리틱 → 발표 리허설 | 인지적 도제, 자기주도학습 |

학습목표 문장은 목표 유형별 **Bloom 동사군**을 순환 적용:
- 지식: "설명할 수 있다 / 비교할 수 있다 / 요약해 정리할 수 있다"
- 기능: "직접 수행할 수 있다 / 절차대로 구현할 수 있다 / 응용해 적용할 수 있다"
- 산출물: "설계·기획할 수 있다 / 완성해 산출할 수 있다 / 통합해 개선할 수 있다"
- 시험: "정확히 풀이할 수 있다 / 유형을 변별할 수 있다 / 빠르고 정확하게 해결할 수 있다"
- 연구: "비판적으로 분석할 수 있다 / 종합해 논증할 수 있다 / 평가·검증할 수 있다"

### (b) 수준 → 스캐폴딩 강도

| 수준 | 규칙 | 추가 배지 |
|---|---|---|
| 입문 위주 | 전반부에 "기초 개념·용어 다지기" 회차 추가 + 매 회차 "가이드 자료 함께 읽기" 슬롯 | 스캐폴딩 강화 |
| 혼합 | 전개 회차에 "짝 활동(동료 교수)" 삽입 | 스캐폴딩 강화 |
| 중급+ | 자기주도 심화 비중↑(과제에 "자기주도 심화 항목") · 가이드 최소화 | — |

### (c) 인원 → 상호작용 구조

| 인원 | 상호작용 활동 | 추가 배지 |
|---|---|---|
| 2~4 | 전원 발제 로테이션 | — |
| 5~8 | 소그룹 토의 후 전체 공유 | 협력 상호작용 |
| 9+ | 팀 분할·팀별 산출물 | 협력 상호작용 |

### (d) 회차 수 → 시퀀스 자동 배분

```
오리엔테이션(1회차: 목표 합의·규칙)
  [입문 위주 & N≥4 → 기초 다지기 1회차 추가]
전개(위 골격 반복 — 스터디 유형별 주제 라벨: 논문 리뷰 N / 핵심 단원 N / 마일스톤 N / 연구 세션 N / 실습 N)
통합·평가(마지막 1~2회차: N≥7이면 2회 — 산출·성과 공유 + 전체 회고·목표 달성 점검)
```
각 회차: 주제 슬롯 · 학습목표(Bloom) · 활동 구성(골격 + 스캐폴딩 + 상호작용) · 과제 제안.

---

## 3. 데이터 모델 (기존 확장)

### `ActivityProgress` (activity_progress) — 회차, 필드 추가 (src/types/operations.ts)
```ts
objective?: string;      // 학습목표 문장(Bloom) → "이번 회차 목표" 카드
activityPlan?: string;   // 활동 구성(줄바꿈 구분)
assignment?: string;     // 과제 제안
designPhase?: "orientation" | "development" | "integration";
```
- 저장: 마법사 `activityProgressApi.create({ ..., objective, activityPlan, assignment, designPhase })`
- Firestore 규칙: `activity_progress` 는 운영진/모임장 게이트만 있고 필드 화이트리스트가 없어 **규칙 변경 불필요**.

### `Activity` (activities) — 스터디 문서 (index signature `[key: string]: unknown` 활용, 타입 변경 없음)
```ts
curriculumDesign?: CurriculumDesignMeta;                      // 조건·모형·안내·생성시각
curriculumGoalCheck?: Record<string, "met"|"partial"|"unmet">; // { [progressId]: 상태 }
```

### 규칙 엔진 타입 (src/lib/study-curriculum-designer.ts)
`CurriculumConditions` · `DesignModel` · `SessionDraft` · `CurriculumDraft` · `CurriculumDesignMeta`
핵심 함수: `generateCurriculum(conditions)` · `clampSessionCount(n)` · `buildDesignMeta(conditions, draft)`

---

## 4. 파일 목록

| 파일 | 역할 |
|---|---|
| `src/lib/study-curriculum-designer.ts` (신규) | 순수 규칙 엔진 — 조건→모형→회차 초안. LLM 없음 |
| `src/features/activities/StudyCurriculumWizard.tsx` (신규) | 2단계 마법사 Dialog(조건 입력 → 초안 편집·저장) |
| `src/features/activities/StudyCurriculumGoalCheck.tsx` (신규) | 마지막 회차 목표 달성 점검 카드 |
| `src/types/operations.ts` (수정) | ActivityProgress 에 objective/activityPlan/assignment/designPhase 추가 |
| `src/features/activities/ActivityDetail.tsx` (수정) | 진행 현황 탭에 "교수설계 마법사" 버튼 + 마법사 렌더 |
| `src/features/activities/ActivityWeekDetailPage.tsx` (수정) | "이번 회차 목표" 카드 + 마지막 회차 목표 달성 점검 |

---

## 5. 아카이브 개념 딥링크 정합성

- 개념은 Firestore 동적 id → `/archive/concept/{id}`. `useConceptIndex()` 로 이름→id 해석.
- 배지에 연결하는 개념명은 **archive-seed.ts 에 실재하는 표제어만** 사용(grep 검증):
  학습의 조건 · 스캐폴딩 · 피드백 · 프로젝트 기반 학습 · 문제 기반 학습 · 교수설계 모형 · 완전학습 · 반복 · 인지적 도제 · 자기주도학습 · 협력학습.
- 색인에 없는 이름은 딥링크를 렌더하지 않음(깨진 링크 방지).

---

## 6. 규율 준수

- 시맨틱 토큰(primary/muted/foreground 등) · 기존 폼 관행(raw `<select>`, Input/Textarea/Dialog) 준수.
- 과설계 금지: 자동 문서 생성기·LLM 연동 없음. 규칙 초안 + 수동 편집.
- 마법사 선택 단계 — 건너뛰면 기존 생성 흐름 불변.
- 검증: `npx tsc --noEmit` src 에러 0 · `npx eslint src --quiet` 통과. build/commit 미수행.
