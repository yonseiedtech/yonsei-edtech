# Plan — `console-ui-unify-v2`

- **Date**: 2026-04-18
- **Stage**: 정합화 후속 (이전 console-ui v1은 8fabafa로 공통 컴포넌트만 도입, 적용은 부분적)
- **Estimated**: 1.5일

## 1. 목표

운영자가 보는 모든 운영콘솔 페이지에서 헤더/빈상태/탭 스타일을 공통 컴포넌트로 일관되게 표시한다. 동시에 `/admin/*` 와 `/console/*` 이중 라우트 노이즈를 정리한다.

## 2. 현황 진단

- 공통 컴포넌트 4종은 `src/components/admin/`에 존재: `ConsolePageHeader`, `AdminEmptyState`, `AdminFilterBar`, `StatusBadge`
- **적용률 22%**: 36개 페이지 중 8개만 사용 (admin: fees/chatbot/analytics/audit-log/insights, console: page.tsx/handover/labs)
- **라우팅**: `/admin/layout.tsx`가 `/console`로 redirect → admin URL 직접 접근 불가능 (이미 통일됨)
- **코드 위치 패턴 2종**:
  - **A. console에 1줄 wrapper + admin에 진짜 코드** (예: `console/fees/page.tsx` → `admin/fees/page.tsx` 1023줄)
  - **B. admin에 1줄 wrapper + features/admin/*Tab.tsx에 진짜 코드** (예: `admin/members/page.tsx` → `AdminMemberTab.tsx`)

## 3. Gap (적용 대상)

### 3a. features/admin/*Tab.tsx — 8개 (B 패턴, members/posts/inquiries 등이 의존)
- `AdminMemberTab.tsx`
- `AdminPostTab.tsx`
- `AdminInquiryTab.tsx`
- `AdminTodoTab.tsx`
- `AdminNewsletterTab.tsx`
- `AdminSeminarTab.tsx`
- `AdminAgentTab.tsx`
- `AdminGreetingTab.tsx`

각 Tab에 ConsolePageHeader (제목/설명/액션) + AdminEmptyState (목록 비었을 때) 주입.

### 3b. admin/*/page.tsx 큰 파일 — 4개 (A 패턴, 직접 큰 코드 보유, ConsolePageHeader 미적용)
- `admin/certificates/page.tsx` (731줄)
- `admin/activity-dashboard/page.tsx` (204)
- `admin/semester-report/page.tsx` (186)
- `admin/user-audit/page.tsx` (178)

각 페이지에 ConsolePageHeader 주입 + 인라인 빈 상태를 AdminEmptyState로 교체.

### 3c. 죽은 라우트 정리 — `admin/transition/page.tsx` (5줄)
- `console/transition/page.tsx`도 5줄짜리 — 한쪽 정본화 필요

### 3d. 단순 wrapper 유지 (변경 없음)
- `admin/agents/inquiries/members/newsletter/posts/todos/seminars/settings` 1줄 wrapper는 유지 (라우트 호환성)
- `console/{대부분}` 1줄 re-export도 유지

## 4. Out of scope

- 라우트 자체 폐기 (현재 redirect로 안전 — 추후 트랙)
- 새 디자인 시스템 도입 (shadcn 그대로 활용)
- 페이지별 기능 변경 (기존 동작 100% 보존)

## 5. Validation

- [ ] `npx tsc --noEmit` + `npm run build` 통과
- [ ] features/admin/*Tab 8개 모두 ConsolePageHeader 표시 (회원/게시판/문의/할일/학회보/세미나/에이전트/인사말 페이지)
- [ ] 빈 목록 상태에서 AdminEmptyState 일관 표시
- [ ] admin/certificates/activity-dashboard/semester-report/user-audit 페이지 헤더 통일
- [ ] 기존 회원 승인/세미나 등록 등 모든 액션 회귀 없음

## 6. Files to touch

신규: 0
수정: features/admin/*Tab.tsx 8개 + src/app/admin/{certificates,activity-dashboard,semester-report,user-audit}/page.tsx 4개
=> 총 12개 파일

## 7. Deployment

CLAUDE.md 규칙대로 단일 push + 단일 vercel --prod.
