# 연세교육공학회 홈페이지 - 작업 로그

## 프로젝트 개요
- **프로젝트명**: yonsei-edtech (연세교육공학회 홈페이지)
- **스택**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn
- **상태관리**: Zustand, TanStack Query
- **UI**: Framer Motion, Lucide Icons, Pretendard 폰트
- **배포**: Vercel
- **GitHub**: yonseiedtech/yonsei-edtech

---

## 2026-03-13

### 초기 구현 완료 및 첫 배포

**구현된 페이지 (14개)**:
| 페이지 | 경로 | 타입 |
|--------|------|------|
| 홈 | `/` | Static |
| 학회 소개 | `/about` | Static |
| 활동 | `/activities` | Static |
| 회원 | `/members` | Static |
| 게시판 목록 | `/board` | Static |
| 게시판 상세 | `/board/[id]` | Dynamic |
| 게시판 작성 | `/board/write` | Static |
| 문의 | `/contact` | Static |
| 로그인 | `/login` | Static |
| 회원가입 | `/signup` | Static |
| 마이페이지 | `/mypage` | Static |
| 관리자 | `/admin` | Static |

**컴포넌트 구조 (36개 파일)**:
- `components/home/` — HeroSection, AboutPreview, ActivityCards, StatsSection
- `components/about/` — Timeline
- `components/activities/` — ActivityCard, ActivityFilter
- `components/contact/` — ContactForm
- `components/members/` — GenerationTabs, MemberCard
- `components/layout/` — Header, Footer
- `components/ui/` — avatar, badge, button, card, dialog, input, pagination, separator, sonner, tabs, textarea
- `features/auth/` — AuthGuard, LoginForm, SignupForm, ProfileEditor, MyPostList
- `features/board/` — CategoryTabs, CommentForm, CommentList, PostForm, PostList
- `features/admin/` — AdminUserList
- `lib/` — bkend.ts, utils.ts

**작업 내용**:
- [x] Next.js 16 프로젝트 초기 설정
- [x] 전체 페이지 라우팅 구성
- [x] UI 컴포넌트 (shadcn 기반) 구축
- [x] 홈 페이지 히어로 섹션 및 미리보기 구현
- [x] 회원 인증 기능 (로그인, 회원가입, 마이페이지)
- [x] 게시판 기능 (목록, 상세, 작성, 댓글)
- [x] 관리자 페이지
- [x] 빌드 성공 확인
- [x] GitHub 저장소 생성 (yonseiedtech/yonsei-edtech)
- [x] Vercel 배포

### SEO 전체 최적화

**추가된 SEO 파일**:
| 파일 | 역할 |
|------|------|
| `src/app/robots.ts` | 검색 엔진 크롤링 규칙 (admin, mypage 등 비공개 페이지 차단) |
| `src/app/sitemap.ts` | 검색 엔진용 페이지 목록 (6개 공개 페이지) |
| `src/app/manifest.ts` | PWA 매니페스트 (앱 이름, 테마 색상) |
| `src/app/opengraph-image.tsx` | OG 이미지 동적 생성 (카카오톡/SNS 공유 미리보기) |
| `src/components/seo/JsonLd.tsx` | 구조화 데이터 (Organization + WebSite) |

**메타데이터 강화**:
- layout.tsx: Open Graph, Twitter Card, 확장 키워드, robots 설정, canonical URL
- 각 페이지별 layout.tsx 추가 (login, signup, board, mypage, admin)
- 비공개 페이지 (login, signup, mypage, admin)는 `robots: noindex` 처리

**작업 내용**:
- [x] Open Graph 메타 태그 (카카오톡/페이스북 공유 미리보기)
- [x] Twitter Card 메타 태그
- [x] robots.txt (크롤링 규칙)
- [x] sitemap.xml (검색 엔진 페이지 목록)
- [x] manifest.webmanifest (PWA 기본 정보)
- [x] JSON-LD 구조화 데이터 (Organization, WebSite)
- [x] 동적 OG 이미지 생성
- [x] 페이지별 개별 메타데이터
- [x] 확장 키워드 10개 (한국어 + 영어)
- [x] 빌드 확인 완료

### 로고/파비콘 적용 + 로그인 아이디 방식 전환

