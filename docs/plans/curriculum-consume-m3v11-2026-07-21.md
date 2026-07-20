# M3 교수설계 마법사 소비 심화 — 구현 보고서 (v11, 2026-07-21)

## 목표
마법사로 생성된 `curriculumDesign`·회차 `objective` 데이터를 스터디 상세 개요 탭과
대시보드 스터디 위젯에 노출해 설계→실행→점검 루프를 가시화한다.
신규 컬렉션·쿼리 없음 · 표시 전용.

---

## 실측 소비 현황 (구현 전)

| 저장 위치 | 필드 | 기존 소비 화면 | 미소비 |
|---|---|---|---|
| `activities/{id}` | `curriculumDesign` (모형·조건·메모) | StudyCurriculumWizard 저장 시 write만 | 개요 탭, 대시보드 |
| `activities/{id}` | `curriculumGoalCheck` | ActivityWeekDetailPage (마지막 회차) | — |
| `activity_progress/{id}` | `objective`, `designPhase` | ActivityWeekDetailPage 주차 페이지 | 개요 탭 "다음 목표" |

---

## 구현 내용

### 1. 스터디 상세 개요 탭 — "커리큘럼 설계" 요약 카드
**파일**: `src/features/activities/ActivityDetail.tsx`

- **트리거**: `type === "study"` && `activity.curriculumDesign` 존재 시에만 렌더
- **표시 내용**:
  - 적용 설계 모형 배지 목록 (`curriculumDesign.models[].name`)
  - 회차 진행 `{progressDone} / {progressList.length}`
    (이미 fetch된 `progressList` 재사용 — 신규 쿼리 없음)
  - 다음 회차 목표 1줄 (첫 번째 미완료 회차 중 `objective` 있는 것)
- **위치**: 태그 섹션 아래, `AttendeeReviewsSection` 위 (외부활동과 구역 분리)
- **추가 derived var** (line ~771): `curriculumDesign`, `nextSessionWithObjective`

### 2. 대시보드 참여 학술활동 위젯 — 커리큘럼 모형 1줄
**파일**: `src/features/dashboard/MyAcademicActivitiesWidget.tsx`

- **트리거**: `a.type === "study"` && `curriculumDesign.models.length > 0`
- **표시 내용**: `Wand2` 아이콘 + 모형명 " · " 구분 1줄 (`text-[10px] text-primary`)
- **쿼리**: 없음 — `activitiesApi.list()` 결과 activity 문서에 이미 포함된 필드 재사용
- **import 추가**: `Wand2` (lucide-react)

---

## 설계 결정

| 결정 | 이유 |
|---|---|
| 대시보드에서 "이번 주 회차 목표" 텍스트 대신 모형 배지 표시 | 회차별 objective는 `activityProgress` 서브컬렉션 — N개 스터디에 N쿼리 발생. "쿼리 최소" 원칙상 activity 문서 필드만 사용 |
| 상세 개요 탭에서 progressList 재사용 | ActivityDetail이 이미 `["activity-progress", activityId]` 쿼리 보유 — 추가 비용 0 |
| IIFE 패턴으로 조건부 렌더 | 기존 코드베이스(StudyCurriculumWizard 등)와 동일 패턴 |
| 신규 파일 생성 없음 | "과설계 금지" — 표시 전용 소규모 변경 |

---

## 검증

- `npx tsc --noEmit` → exit code 0 (오류 0)
- `npx eslint src/features/activities/ActivityDetail.tsx src/features/dashboard/MyAcademicActivitiesWidget.tsx --quiet` → 출력 없음 (오류 0)

---

## 수정 파일

| 파일 | 변경 위치 | 내용 |
|---|---|---|
| `src/features/activities/ActivityDetail.tsx` | ~line 771 (derived vars) | `curriculumDesign`, `nextSessionWithObjective` 추가 |
| `src/features/activities/ActivityDetail.tsx` | ~line 1143 (overview 탭) | 커리큘럼 설계 요약 카드 삽입 |
| `src/features/dashboard/MyAcademicActivitiesWidget.tsx` | import, 카드 내부 | `Wand2` import + 모형 1줄 표시 |
