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

*이 파일은 작업 진행 시마다 업데이트됩니다.*
