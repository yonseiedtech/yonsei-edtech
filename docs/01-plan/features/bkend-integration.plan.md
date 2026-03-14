# Plan: bkend.ai 실제 연동 (bkend-integration)

## 1. 개요

현재 Mock 데이터 기반으로 동작하는 yonsei-edtech를 bkend.ai BaaS에 실제 연동하여
데이터 영속성 확보 및 운영 가능한 상태로 전환.

## 2. 목표

- Mock 데이터 → bkend.ai REST API 전환
- 회원가입/로그인 → bkend 인증 시스템 연동
- 게시글, 세미나, 문의 등 CRUD를 실제 서버에서 처리
- 기존 UI/UX 변경 없이 데이터 레이어만 교체

## 3. 사용자 스토리

| 역할 | 스토리 | 우선순위 |
|------|--------|----------|
| 회원 | 회원가입하면 실제 계정이 생성되고, 로그인이 유지된다 | P0 |
| 회원 | 작성한 게시글/댓글이 서버에 저장되어 다른 기기에서도 보인다 | P0 |
| 회원 | 세미나 신청이 실제로 저장된다 | P0 |
| 관리자 | 회원 목록이 실제 데이터를 반영한다 | P0 |
| 방문자 | 문의 양식 제출 시 서버에 저장된다 | P1 |

## 4. 기능 범위

### In Scope
- **인증 연동**: signup/login/logout/refresh → bkend auth API
- **데이터 테이블 생성**: users, posts, comments, seminars, seminar_sessions, seminar_attendees, inquiries (7개)
- **React Query 훅 수정**: Mock fallback 제거 → API 우선
- **프로필 연동**: auth user + users 테이블 합병
- **환경변수 설정**: NEXT_PUBLIC_BKEND_URL, NEXT_PUBLIC_BKEND_API_KEY

### Out of Scope
- 파일 업로드 (별도 피처)
- 실시간 알림 (WebSocket)
- 이메일 발송 (승인 알림 등)
- 기존 Mock 데이터 마이그레이션

## 5. 기술 설계 개요

### 5.1 bkend 테이블 스키마

```
users:
  id, email, name, role, generation, field, bio,
  occupation, affiliation, department, position,
  contactEmail, contactVisibility, approved, profileImage

posts:
  id, title, content, category, authorId, authorName, viewCount

comments:
  id, postId, content, authorId, authorName

seminars:
  id, title, description, date, time, location, speaker,
  speakerType, speakerTitle, maxAttendees, posterImage, status

seminar_sessions:
  id, seminarId, title, speaker, speakerType, speakerTitle, time, description

seminar_attendees:
  id, seminarId, userId (unique: seminarId+userId)

inquiries:
  id, name, email, category, message, status
```

### 5.2 수정 대상 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/bkend.ts` | 엔드포인트 경로 수정 (이미 대부분 준비됨) |
| `src/features/auth/useAuth.ts` | DEMO_ACCOUNTS 제거, bkend auth 전용 |
| `src/features/board/useBoard.ts` | Mock fallback 제거, API 에러 처리 개선 |
| `src/features/seminar/seminar-store.ts` | Zustand → React Query + bkend API |
| `src/features/inquiry/inquiry-store.ts` | Zustand → React Query + bkend API |
| `src/features/newsletter/newsletter-store.ts` | Zustand → React Query + bkend API |
| `src/features/admin/AdminMemberTab.tsx` | Mock 상수 → API 조회 |

### 5.3 인증 흐름

```
회원가입:
  1. POST /auth/email/signup (email, password, name)
  2. POST /data/users (프로필 정보: generation, field, role="member")
  3. approved: false → 관리자 승인 대기

로그인:
  1. POST /auth/email/signin (email, password)
  2. GET /auth/me → bkend user
  3. GET /data/users?filter[email]=... → 학회 프로필
  4. merge → auth-store.setUser()

토큰 관리:
  - localStorage: bkend_access_token (1h), bkend_refresh_token (30d)
  - 401 → auto refresh → retry
```

### 5.4 RBAC 규칙

| 테이블 | admin | staff | member | guest |
|--------|-------|-------|--------|-------|
| users | CRUD | Read | Read(self) | - |
| posts | CRUD | CRUD | CR(own) | Read(notice) |
| comments | CRUD | CRUD | CR(own) | - |
| seminars | CRUD | CRUD | Read | Read |
| inquiries | CRUD | CRUD | C | C |

## 6. 구현 순서

1. bkend 프로젝트 설정 + 테이블 생성 (MCP 도구 활용)
2. 인증 연동 (signup/login/logout)
3. posts + comments API 전환
4. seminars + sessions + attendees API 전환
5. inquiries API 전환
6. admin 페이지 실 데이터 연동
7. 데모 계정/Mock 데이터 정리

## 7. 의존성

- bkend.ai 계정 + 프로젝트 + API Key
- .env.local 환경변수 설정
- 기존 `src/lib/bkend.ts` API 클라이언트

## 8. 리스크

| 리스크 | 대응 |
|--------|------|
| bkend API 다운타임 | 에러 바운더리 + 재시도 로직 |
| 기존 로그인 방식 변경 (username→email) | 회원가입 폼 수정, 기존 데이터 없으므로 영향 적음 |
| CORS 이슈 | bkend 대시보드에서 도메인 허용 |
| 무료 플랜 제한 | 시작 시 플랜 확인 |

## 9. 예상 작업량

- **L (Large)** — 총 4~5세션
- 인증 연동: 1세션
- 게시판/댓글: 1세션
- 세미나/문의: 1세션
- 관리자/정리: 1세션
