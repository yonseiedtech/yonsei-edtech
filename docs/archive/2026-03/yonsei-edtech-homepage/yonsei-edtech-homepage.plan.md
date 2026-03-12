# 연세교육공학회 홈페이지 Planning Document

> **Summary**: 연세교육공학회(Yonsei EdTech) 공식 홈페이지 — 학회 소개, 활동 아카이빙, 게시판, 회원 관리 기능을 갖춘 커뮤니티 웹사이트
>
> **Project**: yonsei-edtech
> **Version**: 0.1.0
> **Author**: rlaeo
> **Date**: 2026-03-11
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

연세교육공학회의 공식 온라인 허브를 구축하여:
- 학회 소개 및 활동 내역을 외부/내부에 체계적으로 공개
- 학회원 간 지식 공유와 소통을 위한 게시판 제공
- 회원 인증을 통한 프라이빗 커뮤니티 공간 운영

### 1.2 Background

- 세미나 발제문, 에듀테크 리서치, 프로젝트 결과물이 카카오톡/개인 노션 등에 파편화
- 체계적인 축적·열람이 어려워 학회 자산화가 이루어지지 않음
- 학회 공식 웹사이트가 없어 외부 홍보 및 신규 회원 유입에 한계

### 1.3 Related Documents

- PRD 초안: 사용자 제공 (2026-03-11)

---

## 2. Scope

### 2.1 In Scope (Phase 1 MVP)

- [x] **메인 페이지**: 학회 비전, 최신 활동, 하이라이트
- [x] **학회 소개 페이지**: 설립 배경, 미션, 연혁
- [x] **활동 소개 페이지**: 세미나, 프로젝트, 스터디 등 활동 내역 (포트폴리오)
- [x] **멤버 소개 페이지**: 기수별 멤버 목록, 관심 분야
- [x] **문의 페이지**: 문의 폼 (이메일 연동 또는 단순 폼)
- [x] **게시판**: 공지사항, 세미나 자료, 자유게시판 (CRUD)
- [x] **회원가입/로그인**: 관리자 승인제 또는 가입 코드 인증
- [x] **마이페이지**: 프로필, 작성한 글 목록
- [x] **댓글 기능**: 게시글 하단 댓글

### 2.2 Out of Scope (Phase 2+)

- 태그 기반 지식 검색 / 통합 검색
- 북마크(스크랩) 기능
- 프로젝트 갤러리 뷰 (썸네일 중심)
- 좋아요 / 대댓글
- 게이미피케이션 (뱃지)
- 지식 그래프 시각화
- 마크다운 에디터 (Phase 1은 기본 텍스트 에디터)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 메인 페이지: 학회 비전, 최신 게시물, 활동 하이라이트 표시 | High | Pending |
| FR-02 | 학회 소개 페이지: 미션, 연혁, 활동 분야 소개 | High | Pending |
| FR-03 | 활동 소개 페이지: 세미나/프로젝트/스터디 카드형 리스트 | High | Pending |
| FR-04 | 멤버 소개 페이지: 기수별 멤버 카드 (이름, 관심 분야, 프로필 사진) | Medium | Pending |
| FR-05 | 문의 페이지: 이름, 이메일, 내용 입력 폼 | Medium | Pending |
| FR-06 | 회원가입: 가입 코드 또는 관리자 승인제 | High | Pending |
| FR-07 | 로그인/로그아웃: 이메일+비밀번호 인증 | High | Pending |
| FR-08 | 게시판: 카테고리별 글 목록, 글쓰기/수정/삭제 | High | Pending |
| FR-09 | 게시판 카테고리: 공지사항, 세미나 자료, 자유게시판 | High | Pending |
| FR-10 | 댓글: 게시글 하단 댓글 작성/삭제 | Medium | Pending |
| FR-11 | 마이페이지: 프로필 수정, 내 글 목록 | Medium | Pending |
| FR-12 | 관리자 기능: 회원 승인/거부, 게시글 관리 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 페이지 로드 < 3초 (LCP) | Lighthouse |
| Responsive | 모바일/태블릿/데스크톱 대응 | 실기기 테스트 |
| SEO | 메인·소개 페이지 SSR/SSG 적용 | Lighthouse SEO 점수 |
| Security | 비인가자 게시판/내부 자료 열람 차단 | 접근 테스트 |
| Accessibility | 기본 접근성 준수 (alt 텍스트, 키보드 내비게이션) | 수동 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 페이지 정상 렌더링 (메인, 소개, 활동, 멤버, 문의)
- [ ] 회원가입/로그인/로그아웃 정상 동작
- [ ] 게시판 CRUD 정상 동작
- [ ] 댓글 작성/삭제 정상 동작
- [ ] 관리자 회원 승인 기능 동작
- [ ] 모바일 반응형 UI 확인
- [ ] Vercel 배포 완료

### 4.2 Quality Criteria

