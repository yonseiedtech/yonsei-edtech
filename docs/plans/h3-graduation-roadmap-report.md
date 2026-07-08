# H3 — 졸업요건 ↔ 학기 로드맵 연동 + 미달 능동 넛지 (구현 보고)

작업일: 2026-07-08 · 대상 플랜: `docs/plans/service-enhancement-plan-v4-2026-07-08.md` H3

## 목표
오늘 배포된 마이페이지 졸업요건 체크표(정적)를 행동 유도형으로 확장. 미충족 요건을
대시보드 NextActionBanner와 steppingstone 학기 로드맵에 능동적으로 노출한다.

## 변경 파일

### 1. `src/features/mypage/useGraduationSummary.ts` (신규)
- GraduationChecklistCard 의 5개 쿼리(요건 문서·수강이력·과목 offering·종합시험·개인 진행)와
  `computeGraduationProgress` 로직을 공용 훅으로 추출.
- `graduation-progress.ts` 의 기존 함수 시그니처는 미변경 — 훅에서 그대로 호출.
- 반환: `requirement`, `summary`, `progress`(관문 저장용), `loadingEnrollments`,
  `unmetItems`(미충족 항목), `remainingCount`, `topUnmet`(최다 부족 대표).
- `unmetItems` 는 `총 이수학점 → 학점규칙 → 관문` 을 모아 **학점 부족분 큰 순** 정렬.
  관문은 shortfall 없음(뒤로 밀림).
- `userId` 미지정·요건 문서 없음·수강이력 0 이면 `summary=null`, `unmetItems=[]` 로
  크래시 없이 조용히 반환(소비자는 `summary`/`remainingCount` 유무로 노출 판단).

### 2. `src/features/mypage/GraduationChecklistCard.tsx` (리팩토링 — 동작 불변)
- 인라인 5쿼리 + summary useMemo 제거 → `useGraduationSummary(userId)` 사용.
- `toggleMilestone`(관문 체크 저장) 및 UI 상태(expandedRule/savingKey)는 카드에 유지.
- 카드 루트에 `id="graduation-checklist"` + `scroll-mt-24` 추가 → 배너·위젯 앵커 링크 대상.

### 3. `src/features/dashboard/NextActionBanner.tsx`
- `useGraduationSummary(userId)` 로 `remainingCount`, `topUnmet` 구독.
- **넛지 우선순위 규칙**(아래) 편입: 기존 시간 임박 액션(`top`)이 있으면 그대로 노출,
  없을 때만(`!top`) 졸업요건 넛지 노출.
- 넛지 문구: "졸업요건 N개 남음 · 최다 부족: {라벨} · {n학점 부족}" → `/mypage#graduation-checklist`.
- emerald 톤·중성 스타일(임박 액션의 rose/amber 긴급색과 시각적으로 구분해 우선순위 낮음 표현).
- `hidden`("오늘 그만 보기") 상태는 기존 로직이 먼저 처리 → 넛지도 함께 숨김.

### 4. `src/features/steppingstone/SemesterRoadmap.tsx`
- `useGraduationSummary(user?.id)` 로 `summary`, `remainingCount`, `unmetItems` 구독.
- 섹션 헤더 하단·완전학습 요약 위 위치에 **컴팩트 졸업요건 위젯** 추가:
  충족률 %(gradSummary.percent) + 남은 요건 개수 + 미충족 항목 칩(최대 4개, 초과 시 +N).
  allMet 이면 "모든 졸업요건을 충족했습니다 🎓".
- 노출 조건: `isLoggedIn && gradSummary`(본인 화면 전용 — 로드맵은 useAuthStore 로그인 사용자 데이터).
- 클릭 시 `/mypage#graduation-checklist` 이동.

## 넛지 우선순위 규칙 (NextActionBanner)
1. **시간 임박 액션 우선**: 수업/세미나/할일 중 24h 이내 최단 항목(`top`)이 있으면 그것만 노출.
2. **졸업요건 넛지는 최저 우선순위**: `top` 이 없을 때(`!top`)만, 그리고 `remainingCount > 0` 일 때만 노출.
3. **대표 항목 선정**: `topUnmet` = `unmetItems[0]` = 학점 부족분이 가장 큰 요건(관문뿐이면 첫 관문).
4. **숨김 존중**: 사용자가 "오늘 그만 보기"로 배너를 숨기면 넛지도 노출 안 함.
5. **데이터 부족 무해**: summary null 이면 `remainingCount=0` → 넛지 미노출(크래시 없음).

## 제약 준수
- `graduation-progress.ts` 기존 시그니처 미변경(파생 타입 `GraduationSummary` 재사용만).
- 수정 금지 영역 미접촉: networking/**, app/gatherings/**, lib/bkend.ts.
- 커밋·배포 없음.

## 검증
- `npx tsc --noEmit` — (실행 결과는 세션 로그 참조)
