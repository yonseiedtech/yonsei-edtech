# bkend.ai 연동 가이드

> 연세교육공학회 홈페이지 (yonsei-edtech) 백엔드 연동 가이드
> 작성일: 2026-03-13

---

## 목차

1. [bkend.ai 가입 및 프로젝트 생성](#1-bkendai-가입-및-프로젝트-생성)
2. [Claude Code MCP 서버 연동](#2-claude-code-mcp-서버-연동)
3. [데이터 모델 생성 (MCP 명령어)](#3-데이터-모델-생성-mcp-명령어)
4. [Next.js 클라이언트 코드 패턴](#4-nextjs-클라이언트-코드-패턴)
5. [인증 연동 패턴](#5-인증-연동-패턴)

---

## 1. bkend.ai 가입 및 프로젝트 생성

### 1-1. 계정 생성

1. 브라우저에서 https://console.bkend.ai 접속
2. Google / GitHub / 매직 링크 중 하나로 로그인
3. 로그인 완료 시 콘솔 홈으로 자동 이동

### 1-2. 조직(Organization) 생성

조직은 팀/결제 단위입니다.

1. 콘솔 홈에서 **조직 생성** 버튼 클릭
2. 조직명 입력: `yonsei-edtech` (예시)
3. **생성** 클릭

### 1-3. 프로젝트(Project) 생성

프로젝트는 서비스 단위입니다 (dev/staging/prod 환경 포함).

1. 조직 페이지 좌측 메뉴에서 **프로젝트 생성** 클릭
2. 다음 정보 입력:
   - 프로젝트 이름: `yonsei-edtech`
   - Slug: `yonsei-edtech` (URL 식별자)
   - 리전: **Seoul (Asia Northeast 3)** 권장
   - 클라우드: AWS
3. **생성** 클릭

### 1-4. 환경 확인

- 프로젝트 생성 시 `dev` 환경이 자동으로 프로비저닝됩니다
- 약 30초 후 Active 상태가 되면 사용 가능
- 이후 `staging`, `prod` 환경은 필요 시 별도 생성

### 1-5. Publishable Key 확인

연동에 필요한 키:

- 콘솔 좌측 메뉴 **Settings** > **API Keys** 에서 확인
- `pk_...` 형태의 Publishable Key 복사 (클라이언트 코드에 사용)
- Project ID도 함께 메모

---

## 2. Claude Code MCP 서버 연동

### 2-1. MCP 서버 추가 (전역)

터미널에서 다음 명령어 실행:

```bash
claude mcp add bkend --transport http https://api.bkend.ai/mcp
```

### 2-2. 프로젝트별 .mcp.json 설정 (팀 공유용)

프로젝트 루트에 `.mcp.json` 파일 생성:

```json
{
  "mcpServers": {
    "bkend": {
      "type": "http",
      "url": "https://api.bkend.ai/mcp"
    }
  }
}
```

### 2-3. OAuth 인증

- MCP 첫 실행 시 브라우저가 자동으로 열립니다
- bkend 콘솔 계정으로 로그인 → 조직 선택 → 권한 승인
- 인증 완료 후 Claude Code에서 MCP 도구 사용 가능

**토큰 유효 기간**
- Access Token: 1시간 (자동 갱신)
- Refresh Token: 30일

### 2-4. 연동 확인

Claude Code에서 다음 명령어로 확인:

```
연결된 bkend 프로젝트 목록을 보여줘
```

또는 MCP 도구 직접 호출: `get_context`

### 2-5. 트러블슈팅

| 문제 | 해결 방법 |
|------|-----------|
| MCP 도구가 보이지 않음 | `claude mcp list` 로 연결 확인, 재추가 |
| OAuth 팝업이 안 뜸 | 브라우저 팝업 차단 해제 |
| 연결이 끊김 | 다음 MCP 호출 시 자동 재인증 |
| 잘못된 프로젝트/환경 | `get_context` 로 현재 세션 확인 |

---

## 3. 데이터 모델 생성 (MCP 명령어)

MCP 연동 후 Claude Code에 다음 순서로 요청합니다.

### 사전 준비

먼저 컨텍스트 확인:

```
현재 bkend 세션 컨텍스트를 확인해줘 (get_context)
```

`organizationId`, `projectId`, `environmentId` 값을 확인합니다.

---

### 3-1. users 테이블

```
bkend에 users 테이블을 생성해줘.
필드:
- username: String, required, unique
- email: String, required, unique
- name: String, required
- role: String, required, default "member"
  (값: admin / president / staff / member / alumni / advisor)
- generation: Number (기수)
- field: String (전공/연구분야)
- profileImage: String (이미지 URL)
- bio: String (자기소개)
- approved: Boolean, default false (가입 승인 여부)

RBAC 권한:
- admin: CRUD 전체
- user: 본인 정보 read/update (self)
- guest: read 불가
```

### 3-2. posts 테이블

```
bkend에 posts 테이블을 생성해줘.
필드:
- title: String, required
- content: String, required
- category: String, required
  (값: notice / seminar / free / promotion / newsletter)
- authorId: String, required (users 테이블 id 참조)
- authorName: String, required
- viewCount: Number, default 0

RBAC 권한:
- admin: CRUD 전체
- user: read + 본인 글 create/update/delete (self)
- guest: read만 허용 (notice, promotion, newsletter)
```

### 3-3. comments 테이블

```
bkend에 comments 테이블을 생성해줘.
필드:
- postId: String, required (posts 테이블 id 참조)
- content: String, required
- authorId: String, required (users 테이블 id 참조)
- authorName: String, required

RBAC 권한:
- admin: CRUD 전체
- user: read + 본인 댓글 create/delete (self)
- guest: read 불가
```

### 3-4. seminars 테이블

```
bkend에 seminars 테이블을 생성해줘.
필드:
- title: String, required
- description: String
- date: String, required (YYYY-MM-DD)
- time: String, required (HH:MM)
- location: String, required
- speaker: String, required (대표 발표자명)
- speakerBio: String
- posterUrl: String
- maxAttendees: Number
- status: String, default "upcoming"
  (값: upcoming / ongoing / completed / cancelled)
- createdBy: String (users 테이블 id 참조)

RBAC 권한:
- admin / staff: CRUD 전체
- user: read만
- guest: read만
```

### 3-5. seminar_sessions 테이블

```
bkend에 seminar_sessions 테이블을 생성해줘.
필드:
- seminarId: String, required (seminars 테이블 id 참조)
- title: String, required
- speaker: String, required
- speakerBio: String
- time: String (HH:MM)
- duration: Number (분 단위)
- order: Number, required (세션 순서)

RBAC 권한:
- admin / staff: CRUD 전체
- user: read만
- guest: read만
```

### 3-6. seminar_attendees 테이블

```
bkend에 seminar_attendees 테이블을 생성해줘.
필드:
- seminarId: String, required (seminars 테이블 id 참조)
- userId: String, required (users 테이블 id 참조)

unique 제약: seminarId + userId 조합 중복 불가

RBAC 권한:
- admin: CRUD 전체
- user: 본인 참석 create/delete (self) + read
- guest: read 불가
```

### 3-7. inquiries 테이블

```
bkend에 inquiries 테이블을 생성해줘.
필드:
- name: String, required
- email: String, required
- message: String, required
- status: String, default "pending"
  (값: pending / replied)
- reply: String (관리자 답변)
- repliedAt: Date

RBAC 권한:
- admin: CRUD 전체
- user: 본인 문의 create/read (self)
- guest: create만 허용 (비회원 문의)
```

### 3-8. 인덱스 추가

성능 최적화를 위한 인덱스 추가 요청:

```
다음 인덱스를 추가해줘:
- posts 테이블: category 필드 인덱스
- posts 테이블: authorId 필드 인덱스
- comments 테이블: postId 필드 인덱스
- seminars 테이블: status 필드 인덱스
- seminars 테이블: date 필드 인덱스
- seminar_sessions 테이블: seminarId 필드 인덱스
- seminar_attendees 테이블: seminarId 필드 인덱스
- seminar_attendees 테이블: userId 필드 인덱스
- inquiries 테이블: status 필드 인덱스
```

---

## 4. Next.js 클라이언트 코드 패턴

### 4-1. 환경변수 설정 (.env.local)

```
NEXT_PUBLIC_BKEND_API_URL=https://api-client.bkend.ai/v1
NEXT_PUBLIC_BKEND_PROJECT_ID={콘솔에서 확인한 Project ID}
NEXT_PUBLIC_BKEND_ENV=dev
```

> 주의: `NEXT_PUBLIC_` 접두어가 있어야 브라우저 코드에서 접근 가능합니다.

### 4-2. bkend 클라이언트 수정 포인트 (src/lib/bkend.ts)

현재 `bkend.ts`는 헤더에 `Authorization`만 전달하고 있습니다.
bkend.ai REST API 규격에 맞게 다음 헤더를 추가해야 합니다:

**필수 헤더 3개:**
- `Content-Type: application/json`
- `X-API-Key: {pk_publishable_key}` (Publishable Key, 인증 불필요 엔드포인트 포함 항상 전송)
- `Authorization: Bearer {accessToken}` (로그인 후 발급된 JWT, 인증 필요 엔드포인트만)

**엔드포인트 경로 수정:**
- 현재: `/auth/signup` → 변경: `/auth/email/signup`
- 현재: `/auth/login` → 변경: `/auth/email/signin`
- 현재: `/auth/logout` → 변경: `/auth/signout`
- 현재: `/api/posts` → 변경: `/data/posts`
- 현재: `/api/comments` → 변경: `/data/comments`
- 현재: `/api/profiles` → 변경: `/data/users`
- 현재: `/api/inquiries` → 변경: `/data/inquiries`

### 4-3. 토큰 저장 전략

| 저장소 | 권장 여부 | 이유 |
|--------|-----------|------|
| localStorage | 권장 | 간단한 구현, 탭 간 공유 |
| sessionStorage | 조건부 | 탭 닫으면 소멸, 보안 강함 |
| httpOnly cookie | 최상 보안 | SSR에서도 사용 가능, XSS 방어 |

현재 `auth-store.ts`가 메모리 상태만 관리하므로, 페이지 새로고침 시 토큰을 복원하려면 `localStorage`에 토큰을 별도 저장/로드하는 로직이 필요합니다.

### 4-4. TanStack Query 통합 패턴

**기본 구조:**

```
useQuery
  queryKey: ['테이블명', 파라미터들]
  queryFn: bkend API 호출 함수
  enabled: 조건부 실행 (로그인 필요한 경우 !!user)

useMutation
  mutationFn: create/update/delete API 호출
  onSuccess: queryClient.invalidateQueries(['테이블명'])
```

**posts 목록 조회 패턴:**
- query key: `['posts', { category }]`
- API: `GET /data/posts?filter[category]=notice&sort=createdAt:desc&page=1&limit=20`

**댓글 목록 조회 패턴:**
- query key: `['comments', postId]`
- API: `GET /data/comments?filter[postId]={postId}&sort=createdAt:asc`
- enabled 조건: `!!postId`

**세미나 참석 여부 확인 패턴:**
- query key: `['seminar_attendees', seminarId, userId]`
- API: `GET /data/seminar_attendees?filter[seminarId]={seminarId}&filter[userId]={userId}`
- 결과 배열 length > 0 이면 참석 중

**페이지네이션 파라미터:**
- `?page=1&limit=20` (기본값, 최대 100)
- 정렬: `?sort=createdAt:desc`
- 검색: `?search=키워드`

### 4-5. API 응답 타입 변경 주의

bkend.ai는 `id` 필드를 사용합니다 (`_id` 아님).

현재 `src/types/index.ts`의 타입 정의에서 id 필드 타입을 확인하고, API 응답 매핑 시 변환 불필요하면 그대로 사용 가능합니다.

목록 조회 응답 구조:
```json
{
  "data": [ { "id": "...", "title": "...", ... } ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

단건 조회/생성/수정 응답 구조:
```json
{ "id": "...", "title": "...", ... }
```

---

## 5. 인증 연동 패턴

### 5-1. 회원가입 API

**엔드포인트:** `POST /v1/auth/email/signup`

요청 바디:
```json
{
  "method": "password",
  "email": "user@yonsei.ac.kr",
  "password": "Password123!",
  "name": "홍길동"
}
```

성공 응답 (201):
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

에러 코드:
- `auth/email-already-exists` (409): 이미 가입된 이메일
- `auth/invalid-password-format` (400): 비밀번호 정책 미충족 (8자+대소문자+숫자+특수문자)

> 주의: bkend 회원가입은 email + password + name만 처리합니다.
> `generation`, `field`, `role`, `approved` 등 추가 프로필 정보는 회원가입 후 users 테이블에 별도 레코드를 생성해야 합니다.

### 5-2. 로그인 API

**엔드포인트:** `POST /v1/auth/email/signin`

요청 바디:
```json
{
  "method": "password",
  "email": "user@yonsei.ac.kr",
  "password": "Password123!"
}
```

성공 응답 (200): 회원가입 응답과 동일 구조

### 5-3. 현재 사용자 조회

**엔드포인트:** `GET /v1/auth/me`

필수 헤더: `Authorization: Bearer {accessToken}`

응답:
```json
{
  "id": "user_id",
  "email": "user@yonsei.ac.kr",
  "name": "홍길동",
  "role": "user"
}
```

> 주의: `/auth/me` 응답의 `role`은 bkend 내부 역할(user/admin)입니다.
> 학회 내 역할(member/president/staff 등)은 users 테이블에서 별도 조회해야 합니다.

### 5-4. 토큰 갱신

**엔드포인트:** `POST /v1/auth/refresh`

요청 바디:
```json
{ "refreshToken": "eyJ..." }
```

응답: 새로운 accessToken + refreshToken

401 에러 발생 시 자동 갱신 흐름:
1. API 호출 → 401 응답
2. localStorage에서 refreshToken 읽기
3. `/auth/refresh` 호출 → 새 토큰 발급
4. localStorage 토큰 업데이트
5. 원래 요청 재시도

### 5-5. 로그아웃

**엔드포인트:** `POST /v1/auth/signout`

필수 헤더: `Authorization: Bearer {accessToken}`

클라이언트 측 추가 작업:
- localStorage에서 accessToken, refreshToken 삭제
- Zustand auth-store 초기화 (user: null)
- 홈으로 리다이렉트

### 5-6. 인증 흐름 요약

```
[회원가입]
POST /auth/email/signup
  → accessToken, refreshToken 저장 (localStorage)
  → POST /data/users 에 프로필 정보 저장 (generation, field 등)
  → 관리자 승인 대기 (approved: false)

[로그인]
POST /auth/email/signin
  → accessToken, refreshToken 저장
  → GET /auth/me 로 bkend 사용자 정보 확인
  → GET /data/users?filter[email]={email} 로 학회 프로필 조회
  → 두 정보를 합쳐 Zustand auth-store에 저장

[API 요청]
  → 헤더에 X-API-Key + Authorization 포함
  → 401 발생 시 → 토큰 갱신 → 재시도

[로그아웃]
POST /auth/signout
  → localStorage 토큰 삭제
  → Zustand 초기화 → 홈 이동
```

### 5-7. 현재 useAuth.ts 수정 포인트

현재 `src/features/auth/useAuth.ts`는 DEMO_ACCOUNTS 하드코딩 방식입니다.
bkend 연동 시 다음 부분을 교체합니다:

- `login` 함수: DEMO_ACCOUNTS 분기문 → `authApi.signin()` 호출
- `logout` 함수: `clearUser()` → `authApi.signout()` + localStorage 정리 + `clearUser()`
- 초기 로딩: 앱 시작 시 localStorage 토큰 확인 → `authApi.me()` + users 테이블 조회로 세션 복원

---

## 주요 RBAC 설계 결정사항

| 테이블 | 게스트 | 일반회원 | 운영진/관리자 |
|--------|--------|----------|--------------|
| users | 접근불가 | 본인만 | 전체 |
| posts | 카테고리별 read | read + 본인 write | 전체 |
| comments | 접근불가 | read + 본인 write | 전체 |
| seminars | read | read | 전체 |
| seminar_sessions | read | read | 전체 |
| seminar_attendees | 접근불가 | 본인만 | 전체 |
| inquiries | create만 | 본인만 | 전체 |

---

## 다음 단계

1. bkend.ai 가입 및 프로젝트 생성 완료
2. `.mcp.json` 파일 프로젝트 루트에 추가
3. `.env.local` 파일에 환경변수 설정
4. Claude Code에서 MCP 연동 확인 후 테이블 생성
5. `src/lib/bkend.ts` 헤더 및 엔드포인트 수정
6. `src/features/auth/useAuth.ts` bkend 연동으로 교체
7. 각 feature별 TanStack Query 훅 작성 (목업 데이터 교체)
