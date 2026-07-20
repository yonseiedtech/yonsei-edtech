# v12-M6 개강 시즌 whats-new 재노출 연계 — 구현 보고서 (2026-07-21)

> 담당: executor · 계획 근거: `service-enhancement-plan-v12-2026-07-21.md` §M6

---

## 1. 실측된 갭

| 항목 | 현 상태 | 갭 |
|---|---|---|
| `SemesterKickoffBanner` → whats-new 링크 | "새 기능 보기" 버튼 존재 | 신기능 수·미열람 여부 미표시 |
| 배너 설명 문구 | "방학 동안 논문 도구가 크게 업그레이드됐어요" (고정 문자) | 구체적 기능 수 없음 |
| `whats-new/page.tsx` WHATS_NEW_KEY | `"yonsei_whats_new_dismissed_v2"` 하드코딩 | 배너와 별도 정의 → 동기화 위험 |

---

## 2. 구현 내용 (3파일 · 신규 컬렉션 0)

### 신규: `src/lib/whats-new-meta.ts`
- `WHATS_NEW_DISMISSED_KEY` — localStorage 키 단일 정의
- `NEW_THRESHOLD_DAYS = 60` — NEW 배지 임계일
- `WHATS_NEW_ADDED_DATES` — 전체 21개 기능 addedAt 날짜 목록
- `countNewFeatures()` — 현재 기준 60일 이내 신기능 수 동적 계산
- `isWhatsNewUnread()` — 미열람(dismiss 미설정) 여부 판정

### 수정: `src/features/dashboard/SemesterKickoffBanner.tsx`
- `countNewFeatures()`, `isWhatsNewUnread()` import
- 배너 설명 문구: 신기능 수 > 0이면 `"방학 동안 N개 기능이 새로 추가됐어요"` 동적 표시
- "새 기능 보기" 버튼: 미열람(`whatsNewUnread`) && newCount > 0이면 숫자 배지 표시
- 기존 dismiss·역할 필터·학기 판정 로직 무수정

### 수정: `src/app/whats-new/page.tsx`
- `WHATS_NEW_DISMISSED_KEY`, `NEW_THRESHOLD_DAYS` import from `@/lib/whats-new-meta`
- `WHATS_NEW_KEY = WHATS_NEW_DISMISSED_KEY` 재할당으로 기존 참조 호환 유지
- 배너·페이지 간 키 동기화 달성

---

## 3. 동작 시나리오

| 조건 | 배너 설명 | "새 기능 보기" 버튼 |
|---|---|---|
| 개강 윈도 진입, 신기능 N개 존재, 미열람 | "방학 동안 N개 기능이 새로 추가됐어요 — ..." | `새 기능 보기 [N]` (숫자 배지) |
| 개강 윈도 진입, 신기능 N개 존재, 이미 dismiss | "방학 동안 N개 기능이 새로 추가됐어요 — ..." | `새 기능 보기` (배지 없음) |
| 신기능 0개 (60일 초과 전부 만료) | "방학 동안 논문 도구가 크게 업그레이드됐어요 — ..." | `새 기능 보기` (배지 없음) |
| 개강 윈도 밖 | 배너 미노출 (기존 동작 동일) | — |

---

## 4. 검증

- `npx tsc --noEmit` → 에러 0
- `npx eslint src/lib/whats-new-meta.ts src/features/dashboard/SemesterKickoffBanner.tsx src/app/whats-new/page.tsx --quiet` → 에러 0
- build · commit 금지 (규율 준수)

---

## 5. 규율 준수 확인

| 규율 | 확인 |
|---|---|
| `mypage/portfolio`, `EmptyState`, `console/**` 수정 금지 | 미수정 |
| 신규 컬렉션 0 | 준수 |
| 기존 whats-new 소스 재사용 (`WHATS_NEW_DISMISSED_KEY`, `NEW_THRESHOLD_DAYS`) | 준수 |
| 과알림 금지·최소 침습 | 배너 dismiss 유지, 새 배너 미추가, 버튼 배지 1개만 |
| tsc 에러 0 | 통과 |
| eslint --quiet 에러 0 | 통과 |