**로고/파비콘**:
- `public/yonsei-emblem.svg` — 연세대 엠블럼 (파비콘, 로그인 아이콘, 히어로 섹션)
- `public/logo.png` — 연세교육공학회 텍스트 로고 (헤더)
- `src/app/icon.svg` — 파비콘 (YE 텍스트, 연세 블루)
- 헤더: "YE" 텍스트 → 엠블럼 + 텍스트 로고 이미지
- 히어로 섹션: 엠블럼 추가
- 로그인 페이지: 엠블럼 이미지

**로그인 방식 변경 (이메일 → 아이디)**:
- `User` 타입: `email` → `username` (필수) + `email` (선택)
- `LoginForm`: 이메일 입력 → 아이디 입력
- `useAuth`: 로그인 로직 아이디 기반으로 변경
- `SignupForm`: 아이디 필드 추가 (3~20자, 영문/숫자/밑줄)
- `ProfileEditor`: 이메일 표시 → 아이디 표시
- `AdminUserList`: 이메일 표시 → @username 표시
- 데모 계정: admin / admin123 또는 아무 아이디 / test123

### 로고 미반영 수정 + Google 검색 노출 강화

**로고 미반영 수정**:
- Footer: "YE" 텍스트 박스 → 연세대 엠블럼 이미지 교체
- OG 이미지: "YE" → "YONSEI" 원형 디자인 + "연세대학교 교육공학 전공" 문구

**Google 검색 노출 (SEO 강화)**:
- 타이틀: `연세교육공학회 - 연세대학교 교육공학 전공 학술 커뮤니티`
- description: "연세대학교 교육공학 전공" 키워드 선두 배치
- 키워드 추가: "연세대학교 교육공학 전공", "교육공학 전공", "연세대 교육공학"
- JSON-LD: alternateName에 "연세대학교 교육공학 전공" 포함, sameAs(인스타) 추가, 주소/이메일 정보 추가
- JSON-LD knowsAbout: 한국어 키워드 추가

**Google Search Console 등록 필요** (수동 작업):
1. https://search.google.com/search-console 접속
2. "URL 접두어" 방식으로 `https://yonsei-edtech.vercel.app` 추가
3. HTML 태그 인증 → 발급된 코드를 layout.tsx의 `verification.google`에 추가
4. Sitemap 제출: `https://yonsei-edtech.vercel.app/sitemap.xml`

---

## 2026-03-14

### 역할/게시판/세미나 기능 (PDCA: role-board-seminar, 98%, archived)

이전 세션에서 구현된 기능에 대한 PDCA 사이클 완료.

**구현 내용**:
- 역할 기반 권한 시스템 (admin/president/staff/advisor/alumni/member/guest)
- 게시판 5개 카테고리 (공지/세미나자료/자유/홍보/학회보)
- 세미나 CRUD + 참석 토글 + Zustand 스토어
- 문의 스토어 + 관리자 4탭 구성

### 관리자 대시보드 개선

**A. 탭 UI 개선** (`src/app/admin/page.tsx`):
- TabsList `w-full` + TabsTrigger 아이콘(Users/FileText/BookOpen/MessageSquare)
- 더 큰 터치 영역 (`px-4 py-2 text-base`)

**B. 게시글 탭 리팩토링** (`src/features/admin/AdminPostTab.tsx`):
- CategoryTabs 서브필터 (전체/공지/세미나/자유/홍보/학회보)
- 검색 Input (제목/작성자 통합 검색) + 정렬 select (최신순/조회순)
- 체크박스 일괄 선택 + "선택 삭제" 버튼
- 각 행에 수정 버튼 → Dialog로 제목/내용 인라인 수정

**C. 세미나 타입 확장** (`src/types/index.ts`):
- `SeminarSession` 인터페이스 신규 (id, seminarId, title, speaker, speakerBio, time, duration, order)
- `Seminar`에 `posterUrl?: string`, `sessions?: SeminarSession[]` 추가

**D. 세미나 목업 데이터** (`src/features/seminar/seminar-data.ts`):
- s1에 3개 세션, s4에 2개 세션 추가
- s1, s4에 posterUrl (placehold.co) 추가