- [ ] Lighthouse Performance 80+
- [ ] 모든 페이지 모바일 깨짐 없음
- [ ] 빌드 에러 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| bkend.ai 무료 티어 제한 | Medium | Low | 트래픽 낮은 학회 사이트이므로 무료 범위 내 운영 가능 |
| 이미지 업로드 용량 | Low | Medium | 프로필/게시물 이미지 크기 제한 (2MB) |
| 회원 인증 관리 복잡도 | Medium | Medium | Phase 1은 가입 코드 방식으로 단순화 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration (bkend.ai) | Web apps with backend, SaaS MVPs, fullstack apps | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React / Vue | **Next.js (App Router)** | SSR/SSG 지원, SEO 유리, Vercel 최적화 |
| State Management | Context / Zustand / Redux | **Zustand** | 경량, 간단한 전역 상태 관리 |
| API Client | fetch / axios / react-query | **TanStack Query + fetch** | 서버 상태 캐싱, 자동 리페칭 |
| Form Handling | react-hook-form / native | **react-hook-form** | 유효성 검증 편리 |
| Styling | Tailwind / CSS Modules | **Tailwind CSS** | 빠른 개발, 반응형 유틸리티 |
| UI Components | shadcn/ui / 자체 제작 | **shadcn/ui** | 커스터마이징 가능한 컴포넌트 |
| Backend | BaaS / Custom Server | **bkend.ai** | 인증/DB/파일 내장, 서버리스 |
| Deploy | Vercel / Cloud Run | **Vercel** | Next.js 최적화, 무료 티어 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

Folder Structure Preview:
┌─────────────────────────────────────────────────────┐
│ src/                                                │
│   app/                    ← Next.js App Router      │
│     (public)/             ← 비로그인 접근 가능 페이지 │
│       page.tsx            ← 메인                    │
│       about/              ← 학회 소개               │
│       activities/         ← 활동 소개               │
│       members/            ← 멤버 소개               │
│       contact/            ← 문의                    │
│     (auth)/               ← 인증 관련 페이지         │
│       login/                                        │
│       signup/                                       │
│     (protected)/          ← 로그인 필수 페이지       │
│       board/              ← 게시판                  │
│       mypage/             ← 마이페이지              │
│       admin/              ← 관리자 페이지           │
│     layout.tsx                                      │
│   components/             ← 공용 UI 컴포넌트        │
│     ui/                   ← shadcn/ui 컴포넌트      │
│     layout/               ← Header, Footer, Nav    │
│   features/               ← 기능별 모듈             │
│     auth/                 ← 인증 관련 훅/유틸       │
│     board/                ← 게시판 관련             │
│     members/              ← 멤버 관련               │
│   lib/                    ← 유틸리티                 │
│     bkend.ts              ← bkend.ai 클라이언트     │
│   types/                  ← TypeScript 타입 정의    │
└─────────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [ ] `CLAUDE.md` — 신규 프로젝트이므로 생성 필요
- [ ] ESLint configuration — Next.js 기본 설정 사용
- [ ] Prettier configuration — 생성 필요
- [ ] TypeScript configuration — Next.js 기본 생성

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | missing | 컴포넌트: PascalCase, 파일: kebab-case, 훅: camelCase | High |
| **Folder structure** | missing | Dynamic 레벨 구조 (위 6.3 참조) | High |
| **Import order** | missing | react → next → 외부 → 내부 → 타입 → 스타일 | Medium |
| **Environment variables** | missing | NEXT_PUBLIC_ 접두사 규칙 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEXT_PUBLIC_BKEND_URL` | bkend.ai API endpoint | Client | ☑ |
| `BKEND_API_KEY` | bkend.ai 서버 API 키 | Server | ☑ |
| `NEXT_PUBLIC_SIGNUP_CODE` | 회원가입 인증 코드 | Client | ☑ |

---

## 8. 페이지 구성 & 디자인 방향

### 8.1 페이지별 핵심 요소

| 페이지 | 핵심 요소 | 디자인 노트 |
|--------|----------|------------|
| **메인** | Hero 섹션 + 최신 활동 카드 + 학회 비전 | 에듀테크 느낌의 그라데이션, 동적 일러스트 |
| **소개** | 미션/비전, 연혁 타임라인, 활동 분야 | 타임라인 UI, 아이콘 활용 |
| **활동** | 카드형 리스트 (세미나/프로젝트/스터디) | 필터링, 썸네일 카드 |
| **멤버** | 기수별 탭 + 멤버 카드 (사진/이름/관심분야) | 그리드 레이아웃, 호버 효과 |
| **문의** | 입력 폼 + 연락처 정보 | 심플한 폼 UI |
| **게시판** | 카테고리 탭 + 글 목록 + 글쓰기 | 테이블/카드 토글 뷰 |
| **마이페이지** | 프로필 편집 + 내 글 목록 | 심플 대시보드 |

### 8.2 디자인 컨셉

- **테마**: 창의적/에듀테크 — 밝고 활기찬 색감
- **Primary Color**: `#6C5CE7` (Creative Purple) 또는 `#0984E3` (Tech Blue)
- **Accent**: `#00B894` (Fresh Green) — 에듀테크 혁신 느낌
- **Font**: Pretendard (한글) + Inter (영문)
- **특징**: 둥근 모서리, 부드러운 그림자, 미세 애니메이션

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`yonsei-edtech-homepage.design.md`)
2. [ ] bkend.ai 프로젝트 셋업 (데이터 모델 정의)
3. [ ] Next.js 프로젝트 초기화
4. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial draft | rlaeo |
