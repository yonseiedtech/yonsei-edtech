# 연세교육공학회 홈페이지 Design Document

> **Summary**: 연세교육공학회 공식 홈페이지 — 학회 소개, 활동, 멤버 정적 페이지 + 게시판 CRUD + 회원 인증
>
> **Project**: yonsei-edtech
> **Version**: 0.1.0
> **Author**: rlaeo
> **Date**: 2026-03-11
> **Status**: Draft
> **Planning Doc**: [yonsei-edtech-homepage.plan.md](../01-plan/features/yonsei-edtech-homepage.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 학회 소개 콘텐츠를 SSG로 빠르게 제공하여 SEO 및 성능 확보
- bkend.ai BaaS를 활용해 서버 코드 없이 인증/DB/파일 기능 구현
- 에듀테크 감성의 창의적이고 모던한 UI/UX 제공
- 반응형 디자인으로 모바일/데스크톱 동시 대응

### 1.2 Design Principles

- **Simple First**: 최소한의 복잡도로 MVP 기능 구현
- **Static + Dynamic 분리**: 소개 페이지는 SSG, 게시판/인증은 CSR
- **Component Reusability**: 카드, 폼 등 공용 컴포넌트 재사용

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────┐
│                    Vercel (Hosting)                    │
│  ┌────────────────────────────────────────────────┐   │
│  │            Next.js App Router                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │   │
│  │  │  Static  │  │Protected │  │    Auth      │ │   │
│  │  │  Pages   │  │  Pages   │  │   Pages      │ │   │
│  │  │(SSG/SSR) │  │  (CSR)   │  │   (CSR)      │ │   │
│  │  └──────────┘  └────┬─────┘  └──────┬───────┘ │   │
│  │                     │               │          │   │
│  │              ┌──────┴───────────────┘          │   │
│  │              ▼                                  │   │
│  │     ┌─────────────────┐                        │   │
│  │     │  bkend.ai SDK   │                        │   │
│  │     │  (REST Client)  │                        │   │
│  │     └────────┬────────┘                        │   │
│  └──────────────┼─────────────────────────────────┘   │
└─────────────────┼─────────────────────────────────────┘
                  ▼
       ┌─────────────────────┐
       │    bkend.ai BaaS    │
       │  ┌───────┐ ┌─────┐ │
       │  │ Auth  │ │  DB │ │
       │  └───────┘ └─────┘ │
       │  ┌───────────────┐  │
       │  │  File Storage │  │
       │  └───────────────┘  │
       └─────────────────────┘
```

### 2.2 Page Rendering Strategy

| 페이지 | 렌더링 | 이유 |
|--------|--------|------|
| 메인 (/) | SSG + ISR | SEO, 빠른 로딩 |
| 소개 (/about) | SSG | 정적 콘텐츠 |
| 활동 (/activities) | SSG | 정적 콘텐츠 |
| 멤버 (/members) | SSG | 정적 콘텐츠 |
| 문의 (/contact) | SSG | 폼만 CSR |
| 로그인 (/login) | CSR | 인증 처리 |
| 회원가입 (/signup) | CSR | 인증 처리 |
| 게시판 (/board) | CSR | 동적 데이터 |
| 글 상세 (/board/[id]) | CSR | 동적 데이터 |
| 글쓰기 (/board/write) | CSR | 인증 필요 |
| 마이페이지 (/mypage) | CSR | 인증 필요 |
| 관리자 (/admin) | CSR | 인증 필요 |

### 2.3 Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| next | App Router framework | 15.x |
| react / react-dom | UI library | 19.x |
| tailwindcss | Utility-first CSS | 4.x |
| @tanstack/react-query | 서버 상태 관리 | 5.x |
| react-hook-form | 폼 관리 | 7.x |
| zustand | 클라이언트 상태 (인증) | 5.x |
| lucide-react | 아이콘 | latest |
| framer-motion | 애니메이션 | 12.x |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// 사용자 (bkend.ai users 테이블 — 내장)
interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";    // 관리자 / 일반회원
  generation: number;           // 기수 (e.g., 1, 2, 3...)
  field: string;                // 관심 에듀테크 분야
  profileImage?: string;        // 프로필 이미지 URL
  bio?: string;                 // 자기소개
  approved: boolean;            // 관리자 승인 여부
  createdAt: Date;
  updatedAt: Date;
}

// 게시글
interface Post {
  id: string;
  title: string;
  content: string;              // 본문 (텍스트)
  category: "notice" | "seminar" | "free";  // 공지 / 세미나자료 / 자유
  authorId: string;             // 작성자 User ID
  authorName: string;           // 작성자 이름 (비정규화)
  viewCount: number;            // 조회수
  createdAt: Date;
  updatedAt: Date;
}

// 댓글
interface Comment {
  id: string;
  postId: string;               // 게시글 ID
  content: string;              // 댓글 내용
  authorId: string;             // 작성자 User ID
  authorName: string;           // 작성자 이름
  createdAt: Date;
}

// 문의
interface Inquiry {
  id: string;
  name: string;                 // 문의자 이름
  email: string;                // 문의자 이메일
  message: string;              // 문의 내용
  status: "pending" | "replied"; // 처리 상태
  createdAt: Date;
}
```

### 3.2 Entity Relationships

```
[User] 1 ──── N [Post]
  │
  └── 1 ──── N [Comment]

[Post] 1 ──── N [Comment]

[Inquiry] (독립)
```

### 3.3 bkend.ai Table Schema

#### users (확장 프로필 — bkend.ai 내장 auth + 별도 profiles 테이블)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | String | Yes | bkend.ai auth user ID (FK) |
| name | String | Yes | 이름 |
| generation | Number | Yes | 기수 |
| field | String | No | 관심 분야 |
| profileImage | String | No | 프로필 이미지 URL |
| bio | String | No | 자기소개 |
| role | String | Yes | "admin" / "member" |
| approved | Boolean | Yes | 승인 여부 (기본 false) |

#### posts

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | String | Yes | 제목 |
| content | String | Yes | 본문 |
| category | String | Yes | "notice" / "seminar" / "free" |
| authorName | String | Yes | 작성자 이름 |
| viewCount | Number | No | 조회수 (기본 0) |

#### comments

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| postId | String | Yes | 게시글 ID |
| content | String | Yes | 댓글 내용 |
| authorName | String | Yes | 작성자 이름 |

#### inquiries

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | 문의자 이름 |
| email | String | Yes | 문의자 이메일 |
| message | String | Yes | 문의 내용 |
| status | String | No | "pending" / "replied" |

---

## 4. API Specification

### 4.1 bkend.ai 자동 생성 REST API

bkend.ai가 테이블 생성 시 자동으로 CRUD REST API를 제공합니다.

#### Auth API (bkend.ai 내장)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/signup | 회원가입 (email + password) |
| POST | /auth/login | 로그인 → JWT 토큰 반환 |
| POST | /auth/logout | 로그아웃 |
| GET | /auth/me | 현재 로그인 사용자 정보 |

#### Posts API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/posts | 게시글 목록 (필터: category) | Required |
| GET | /api/posts/:id | 게시글 상세 | Required |
| POST | /api/posts | 게시글 작성 | Required |
| PUT | /api/posts/:id | 게시글 수정 (본인만) | Required |
| DELETE | /api/posts/:id | 게시글 삭제 (본인 or admin) | Required |

#### Comments API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/comments?postId={id} | 특정 게시글의 댓글 목록 | Required |
| POST | /api/comments | 댓글 작성 | Required |
| DELETE | /api/comments/:id | 댓글 삭제 (본인 or admin) | Required |

#### Profiles API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/profiles | 멤버 목록 (관리자 승인된 회원) | Public |
| GET | /api/profiles/:userId | 프로필 상세 | Required |
| PUT | /api/profiles/:userId | 프로필 수정 (본인만) | Required |
| PATCH | /api/profiles/:userId | 승인 처리 (admin만) | Admin |

#### Inquiries API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/inquiries | 문의 등록 | Public |
| GET | /api/inquiries | 문의 목록 | Admin |

---

## 5. UI/UX Design

### 5.1 Global Layout

```
┌────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  ┌──────┬────────────────────────────────┬────────────────┐ │
│  │ Logo │  메인 | 소개 | 활동 | 멤버 | 문의 | 게시판    │ Login │ │
│  └──────┴────────────────────────────────┴────────────────┘ │
├────────────────────────────────────────────────────────────┤
│                                                             │
│                    Main Content Area                        │
│                    (Page-specific)                          │
│                                                             │
├────────────────────────────────────────────────────────────┤
│  Footer                                                     │
│  연세교육공학회 | Contact | SNS Links | Copyright           │
└────────────────────────────────────────────────────────────┘
```

### 5.2 메인 페이지 레이아웃

```
┌────────────────────────────────────────────────────────────┐
│                      HERO SECTION                           │
│  "교육의 미래를 함께 설계합니다"                              │
│  [학회 소개 보기]  [활동 살펴보기]                            │
│  (그라데이션 배경 + 에듀테크 일러스트/패턴)                   │
├────────────────────────────────────────────────────────────┤
│                   ABOUT PREVIEW                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  미션     │  │  비전     │  │  가치     │                  │
│  │  icon     │  │  icon     │  │  icon     │                  │
│  │  설명텍스트│  │  설명텍스트│  │  설명텍스트│                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
├────────────────────────────────────────────────────────────┤
│                  RECENT ACTIVITIES                           │
│  ┌────────┐  ┌────────┐  ┌────────┐                        │
│  │ Card 1 │  │ Card 2 │  │ Card 3 │                        │
│  │ 세미나  │  │프로젝트│  │ 스터디 │                        │
│  └────────┘  └────────┘  └────────┘                        │
│                              [더 보기 →]                    │
├────────────────────────────────────────────────────────────┤
│                   STATS / NUMBERS                           │
│  기수: 12+  |  멤버: 80+  |  세미나: 50+  |  프로젝트: 20+  │
└────────────────────────────────────────────────────────────┘
```

### 5.3 게시판 레이아웃

```
┌────────────────────────────────────────────────────────────┐
│  [공지사항]  [세미나 자료]  [자유게시판]        [글쓰기 +]   │
├────────────────────────────────────────────────────────────┤
│  # │ 제목                    │ 작성자  │ 날짜    │ 조회     │
│ ───┼─────────────────────────┼─────────┼─────────┼──────── │
│  1 │ 2026 봄학기 세미나 안내  │ 관리자  │ 03-10   │ 42      │
│  2 │ 에듀테크 트렌드 리포트   │ 김OO    │ 03-08   │ 28      │
│  3 │ 프로젝트 회고 공유       │ 이OO    │ 03-05   │ 15      │
├────────────────────────────────────────────────────────────┤
│              [< 1  2  3  4  5 >]                           │
└────────────────────────────────────────────────────────────┘
```

### 5.4 User Flow

```
비회원:
  메인 → 소개/활동/멤버/문의 열람 가능
       → 게시판/마이페이지 접근 시 → 로그인 페이지로 리다이렉트

회원가입:
  회원가입 페이지 → 가입 코드 입력 + 이메일/비밀번호/이름/기수
                 → 관리자 승인 대기 → 승인 후 로그인 가능

로그인 후:
  게시판 열람 → 글쓰기 → 글 수정/삭제 (본인 글)
  댓글 작성/삭제 (본인 댓글)
  마이페이지 → 프로필 수정

관리자:
  관리자 페이지 → 회원 승인/거부 → 게시글 관리 (삭제)
```

### 5.5 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `Header` | `src/components/layout/Header.tsx` | GNB, 로고, 네비게이션, 로그인 버튼 |
| `Footer` | `src/components/layout/Footer.tsx` | 하단 정보, 링크 |
| `MobileNav` | `src/components/layout/MobileNav.tsx` | 모바일 햄버거 메뉴 |
| `HeroSection` | `src/components/home/HeroSection.tsx` | 메인 히어로 배너 |
| `AboutPreview` | `src/components/home/AboutPreview.tsx` | 미션/비전/가치 카드 |
| `ActivityCards` | `src/components/home/ActivityCards.tsx` | 최근 활동 카드 |
| `StatsSection` | `src/components/home/StatsSection.tsx` | 숫자 통계 섹션 |
| `Timeline` | `src/components/about/Timeline.tsx` | 연혁 타임라인 |
| `ActivityCard` | `src/components/activities/ActivityCard.tsx` | 활동 카드 단일 |
| `ActivityFilter` | `src/components/activities/ActivityFilter.tsx` | 활동 필터 (세미나/프로젝트/스터디) |
| `MemberCard` | `src/components/members/MemberCard.tsx` | 멤버 프로필 카드 |
| `GenerationTabs` | `src/components/members/GenerationTabs.tsx` | 기수별 탭 |
| `ContactForm` | `src/components/contact/ContactForm.tsx` | 문의 폼 |
| `LoginForm` | `src/features/auth/LoginForm.tsx` | 로그인 폼 |
| `SignupForm` | `src/features/auth/SignupForm.tsx` | 회원가입 폼 |
| `AuthGuard` | `src/features/auth/AuthGuard.tsx` | 인증 보호 래퍼 |
| `PostList` | `src/features/board/PostList.tsx` | 게시글 목록 |
| `PostDetail` | `src/features/board/PostDetail.tsx` | 게시글 상세 |
| `PostForm` | `src/features/board/PostForm.tsx` | 게시글 작성/수정 폼 |
| `CategoryTabs` | `src/features/board/CategoryTabs.tsx` | 카테고리 탭 |
| `CommentList` | `src/features/board/CommentList.tsx` | 댓글 목록 |
| `CommentForm` | `src/features/board/CommentForm.tsx` | 댓글 작성 폼 |
| `Pagination` | `src/components/ui/Pagination.tsx` | 페이지네이션 |
| `ProfileEditor` | `src/features/mypage/ProfileEditor.tsx` | 프로필 편집 |
| `MyPostList` | `src/features/mypage/MyPostList.tsx` | 내 글 목록 |
| `AdminUserList` | `src/features/admin/AdminUserList.tsx` | 회원 관리 (승인/거부) |
| `AdminPostList` | `src/features/admin/AdminPostList.tsx` | 게시글 관리 |

---

## 6. Design System

### 6.1 Color Palette

```
Primary:     #6C5CE7  (Creative Purple)
Primary-dark: #5A4BD1
Accent:      #00B894  (Fresh Green)
Accent-dark: #00A381

Background:  #FAFAFA
Surface:     #FFFFFF
Border:      #E5E7EB

Text-primary:   #1F2937
Text-secondary: #6B7280
Text-muted:     #9CA3AF

Success:  #10B981
Warning:  #F59E0B
Error:    #EF4444
```

### 6.2 Typography

```
Font Family:
  한글: "Pretendard", sans-serif
  영문: "Inter", sans-serif

Sizes:
  Hero Title:  text-4xl (36px) md:text-6xl (60px)
  Page Title:  text-3xl (30px)
  Section:     text-2xl (24px)
  Card Title:  text-lg (18px)
  Body:        text-base (16px)
  Small:       text-sm (14px)
  Caption:     text-xs (12px)
```

### 6.3 Spacing & Radius

```
Section padding:  py-16 md:py-24
Card padding:     p-6
Card radius:      rounded-2xl
Button radius:    rounded-xl
Input radius:     rounded-lg
Shadow:           shadow-sm hover:shadow-md
```

---

## 7. Security Considerations

- [x] bkend.ai 내장 JWT 인증 사용 (토큰 자동 관리)
- [x] 게시판/마이페이지는 AuthGuard로 비인가 접근 차단
- [x] 게시글/댓글 수정·삭제는 본인 또는 admin만 허용
- [x] 회원가입 시 가입 코드 검증으로 외부인 차단
- [x] 문의 폼 입력값 검증 (XSS 방지)
- [x] 관리자 페이지는 role="admin" 검증

---

## 8. Error Handling

| 상황 | 처리 |
|------|------|
| 미로그인으로 보호 페이지 접근 | /login으로 리다이렉트 + 원래 URL 저장 |
| 미승인 회원이 로그인 | "관리자 승인 대기 중" 메시지 표시 |
| 게시글 없음 (404) | "게시글을 찾을 수 없습니다" 메시지 |
| 네트워크 에러 | 토스트로 "연결 오류. 다시 시도해주세요" |
| 폼 유효성 실패 | 필드 하단 인라인 에러 메시지 |

---

## 9. File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (Header + Footer)
│   ├── page.tsx                      # 메인 페이지 (/)
│   ├── about/
│   │   └── page.tsx                  # 학회 소개
│   ├── activities/
│   │   └── page.tsx                  # 활동 소개
│   ├── members/
│   │   └── page.tsx                  # 멤버 소개
│   ├── contact/
│   │   └── page.tsx                  # 문의
│   ├── login/
│   │   └── page.tsx                  # 로그인
│   ├── signup/
│   │   └── page.tsx                  # 회원가입
│   ├── board/
│   │   ├── page.tsx                  # 게시판 목록
│   │   ├── [id]/
│   │   │   └── page.tsx             # 게시글 상세
│   │   └── write/
│   │       └── page.tsx             # 글쓰기
│   ├── mypage/
│   │   └── page.tsx                  # 마이페이지
│   └── admin/
│       └── page.tsx                  # 관리자 페이지
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── MobileNav.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── AboutPreview.tsx
│   │   ├── ActivityCards.tsx
│   │   └── StatsSection.tsx
│   ├── about/
│   │   └── Timeline.tsx
│   ├── activities/
│   │   ├── ActivityCard.tsx
│   │   └── ActivityFilter.tsx
│   ├── members/
│   │   ├── MemberCard.tsx
│   │   └── GenerationTabs.tsx
│   ├── contact/
│   │   └── ContactForm.tsx
│   └── ui/                           # shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── tabs.tsx
│       ├── dialog.tsx
│       ├── toast.tsx
│       └── pagination.tsx
├── features/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── AuthGuard.tsx
│   │   ├── useAuth.ts                # 인증 상태 훅
│   │   └── auth-store.ts             # Zustand 인증 스토어
│   ├── board/
│   │   ├── PostList.tsx
│   │   ├── PostDetail.tsx
│   │   ├── PostForm.tsx
│   │   ├── CategoryTabs.tsx
│   │   ├── CommentList.tsx
│   │   ├── CommentForm.tsx
│   │   └── useBoard.ts               # 게시판 쿼리 훅
│   ├── mypage/
│   │   ├── ProfileEditor.tsx
│   │   └── MyPostList.tsx
│   └── admin/
│       ├── AdminUserList.tsx
│       └── AdminPostList.tsx
├── lib/
│   ├── bkend.ts                       # bkend.ai API 클라이언트
│   └── utils.ts                       # 유틸리티 함수
├── types/
│   └── index.ts                       # TypeScript 타입 정의
└── styles/
    └── globals.css                    # Tailwind + 글로벌 스타일
```

---

## 10. Implementation Order

### Step 1: 프로젝트 초기화 (Foundation)
1. [ ] Next.js 프로젝트 생성 (`create-next-app`)
2. [ ] Tailwind CSS + shadcn/ui 설정
3. [ ] Pretendard + Inter 폰트 설정
4. [ ] 기본 레이아웃 (Header, Footer, layout.tsx)
5. [ ] 디자인 토큰 (색상, 타이포그래피) 적용

### Step 2: 정적 페이지 (Static Pages)
6. [ ] 메인 페이지 (Hero, AboutPreview, ActivityCards, Stats)
7. [ ] 학회 소개 페이지 (Timeline, 미션/비전)
8. [ ] 활동 소개 페이지 (ActivityCard, Filter)
9. [ ] 멤버 소개 페이지 (MemberCard, GenerationTabs) — 하드코딩 데이터
10. [ ] 문의 페이지 (ContactForm)

### Step 3: bkend.ai 연동 + 인증 (Auth)
11. [ ] bkend.ai 프로젝트 생성 + 테이블 정의
12. [ ] bkend.ai SDK 클라이언트 설정 (`lib/bkend.ts`)
13. [ ] 회원가입 폼 + 가입 코드 검증
14. [ ] 로그인/로그아웃 + JWT 토큰 관리
15. [ ] AuthGuard + 인증 스토어 (Zustand)
16. [ ] 마이페이지 (프로필 편집)

### Step 4: 게시판 (Board)
17. [ ] 게시판 목록 페이지 (카테고리 탭 + 페이지네이션)
18. [ ] 글쓰기/수정 페이지 (PostForm)
19. [ ] 글 상세 페이지 (PostDetail)
20. [ ] 댓글 기능 (CommentList + CommentForm)

### Step 5: 관리자 + 마무리 (Admin & Polish)
21. [ ] 관리자 페이지 (회원 승인, 게시글 관리)
22. [ ] 모바일 반응형 점검 + MobileNav
23. [ ] 에러 처리 + 로딩 상태
24. [ ] SEO 메타 태그 설정
25. [ ] Vercel 배포

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial draft | rlaeo |
