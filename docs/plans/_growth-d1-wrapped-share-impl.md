# D1 — 학기 Wrapped 공유 루프 구현 기록

> 근거: `docs/plans/service-enhancement-plan-v19-acquisition.md` §D1 (P0, 추천/니치 바이럴 침투율 레버)
> 범위: mypage `SemesterWrapped` 영역만. dashboard/auth/steppingstone 무수정. commit/push/배포·`next build` 미실행(병렬 executor .next lock 회피).
> 일자: 2026-07-29

## 목표
`SemesterWrappedView`(자랑하고 싶은 개인 학기 회고)에 **공유 CTA + 추적 가능한 공유 링크**를 부착해 자연 초대장으로 전환.

## 변경 파일
1. **신규** `src/lib/wrapped-share.ts` — 공유 링크 생성 + 공유 액션 유틸(다른 executor 영역과 비중복 새 파일).
2. `src/features/mypage/useSemesterWrapped.ts` — `WrappedMetrics`에 `semesterKey`(비 PII 학기키) 노출.
3. `src/features/mypage/SemesterWrappedView.tsx` — `SummaryCard`에 "공유하기" CTA + 핸들러 추가.

## 공유 링크 설계 (프라이버시 준수)

- **대상 경로**: `/about` (공개 학회 소개 페이지). 코드 실측 확인 — `AuthGuard` 없음, `about/layout.tsx`에 metadata·OG 존재. **회원 전용 개인 데이터 URL(`/mypage/wrapped`)은 절대 공유하지 않음**.
- **부착 쿼리(경량 익명 태깅만)**: `?src=wrapped&sem={semesterKey}`
  - `src=wrapped` — 유입 소스 식별(운영진 대시보드에서 Wrapped 경유 유입 측정 근거).
  - `sem=2026-2` — 학기키. 학기 경계 유입 스파이크 분석용. **개인 식별 불가**.
- **PII 절대 미포함**: 실명·이메일·userId·`from={ref}` 등 개인 식별자 일절 부착하지 않음(계획서 예시의 `from` 파라미터는 재식별 위험 회피 위해 의도적으로 생략).
- **절대 URL 폴백**: `window` 미가용(SSR) 시 `https://yonsei-edtech.vercel.app`로 폴백.

## 공유 동작 (UX)

- **Web Share API 우선**: `navigator.share` 지원 시 네이티브 공유 시트. `AbortError`(사용자 취소)는 조용히 무시, 폴백하지 않음.
- **클립보드 폴백**: 미지원 시 `navigator.clipboard.writeText` → sonner `toast.success`("공유 링크를 복사했어요…").
- **실패 처리**: 둘 다 불가 시 `toast.error`로 수동 복사 안내.
- 유틸이 `"shared"|"copied"|"dismissed"|"failed"` 결과를 반환 → 뷰(호출부)가 toast 결정(관심사 분리).

## 무회귀·품질 가드

- 기존 "요약 이미지 저장"(canvas) 기능 유지 — variant만 `outline`로 강등, "공유하기"가 primary CTA. "마이페이지로"는 `ghost`.
- **시맨틱 토큰만** 사용(신규 raw color 없음), 기존 Wrapped 브랜드 톤 유지.
- **렌더 순수성 준수**: `navigator`·`window.location`·`URLSearchParams` 접근은 전부 이벤트 핸들러(`handleShare`) 내부. 렌더 경로에 `Date.now()`/`Math.random()`/`new Date()` 직접호출 없음 → warning 래칫 147 초과 없음.
- a11y: 버튼에 아이콘+텍스트 라벨, `disabled` 상태 표기.
- 캡션에 "개인 활동 데이터는 담기지 않음" 명시 → 프라이버시 안심 문구.

## 검증 결과

- `npx tsc --noEmit` → **0 errors** (TSC_EXIT=0)
- `npx eslint src/lib/wrapped-share.ts src/features/mypage/SemesterWrappedView.tsx src/features/mypage/useSemesterWrapped.ts` → **0 errors / 0 warnings** (ESLINT_EXIT=0)
- `next build`: 미실행(지침 — 병렬 executor .next lock 회피).

## 후속(다른 항목 — 이번 범위 밖)
- A3 동적 OG 이미지: `/about` OG 카드 강화(별도 항목).
- B2 게스트 미리보기 전환: 링크 도착 게스트를 게스트 이력 미리보기로 유도(초대 루프 완성).
- 운영진 대시보드에서 `src=wrapped` 유입 집계(C3 AARRR 대시보드).
