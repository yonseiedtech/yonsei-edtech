# 스터디 교수설계 마법사 — 논문 작성 유형 추가 (2026-07-21)

## 변경 배경
사용자 피드백: "논문읽기/논문 작성 스터디 외에도 바이브코딩 스터디 등도 있어"
→ (1) 논문 작성 스터디 유형 신규 추가, (2) 도구·코딩 실습 라벨에 바이브코딩 예시 명시.

---

## 수정 파일

### `src/lib/study-curriculum-designer.ts`

| 변경 위치 | 내용 |
|---|---|
| `StudyKind` 타입 | `"thesis_writing"` 추가 |
| `STUDY_KIND_LABELS` | `tool_coding` → `"도구·코딩 실습 (바이브코딩 등)"`, `thesis_writing` → `"논문 작성"` |
| `DesignModel` 인터페이스 | `guideLinks?: { href: string; label: string }[]` 옵션 필드 추가 (아카이브 고정 경로 딥링크용) |
| `THESIS_WRITING_MODEL` (신규 상수) | 설계 모형: 인지적 도제 + 과정중심 글쓰기 (Cognitive Apprenticeship + Process Writing) |
| `developmentTopicLabel` | `thesis_writing` 케이스 → `집필 블록 ${index}` |
| `thesisWritingSkeleton` (신규 함수) | 집필 블록 반복 + 섹션 마일스톤(서론·이론적 배경 / 방법·결과) |
| `generateCurriculum` — orientation | `thesis_writing` 시 논문 목표·일정 합의 특화 오리엔테이션 |
| `generateCurriculum` — 전개 루프 | `thesis_writing` 시 `thesisWritingSkeleton` 분기 |
| `generateCurriculum` — 통합 | `thesis_writing` 시 "전체 초안 공유·상호 피드백" 회차 |
| `generateCurriculum` — models 배지 | `thesis_writing` 시 `THESIS_WRITING_MODEL` 사용 |

### `src/features/activities/StudyCurriculumWizard.tsx`

| 변경 위치 | 내용 |
|---|---|
| `studyKind` onChange | `thesis_writing` 선택 시 `goalType` → `"research"` 자동 설정 |
| review 단계 — 가이드 딥링크 섹션 | `m.guideLinks`가 있으면 "글쓰기 가이드" 행 렌더링 |

---

## 논문 작성 스터디 설계 규칙

### 기반 이론
- **인지적 도제 (Cognitive Apprenticeship)**: 전문가의 집필 과정을 모델링·코칭·스캐폴딩으로 내면화
- **과정중심 글쓰기 (Process Writing)**: 계획(plan) → 초안(draft) → 동료 크리틱(critique) → 수정(revise) 순환

### 목표 유형 기본값
`research` (연구 성과)

### 회차 골격
| 단계 | 내용 |
|---|---|
| 오리엔테이션 | 각자 논문 목표·현재 진도 공유, 집필 일정(섹션별 마일스톤) 합의, 피드백 체크리스트 방식 소개 |
| 집필 블록 (반복) | 집필 목표 공유(모각글) → 라이팅 타임 → 동료 크리틱(체크리스트) → 수정 계획 수립 |
| 마일스톤 점검 (devCount ≥ 3) | 서론·이론적 배경 완성도 점검 (devCount ≥ 6 이면 1/3 지점 추가) |
| 마일스톤 점검 (devCount ≥ 3) | 방법·결과 완성도 점검 (중간 지점) |
| 통합 (2회차) | 전체 초안 공유 · 상호 종합 피드백 · 수정 우선순위 정리 |
| 통합 마지막 | 전체 회고 · 목표 달성 점검 (공통) |

### 아카이브 가이드 딥링크 (실재 경로 확인)
- `/archive/literature-review-guide` — 문헌 리뷰 가이드
- `/archive/citation-guide` — 인용 가이드
- `/archive/apa-style` — APA 스타일

### 아카이브 개념 딥링크
- 인지적 도제, 자기주도학습, 메타인지 (archive-seed.ts 표제어 확인 완료)

---

## 검증 결과

```
npx tsc --noEmit   → 에러 없음
npx eslint src/lib/study-curriculum-designer.ts src/features/activities/StudyCurriculumWizard.tsx --quiet → 에러 없음
```

build·commit 미수행 (규율 준수).
