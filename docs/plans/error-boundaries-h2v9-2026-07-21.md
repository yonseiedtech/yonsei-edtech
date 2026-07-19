# H2 에러 경계 확충 + global-error 구현 보고서 (v9 · 2026-07-21)

## 문제 (실측)
- `error.tsx` 4개뿐 (activities · collab · root · mypage)
- `global-error.tsx` **0개** — 루트 레이아웃 자체가 죽으면 흰 화면
- dashboard · hackathon · archive · console · seminars · board · gatherings · steppingstone · mentoring · diagnosis 등 고빈도·신입 노출 라우트에 에러 경계 전무

## 구현 (신규 파일 11개)

### global-error.tsx
- **경로**: `src/app/global-error.tsx`
- Next.js 요구사항대로 `<html>/<body>` 직접 렌더
- `./globals.css` 재임포트 → 시맨틱 CSS 토큰 복원
- 시스템 폰트 fallback (`font-family: system-ui`)
- 에러 상세 화면 노출 없음 — `console.error`만
- 아이콘 박스: `border-destructive/30 bg-destructive/10 text-destructive` (시맨틱 토큰)
- CTA: 다시 시도(reset()) + 홈으로(하드 네비게이션 `href="/"`) + 운영진 문의 링크

### 라우트별 error.tsx (10개 — SectionError 얇은 래퍼)

| 파일 | sectionLabel |
|------|-------------|
| `src/app/dashboard/error.tsx` | 대시보드 |
| `src/app/hackathon/error.tsx` | 해커톤 |
| `src/app/archive/error.tsx` | 아카이브 |
| `src/app/console/error.tsx` | 운영 콘솔 |
| `src/app/seminars/error.tsx` | 세미나 |
| `src/app/board/error.tsx` | 게시판 |
| `src/app/gatherings/error.tsx` | 모임 |
| `src/app/steppingstone/error.tsx` | 온보딩 길잡이 |
| `src/app/mentoring/error.tsx` | 멘토링 |
| `src/app/diagnosis/error.tsx` | 진단평가 |

## 설계 원칙 준수
- **공통 컴포넌트 재사용**: 기존 `components/ui/section-error.tsx` (SectionError) 그대로 사용
- **과설계 없음**: 각 라우트 래퍼는 5줄 이하
- **에러 상세 화면 노출 금지**: `console.error`만, 화면 표출 없음
- **시맨틱 토큰**: raw Tailwind 팔레트 미사용 (ESLint no-restricted-syntax 통과)
- **다크모드**: SectionError 내 기존 dark: 클래스 + global-error는 destructive 시맨틱 토큰으로 자동 처리
- **수정 금지 파일 미접촉**: features/hackathon · app/signup · console/academic/applications · api/cron 전부 미수정

## 검증 결과
- `npx eslint` (신규 11파일): **통과** (에러 0)
- `npx tsc --noEmit` 신규 파일 필터: **에러 0**
  - 전체 tsc 3건 에러는 pre-existing (`mypage/notifications`, `features/notifications/NotificationBell`) — `operations.ts` NotificationType 확장에 따른 기존 map 미갱신, 본 작업과 무관

## 커버리지 변화
- 에러 경계: 4개 → **15개** (global-error 1 + route error.tsx 14)
- global-error.tsx: 0개 → **1개**