**E. 세미나 스토어** (`src/features/seminar/seminar-store.ts`):
- `addSession`, `updateSession`, `deleteSession` 액션 추가

**F. 세미나 관리 탭** (`src/features/admin/AdminSeminarTab.tsx`):
- 포스터 썸네일 컬럼 (posterUrl img / ImageIcon placeholder)
- 수정 Dialog (제목, 날짜, 시간, 장소, 발표자, 최대인원, 포스터URL, 설명)
- Collapsible 세션 목록 (순서 배지, 발표자/소요시간 표시)
- 세션 추가/수정/삭제 인라인 UI

**G. shadcn 컴포넌트**: checkbox, collapsible 추가

### bkend.ai 백엔드 연동

**환경 설정**:
- `.env.local` — NEXT_PUBLIC_BKEND_API_KEY 설정
- `.mcp.json` — bkend MCP 서버 설정 (https://mcp.bkend.ai)
- `claude mcp add bkend` 완료

**코드 변경**:

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/bkend.ts` | 전면 재작성 — X-API-Key 헤더, `/data/{table}` 엔드포인트, 토큰 자동 갱신(401→refresh→retry), 타입 안전 CRUD API (dataApi, postsApi, commentsApi, profilesApi, seminarsApi, sessionsApi, attendeesApi, inquiriesApi) |
| `src/lib/query-provider.tsx` | TanStack Query Provider 신규 (staleTime 1분, retry 1) |
| `src/app/layout.tsx` | QueryProvider 래핑 추가 |
| `src/features/auth/auth-store.ts` | `initialized` 상태 추가 (세션 복원 판단용) |
| `src/features/auth/useAuth.ts` | bkend API 로그인 (`/auth/email/signin`) + 데모 fallback, 앱 시작 시 localStorage 토큰으로 세션 복원 (`/auth/me` + `/data/users`) |
| `src/features/auth/SignupForm.tsx` | bkend signup (`/auth/email/signup`) + users 테이블 프로필 저장 |
| `src/features/board/useBoard.ts` | TanStack Query (`useQuery`/`useMutation`) + mock fallback, `usePosts`, `usePost`, `useComments`, `useCreatePost`, `useCreateComment` |

**API 엔드포인트 매핑**:
| 기능 | 엔드포인트 |
|------|-----------|
| 회원가입 | `POST /auth/email/signup` |
| 로그인 | `POST /auth/email/signin` |
| 현재 사용자 | `GET /auth/me` |
| 토큰 갱신 | `POST /auth/refresh` |
| 로그아웃 | `POST /auth/signout` |
| 데이터 CRUD | `GET/POST/PUT/PATCH/DELETE /data/{table}` |

**동작 방식**: bkend 테이블 미생성 시 → API 실패 → mock 데이터 자동 fallback

**연동 가이드**: `docs/02-design/bkend-integration-guide.md` (7개 테이블 스키마, RBAC, 인증 흐름)

### nav-content-enhance Plan 작성

메뉴/네비게이션 재설계 + 콘텐츠 페이지 강화 Plan 문서 작성 (`docs/01-plan/features/nav-content-enhance.plan.md`).

**범위**:
- A. Header 서브메뉴 드롭다운(Desktop) + 아코디언(Mobile), `/about/history` 연혁 신규
- B. 게시판 카테고리별 라우트 (`/board?category=seminar` 등 쿼리 파라미터)
- C. 세미나 상세 포스터 이미지 + 세션 타임라인
- D. 갤러리 플레이스홀더 (`/gallery`)

### PDCA 상태

| 피처 | Phase | Match Rate | 비고 |
|------|-------|------------|------|
| yonsei-edtech-homepage | archived | 92.5% | 2026-03-12 |
| role-board-seminar | archived | 98% | 2026-03-13 |
| nav-content-enhance | plan | - | 다음 작업 |

### 남은 작업

1. **bkend 테이블 생성** — Claude Code 세션 재시작 → MCP로 7개 테이블 생성
2. **Vercel 환경변수** — `NEXT_PUBLIC_BKEND_API_KEY` 등록
3. **nav-content-enhance** — Design → Do → 배포
4. **Google Search Console** — 인증 코드 등록 + Sitemap 제출

---

*이 파일은 작업 진행 시마다 업데이트됩니다.*
