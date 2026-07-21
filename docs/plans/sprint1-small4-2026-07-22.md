# 스프린트 1 소형 4건 구현 보고서 (2026-07-22)

> 근거: `service-gap-integrated-2026-07-22.md` D.2항 · `service-gap-ux-2026-07-22.md` FLOW-1·FLOW-2 · `service-gap-pm-2026-07-22.md` GAP-H·GAP-I  
> 규율: 신규 컬렉션 0 · raw 색상 0 · `tsc --noEmit` 0에러 · `eslint --quiet` 0에러

---

## 1. 진단 리포트 복습 CTA (UX FLOW-2)

**파일**: `src/components/diagnosis/DiagnosisReport.tsx`  
**변경**: `DiagnosisLoopSteps` 직후 `WrongCardsSection` 직전에 삽입

### 구현 내용

- **"다음에 할 일" Card** (항상 노출): 3단계 번호형 안내
  1. 아카이브 탐색 → `/archive` 버튼
  2. 오답 복습 → `/flashcards` (암기카드 간격반복)
  3. 재진단 → `onRetry()` 버튼
- **"오답 암기카드 바로 복습하기" 주요 CTA** (`size="lg"`, full-width): `wrongItems.length > 0` 조건부 노출, `FLASHCARDS_HREF="/flashcards"` 딥링크
- 기존 `WrongCardsSection` 내부 "저장한 카드 학습하기" 버튼은 유지 (저장 후 보조 동선)

---

## 2. 가입 완료 착지 정합 (UX FLOW-1)

**파일**: `src/app/signup/page.tsx`

### 변경 내용

| 위치 | 이전 | 이후 |
|---|---|---|
| 자동승인 카드 버튼 문구 (L76) | "바로 시작하기" | "대시보드에서 시작하기" |
| 수동승인 안내 ul | 3개 항목 | 4개 항목 (+이메일 알림 명시) |

- `startHref = safeNext || "/dashboard"` 목적지 **무변경** — 문구만 정합
- 수동승인 추가 문구: `• 승인 완료 시 이메일로 알림이 발송됩니다.`  
  → `/api/email/approval/route.ts` 실측 확인: 승인 이메일 API 존재 → "이메일로 알림" 명시

---

## 3. 피드백 회신 알림 (PM GAP-I)

**파일**: `src/app/console/feedback/page.tsx`

### 변경 내용

- `notificationsApi` import 추가
- `changeStatus` mutationFn 확장:
  - 파라미터에 `userId?: string` 추가
  - 상태가 `in-progress` 또는 `resolved`로 **전환**될 때 제출자에게 인앱 알림 1건 발송
    - type: `"admin_nudge"`
    - in-progress: "피드백이 처리 중입니다" / "남겨주신 피드백을 처리 중입니다. 완료되면 다시 알려드립니다."
    - resolved: "피드백이 반영되었습니다" / "남겨주신 피드백이 반영되었습니다. 감사합니다."
  - 알림 실패 `.catch()` — 메인 기능(상태 변경) 블로킹하지 않음
- `onChange` 핸들러에 `userId: fb.userId` 전달
- **중복 방지**: `<select value={status}>` 구조상 현재 값 재선택 시 `onChange` 미발화 → 같은 상태로의 재알림 자연 차단
- **익명 스킵**: `UserFeedback.userId?: string` — undefined이면 알림 로직 진입 안 함

---

## 4. 멘토 풀 카운트 (PM GAP-H)

**파일(신규)**: `src/features/insights/MentoringPoolCard.tsx`  
**파일(수정)**: `src/app/admin/insights/page.tsx`

### MentoringPoolCard 구현

3개 stat tile (읽기 전용):

| 지표 | 데이터 출처 |
|---|---|
| 멘토 풀 수 | `profilesApi.list({filter[approved]:true, limit:500})` → `mentorOpen===true` 클라이언트 필터 |
| 멘토링 요청 수 | `commBoardsApi.listByContext("mentoring", MENTORING_CONTEXT_ID)` → board 획득 → `commQuestionsApi.listByBoard(boardId)` → 전체 질문 수 |
| 수락됨 | 위 질문 중 `resolved===true` 수 |

- 신규 컬렉션 0 (기존 `comm_boards` / `comm_questions` / `users` 컬렉션만 사용)
- 멘토 풀 <5명 시 운영 액션 힌트 표시
- `staleTime: 5분` (실시간 불필요)

### admin/insights/page.tsx 수정

- `MentoringPoolCard` dynamic import (`ssr: false`) 추가
- `opkpi` 탭 상단(AdoptionSection 위)에 삽입

---

## 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | 에러 0건 |
| `npx eslint --quiet` (5개 파일) | 에러 0건 |
| 신규 컬렉션 | 0개 |
| raw color | 0건 |

---

## 변경 파일 목록

| 파일 | 변경 유형 |
|---|---|
| `src/components/diagnosis/DiagnosisReport.tsx` | 수정 (CTA 블록 삽입) |
| `src/app/signup/page.tsx` | 수정 (버튼 문구 + 이메일 알림 문구) |
| `src/app/console/feedback/page.tsx` | 수정 (알림 발송 로직 추가) |
| `src/features/insights/MentoringPoolCard.tsx` | 신규 생성 |
| `src/app/admin/insights/page.tsx` | 수정 (dynamic import + opkpi 탭 삽입) |

*생성: executor · 2026-07-22*
