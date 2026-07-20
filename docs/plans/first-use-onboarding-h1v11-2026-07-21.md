# H1 신규 기능 첫 사용 온보딩 구현 산출물 — v11 (2026-07-21)

> **목적**: v11-H1 "신규 기능 첫 사용 마찰 제거" — 교수설계 마법사·해커톤 팀 형성 첫 사용 발견성 개선.
> **범위**: 발견성 핫픽스만. 기능 로직·신규 컬렉션·신규 컴포넌트 없음.

---

## 감사 결과 (실측)

### 교수설계 마법사 첫 사용 여정
- **진입점**: `ActivityDetail.tsx:1185` 진행 현황 탭 → 주차 추가 섹션 우측 `text-[11px]` 아웃라인 버튼 1개
- **빈 회차 상태 CTA**: 기존 `<p>등록된 진행 기록이 없습니다.</p>` — 마법사 안내 전무
- **결론**: 회차가 0개일 때 마법사 존재를 모르면 발견 불가. 일괄 생성 버튼이 먼저 눈에 띄어 마법사 투자 미회수 위험.

### 해커톤 팀 형성 첫 사용 여정
- **진입점**: `/hackathon` → 아이디어 보드(`HackathonBoard`) — 합류→확정→제출 흐름 안내 부재
- **팀 현황 빈 상태**: `HackathonTeamView.tsx:118` EmptyState 존재하나 "어떻게 팀을 만드는가" 절차 미노출
- **결론**: 첫 방문자는 아이디어 등록→합류→팀 확정→제출 4단계 흐름을 추론해야 함.

---

## 구현 내역

### 1. `src/features/activities/ActivityDetail.tsx`

**변경**: 진행 현황 탭 빈 회차 상태 → 스터디 모임장/운영진 전용 마법사 CTA

```
조건: progressList.length === 0 && type === "study" && (isStaff || isLeader)
```

- `EmptyState` import 추가 (`@/components/ui/empty-state`)
- 기존 `<p>등록된 진행 기록이 없습니다.</p>` 조건 분기:
  - 스터디+모임장/운영진: `EmptyState(compact)` — 마법사 아이콘(`Wand2`), 제목 "아직 등록된 회차가 없습니다", 설명 1줄, CTA 버튼 "교수설계 마법사로 시작하기" (`setWizardOpen(true)`)
  - 그 외: 기존 텍스트 유지
- 기존 `StudyCurriculumWizard` 다이얼로그·`setWizardOpen` 로직 무변경 (재사용)

### 2. `src/features/hackathon/HackathonBoard.tsx`

**변경**: 아이디어 보드 상단 팀 형성 흐름 3단계 안내 스트립 (첫 방문 1회, localStorage dismiss)

- `useEffect` import 추가
- `X` 아이콘 import 추가 (lucide-react)
- `onboardingDismissed` state + useEffect (localStorage `hackathon_onboarding_dismissed`)
- `handleDismissOnboarding()` 함수 — localStorage 저장 + state 업데이트
- JSX: `!onboardingDismissed` 조건부 스트립
  - 우측 상단 X 버튼 (aria-label "안내 닫기")
  - 제목 "해커톤 팀 형성 3단계"
  - 3단계 ol: ①아이디어 등록 ②팀 합류 ③팀 확정·제출 (각 설명 1줄)
  - 배치: `<div className="space-y-6">` 직후, 참가 신청 섹션 위
- 신규 컴포넌트·신규 컬렉션 없음. 기존 패턴(EmptyState, toast, useState) 재사용.

---

## 검증

| 항목 | 결과 |
|---|---|
| ESLint `--quiet` (두 파일) | 통과 (출력 없음) |
| tsc `--noEmit` — 수정 파일 에러 | 없음 |
| tsc `--noEmit` — 기존 에러 | `KudosWidget.tsx`·`CohortKudosSend.tsx` (features/kudos 수정 금지 영역, 내 변경 전부터 존재) |
| 투어 라이브러리 도입 | 없음 (규율 준수) |
| 신규 컬렉션 | 없음 |
| 기능 로직 변경 | 없음 |

---

## 수정 파일 요약

| 파일 | 변경 내용 | diff 규모 |
|---|---|---|
| `src/features/activities/ActivityDetail.tsx` | EmptyState import + 빈 회차 마법사 CTA 분기 | +15 |
| `src/features/hackathon/HackathonBoard.tsx` | useEffect/X import + dismiss state + 3단계 안내 스트립 | +49 |
