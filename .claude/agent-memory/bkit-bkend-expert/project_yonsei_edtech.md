---
name: yonsei-edtech bkend 연동 현황
description: 연세교육공학회 홈페이지의 bkend.ai 백엔드 연동 상태 및 설계 결정사항
type: project
---

현재 상태: bkend.ai 계정 미생성, 모든 데이터가 목업 (MOCK_POSTS, MOCK_SEMINARS 등)

**Why:** 기존 데모 하드코딩을 실제 BaaS로 전환하려는 단계

**How to apply:** bkend 연동 관련 작업 시 아래 설계 결정을 따른다

## 스택
- Next.js (App Router) + React 19 + TypeScript
- Zustand (auth-store, seminar-store, inquiry-store)
- TanStack Query 설치됨 (미사용 상태 → 연동 시 활용 예정)

## 핵심 파일
- `src/lib/bkend.ts` — bkend 클라이언트 (TODO 상태, 엔드포인트/헤더 수정 필요)
- `src/features/auth/useAuth.ts` — 데모 계정 하드코딩 (bkend 연동 시 교체)
- `src/features/auth/auth-store.ts` — Zustand store (토큰 저장 로직 추가 필요)
- `src/features/board/board-data.ts` — MOCK_POSTS, MOCK_COMMENTS
- `src/features/seminar/seminar-data.ts` — MOCK_SEMINARS

## 설계 결정사항

### bkend API 헤더 (현재 bkend.ts에서 누락)
- `X-API-Key: {pk_publishable_key}` 반드시 추가 필요 (현재 누락)
- `Authorization: Bearer {accessToken}` (기존 있음)

### 엔드포인트 수정 필요
- `/auth/signup` → `/auth/email/signup`
- `/auth/login` → `/auth/email/signin`
- `/auth/logout` → `/auth/signout`
- `/api/posts` → `/data/posts`
- `/api/comments` → `/data/comments`
- `/api/profiles` → `/data/users`
- `/api/inquiries` → `/data/inquiries`

### 회원가입 2단계 처리
bkend signup은 email/password/name만 처리 → users 테이블에 추가 프로필(generation, field, role, approved) 별도 저장

### 로그인 2단계 처리
`/auth/me` (bkend 내부 역할) + `/data/users` (학회 역할) 두 곳 조회 후 합쳐서 저장

### 데이터 모델
7개 테이블: users, posts, comments, seminars, seminar_sessions, seminar_attendees, inquiries

### 가이드 문서 위치
`docs/02-design/bkend-integration-guide.md`
