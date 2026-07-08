# M5 — 읽기·심사 증명 루프 확장 구현 보고서

작성일: 2026-07-08
대상 계획: `docs/plans/service-enhancement-plan-v4-2026-07-08.md` M5 (v2 L4 승계)
패턴 원본: G2 학습효과 카드 (`src/lib/learning-effect.ts` + `src/features/mypage/LearningEffectCard.tsx`)

## 1. 실재 데이터 확인 결과 (grep 검증)

두 카드 모두 계획대로 **실재 데이터·API·rules가 모두 갖춰져 있어 구현 가능**했다. bkend.ts 신규 조회 API 추가 불필요.

### (A) 읽기 기록 — `paper_reading_logs`
- 타입: `src/types/paper-reading.ts` → `PaperReadingLog` (`readAt` YYYY-MM-DD, `status`, `title` 등).
- API: `src/lib/bkend.ts:1582` `paperReadingLogsApi.listByUser(userId)` (filter[userId], limit 1000).
- rules: `firestore.rules:653` `paper_reading_logs` — **본인 read 허용** (owner + staff).
- 결론: 본인 조회 가능. 최근 4주 읽기 편수 집계 가능.

### (B) 연구 진척 소스 — `writing_paper_history`
- 계획은 "ThesisProgressWidget이 쓰는 진행도 소스"를 지목했으나, 그 위젯(`ThesisProgressWidget.tsx`)의 진행률은 **현재 스냅샷 %**만 계산한다(`computeReportCompletion`). 과거 시점의 진행률 스냅샷은 저장되지 않는다.
- 기간 병치를 위한 실재 시계열 소스는 `writing_paper_history` 컬렉션:
  - 타입: `src/types/research-paper.ts:323` `WritingPaperHistory` (`savedAt` ISO, `charCount` 누적 글자수). append-only.
  - API: `src/lib/bkend.ts:1548` `writingPaperHistoryApi.listByUser` (limit 1000).
  - rules: `firestore.rules:610` — **본인 read 허용**.
- 결론: `charCount` 시계열은 실재하지만 **"진행률 %" 시계열은 없다**.

### (C) 심사 연습 — `defense_practice_sets`
- 타입: `src/types/defense.ts` → `DefensePracticeSet.attempts[]` (각 `at` ISO, `averageScore` 0~100), 구버전 `lastAttempt` 단건.
- API: `src/lib/bkend.ts:1596` `defensePracticesApi.listByUser` (limit 200).
- rules: `firestore.rules:592` `defense_practice_sets` — **본인 read 허용** (owner + admin, staff/president 불가). 본인 마이페이지 조회는 문제 없음.
- 결론: 회차별 점수 시계열(STT 채점 `averageScore`) 실재. 미니 차트 구현 가능.

## 2. 구현한 카드

배치: `src/components/mypage/MyPageView.tsx` overview 탭, `LearningEffectCard` 바로 아래 (import 2줄 + 렌더 2블록만 추가, 다른 부분 무수정). 모두 `isSelf && !readOnly` 게이트.

### 카드 1 — 읽기 → 연구 진척 병치
`src/features/mypage/ReadingResearchLoopCard.tsx` (신규)
- 데이터: `paperReadingLogsApi` + `writingPaperHistoryApi` (Promise.all).
- 최근 4주(28일) 읽기 편수 + 같은 기간 논문 작성 **글자 증가량(+N자)** 병치.
- 인과 주장 금지 — "함께 나타난 경향" 문구만.
- 두 활동 모두 0이면 조용히 숨김. 한쪽만 있으면 나머지 활동 유도 문구 + CTA(`/mypage/research`, `/research`).

**계획 대비 조정 (근거 있는 deviation)**: 계획 예시는 "논문 작성 진행 **+X%p**"였으나, 진행률 % 시계열이 실재하지 않아 정직하게 산출 불가. 실재 스키마(`writing_paper_history.charCount`)에 맞춰 **글자 증가량(+N자)**으로 병치했다. 계획 지시("데이터 원천이 계획과 다르면 실재 스키마에 맞춰 조정") 준수.
- charCount 기준선: 창(28일) 시작 직전 마지막 스냅샷. 없으면 창 내 첫 스냅샷을 기준선으로(보수적 — 창 내 증가만 계상). 스냅샷 2건 미만이면 작성 신호 없음.

### 카드 2 — 심사 연습 추세
`src/features/mypage/DefensePracticeTrendCard.tsx` (신규)
- 데이터: `defensePracticesApi.listByUser`. 여러 세트의 `attempts[]`(+구버전 `lastAttempt`)를 `at` 오름차순 하나의 시계열로 병합.
- **순수 SVG** 미니 라인 차트(신규 라이브러리 없음): viewBox 300×84, 최근 12회, Y 고정 0~100, 50점 기준 점선, 영역 채움 + 라인 + 점, 최신 점 강조. `role="img"` + `aria-label` 접근성.
- 최신 점수 + 첫→끝 델타(추세 아이콘 상승/하락/유지) 병기.
- 시도 0회면 조용히 숨김. **1회면 안내 문구**("한 번 더 연습하면 추세를…") + CTA(`/steppingstone/thesis-defense`). 2회 이상이면 차트.

## 3. 보류·미구현 항목

없음. 두 카드 모두 실재 데이터로 정식 구현. 유일한 조정은 카드 1의 진척 지표를 "%p → 글자수"로 실재 스키마에 맞춘 것(위 근거).

## 4. 제약 준수 확인
- bkend.ts 신규 조회 API 추가 **불필요**(기존 API 재사용). rules 무수정.
- 수정 금지 영역(`src/features/networking/**`, `src/app/console/**`, `src/features/dashboard/**`) 무수정.
- MyPageView는 import 2줄 + 렌더 2블록만 추가.
- 신규 차트 라이브러리 설치 없음(순수 SVG).
- 커밋·배포 안 함.
