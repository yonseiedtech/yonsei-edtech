# Design: bkend.ai 실제 연동 (bkend-integration)

## 1. 구현 순서

```
1. bkend.ai 프로젝트 설정 (MCP 또는 대시보드)
2. 테이블 7개 생성 + RBAC 설정
3. .env.local 환경변수 설정
4. 인증 연동 (useAuth.ts 수정)
5. 게시글/댓글 API 전환 (useBoard.ts)
6. 세미나 API 전환 (seminar → React Query)
7. 문의 API 전환 (inquiry → React Query)
8. 관리자 페이지 실 데이터
9. Mock 데이터/데모 계정 정리
```

## 2. bkend.ai 테이블 스키마

### 2.1 users

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| id | string (auto) | ✅ | PK |
| email | string | ✅ | bkend auth와 연결 키 |
| name | string | ✅ | 표시 이름 |
| username | string | ✅ | 로그인 ID |
| role | string | ✅ | "admin" \| "president" \| "staff" \| "advisor" \| "alumni" \| "member" |
| generation | number | ✅ | 기수 |
| field | string | ✅ | 전공/연구분야 |
| bio | string | | 자기소개 |
| occupation | string | | 직종 |
| affiliation | string | | 소속기관 |
| department | string | | 학과 |
| position | string | | 직위 |
| contactEmail | string | | 연락용 이메일 |
| contactVisibility | string | | "public" \| "members" \| "staff" \| "private" |
| approved | boolean | ✅ | 가입 승인 여부 (기본: false) |
| profileImage | string | | 프로필 이미지 URL |

RBAC:
- admin: 전체 CRUD
- user (authenticated): Read (자신), Update (자신)
- guest: 없음

### 2.2 posts

| 컬럼 | 타입 | 필수 |
|------|------|:----:|
| id | string (auto) | ✅ |
| title | string | ✅ |
| content | string | ✅ |
| category | string | ✅ |
| authorId | string | ✅ |
| authorName | string | ✅ |
| viewCount | number | ✅ (기본: 0) |

RBAC:
- admin/staff: 전체 CRUD
- user: Create, Read, Update/Delete (본인)
- guest: Read (category=notice만)

### 2.3 comments

| 컬럼 | 타입 | 필수 |
|------|------|:----:|
| id | string (auto) | ✅ |
| postId | string | ✅ |
| content | string | ✅ |
| authorId | string | ✅ |
| authorName | string | ✅ |

RBAC:
- admin/staff: 전체 CRUD
- user: Create, Read, Delete (본인)

### 2.4 seminars

| 컬럼 | 타입 | 필수 |
|------|------|:----:|
| id | string (auto) | ✅ |
| title | string | ✅ |
| description | string | |
| date | string | ✅ |
| time | string | ✅ |
| location | string | ✅ |
| speaker | string | ✅ |
| speakerType | string | ✅ |
| speakerTitle | string | |
| maxAttendees | number | |
| posterImage | string | |
| status | string | ✅ |

### 2.5 seminar_sessions

| 컬럼 | 타입 | 필수 |
|------|------|:----:|
| id | string (auto) | ✅ |
| seminarId | string | ✅ |
| title | string | ✅ |
| speaker | string | ✅ |
| speakerType | string | ✅ |
| speakerTitle | string | |
| time | string | |
| description | string | |
| order | number | ✅ |

### 2.6 seminar_attendees

| 컬럼 | 타입 | 필수 |
|------|------|:----:|
| id | string (auto) | ✅ |
| seminarId | string | ✅ |
| userId | string | ✅ |

Unique constraint: seminarId + userId

### 2.7 inquiries

| 컬럼 | 타입 | 필수 |
|------|------|:----:|
| id | string (auto) | ✅ |
| name | string | ✅ |
| email | string | ✅ |
| category | string | ✅ |
| message | string | ✅ |
| status | string | ✅ (기본: "pending") |

RBAC: guest도 Create 가능

## 3. 파일별 상세 변경

### 3.1 `src/lib/bkend.ts` — 변경 없음

현재 코드가 이미 올바른 엔드포인트 사용 중:
- `/auth/email/signup`, `/auth/email/signin`, `/auth/me`, `/auth/signout`, `/auth/refresh`
- `/data/{table}` CRUD
- `X-API-Key` 헤더 포함

### 3.2 `src/features/auth/useAuth.ts` — 인증 전환

```typescript
// 변경 전: DEMO_ACCOUNTS + localStorage mock
// 변경 후:

export function useAuth() {
  const store = useAuthStore();

  async function login(username: string, password: string): Promise<User> {
    // 1. bkend 로그인 (email=username 시도)
    const tokens = await authApi.login({ email: username, password });
    saveTokens(tokens.accessToken, tokens.refreshToken);

    // 2. bkend auth user 조회
    const authUser = await authApi.me(tokens.accessToken);

    // 3. 학회 프로필 조회
    const profileRes = await profilesApi.getByEmail(authUser.email);
    const profile = profileRes.data[0];

    if (!profile) throw new Error("프로필을 찾을 수 없습니다.");

    // 4. 합병 후 store 저장
    const user = mergeToUser(authUser, profile);
    store.setUser(user);
    return user;
  }

  async function signup(data: SignupData): Promise<void> {
    // 1. bkend 회원가입
    const tokens = await authApi.signup({
      email: data.email,
      password: data.password,
      name: data.name,
    });
    saveTokens(tokens.accessToken, tokens.refreshToken);

    // 2. 프로필 생성
    await profilesApi.create({
      email: data.email,
      name: data.name,
      username: data.username,
      role: "member",
      generation: data.generation,
      field: data.field,
      approved: false,
    });
  }

  async function restoreSession(): Promise<void> {
    const token = getAccessToken();
    if (!token) { store.setInitialized(true); return; }

    try {
      const authUser = await authApi.me(token);
      const profileRes = await profilesApi.getByEmail(authUser.email);
      const profile = profileRes.data[0];
      if (profile) store.setUser(mergeToUser(authUser, profile));
    } catch {
      clearTokens();
    } finally {
      store.setInitialized(true);
    }
  }

  // ...logout, mergeToUser 등
}
```

### 3.3 `src/features/board/useBoard.ts` — Mock fallback 제거

```typescript
// 변경: placeholderData, catch 블록의 mock fallback 제거
// API 호출이 실패하면 에러를 throw하도록 변경
// retry: 1 (1회 재시도)

export function usePosts(...) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", category],
    queryFn: async () => {
      const res = await postsApi.list({ category: cat, limit: 100 });
      return res.data as Post[];
    },
    retry: 1,
  });

  const posts = data ?? [];
  // ... 검색, 페이지네이션 동일
}
```

### 3.4 세미나 — Zustand → React Query

```
src/features/seminar/useSeminar.ts (신규)

- useSeminars(): 세미나 목록 조회
- useSeminar(id): 세미나 상세 조회
- useCreateSeminar(): 세미나 생성
- useUpdateSeminar(): 세미나 수정
- useDeleteSeminar(): 세미나 삭제
- useToggleAttendance(): 참석 신청/취소

기존 seminar-store.ts → 제거 (또는 클라이언트 상태 최소화)
```

### 3.5 문의 — Zustand → React Query

```
src/features/inquiry/useInquiry.ts (신규)

- useInquiries(): 문의 목록 (admin)
- useCreateInquiry(): 문의 제출 (비회원 포함)
- useUpdateInquiry(): 상태 변경 (답변완료)
```

### 3.6 관리자 페이지

```
AdminMemberTab: profilesApi.list() → 실제 회원 목록
  - 승인: profilesApi.approve(id)
  - 역할 변경: profilesApi.update(id, { role })

AdminPostTab: postsApi.list() 이미 연동 구조

AdminSeminarTab: seminarsApi 연동

AdminInquiryTab: inquiriesApi 연동
```

## 4. 환경변수

```env
# .env.local
NEXT_PUBLIC_BKEND_URL=https://api.bkend.ai/v1
NEXT_PUBLIC_BKEND_API_KEY=pk_...  # bkend 대시보드에서 발급
```

## 5. 회원가입 폼 수정

현재 `src/app/signup/page.tsx`에서:
- username → 유지 (로컬 ID)
- **email 필드 추가** (bkend 인증에 필요)
- password → 유지
- name, generation, field → 유지

## 6. 마이그레이션 순서

```
Phase 1: 인증 (signup/login/restore)
  → 기존 데모 계정은 유지하되, bkend 우선 시도 + 데모 fallback

Phase 2: 게시판 (posts + comments)
  → Mock fallback 유지하면서 API 우선

Phase 3: 세미나 (seminars + sessions + attendees)
  → Zustand → React Query 전환

Phase 4: 문의 + 관리자
  → Zustand → React Query 전환

Phase 5: 정리
  → 데모 계정 제거
  → Mock 데이터 제거 (또는 개발 환경만 유지)
  → board-data.ts, seminar-data.ts 정리
```

## 7. 구현 체크리스트

- [ ] bkend.ai 프로젝트 생성 + API Key 발급
- [ ] 7개 테이블 생성 (MCP 또는 대시보드)
- [ ] .env.local 설정
- [ ] useAuth.ts: bkend 인증 로직 (login, signup, restoreSession)
- [ ] signup 폼: email 필드 추가
- [ ] useBoard.ts: Mock fallback 제거, API 우선
- [ ] useSeminar.ts: React Query 훅 (신규)
- [ ] useInquiry.ts: React Query 훅 (신규)
- [ ] AdminMemberTab: 실 데이터 (profilesApi)
- [ ] AdminPostTab: 실 데이터 확인
- [ ] AdminSeminarTab: seminarsApi 연동
- [ ] AdminInquiryTab: inquiriesApi 연동
- [ ] 데모 계정/Mock 데이터 정리
