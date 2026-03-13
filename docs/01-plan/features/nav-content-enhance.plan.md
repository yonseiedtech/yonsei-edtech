# Plan: nav-content-enhance

> 네비게이션 재설계 + 콘텐츠 페이지 강화

## 개요

연세교육공학회 홈페이지의 메뉴/네비게이션을 서브메뉴 풀구성(A안)으로 재설계하고,
게시판 카테고리별 직접 접근, 세미나 상세 포스터/세션 표시, 갤러리 플레이스홀더를 구현한다.

## 목표

1. **메뉴/네비게이션 재설계** — 서브메뉴 드롭다운으로 체계적 정보 구조
2. **게시판 카테고리별 라우트 분리** — 공지/세미나자료/자유/홍보/학회보 직접 접근
3. **세미나 상세 포스터/세션 표시** — posterUrl 이미지 + sessions 타임라인
4. **갤러리 페이지 신규** — 목업 수준 플레이스홀더 (백엔드 연동 시 완성)

## 범위

### A. 메뉴/네비게이션 재설계

#### A-1. Header 서브메뉴 구조

```
[공개 메뉴]
홈
학회소개 ▾
  ├ 학회 소개        → /about
  ├ 연혁             → /about/history (신규)
  ├ 조직도/멤버      → /members
  └ 활동 소개        → /activities
게시판 ▾
  ├ 공지사항          → /notices
  ├ 세미나 자료       → /board?category=seminar
  ├ 자유게시판        → /board?category=free
  ├ 홍보게시판        → /board?category=promotion
  └ 학회보            → /board?category=newsletter
문의하기             → /contact

[회원 전용]
세미나 ▾
  ├ 세미나 일정       → /seminars (upcoming 필터)
  └ 지난 세미나       → /seminars?status=completed
갤러리              → /gallery (NEW)
마이페이지           → /mypage
관리자              → /admin (staff 이상)
```

#### A-2. Desktop 드롭다운
- 호버 시 서브메뉴 패널이 아래로 펼쳐짐
- framer-motion AnimatePresence로 부드러운 진입/퇴장
- 현재 페이지에 해당하는 메뉴 항목 active 표시

#### A-3. Mobile 아코디언
- 햄버거 메뉴 내부에서 메뉴 그룹별 아코디언
- 서브메뉴 항목 클릭 시 메뉴 닫힘

#### A-4. 신규 페이지: /about/history
- 학회 연혁 타임라인 (목업 데이터)
- 연도별 주요 이벤트 카드

### B. 게시판 카테고리별 라우트 분리

#### B-1. 쿼리 파라미터 기반 카테고리 필터
- `/board?category=seminar` 형태로 직접 접근
- URL 쿼리에서 카테고리 읽어 CategoryTabs 초기값 설정
- 카테고리 변경 시 URL 쿼리 업데이트 (shallow routing)

#### B-2. 공지사항(/notices)은 기존 유지
- 이미 별도 라우트로 존재
- Header 서브메뉴에서 /notices로 링크

### C. 세미나 상세 포스터/세션 표시

#### C-1. 세미나 상세 페이지 (`/seminars/[id]`)
- posterUrl 있을 시 상단에 포스터 이미지 표시
- 이미지 클릭 시 확대 보기 (간단한 모달)
- posterUrl 없으면 기존 레이아웃 유지

#### C-2. 세션 타임라인
- sessions 배열을 order 순으로 정렬
- 타임라인 UI: 시간 | 발표제목 | 발표자 | 소요시간
- speakerBio 있으면 툴팁 또는 작은 텍스트로 표시

#### C-3. 세미나 목록 필터 강화
- `/seminars?status=completed` 쿼리 지원
- SeminarStatusTabs에서 URL 쿼리 연동

### D. 갤러리 페이지 (플레이스홀더)

#### D-1. /gallery 라우트
- AuthGuard 회원 전용
- 카드형 이미지 그리드 (2~3열 반응형)
- 카테고리 필터 (세미나/워크숍/MT/기타)

#### D-2. 목업 데이터
- 6~8개 갤러리 항목 (placeholder 이미지 URL)
- { id, title, category, date, imageUrl, description }

#### D-3. "준비 중" 안내
- 상단에 "갤러리는 현재 준비 중입니다" 배너
- 백엔드 연동 시 파일 업로드 기능 추가 예정 안내

## 파일 변경 예상

### 수정
- `src/components/layout/Header.tsx` — 서브메뉴 드롭다운/아코디언
- `src/app/board/page.tsx` — 쿼리 파라미터 기반 카테고리
- `src/features/board/CategoryTabs.tsx` — URL 연동 (optional)
- `src/app/seminars/page.tsx` — status 쿼리 파라미터
- `src/app/seminars/[id]/page.tsx` — 포스터/세션 표시

### 신규
- `src/app/about/history/page.tsx` — 연혁 페이지
- `src/app/gallery/page.tsx` — 갤러리 페이지
- `src/features/gallery/gallery-data.ts` — 목업 데이터
- `src/features/gallery/GalleryGrid.tsx` — 갤러리 그리드 컴포넌트

## 구현 순서

1. A (메뉴 재설계) — 전체 네비게이션 기반
2. B (게시판 카테고리 라우트) — 메뉴 링크와 연결
3. C (세미나 상세 강화) — 기존 데이터 활용
4. D (갤러리 플레이스홀더) — 독립적

## 검증 기준

- [ ] `npx next build` 통과
- [ ] Desktop: 호버 시 서브메뉴 드롭다운 표시
- [ ] Mobile: 햄버거 내 아코디언 동작
- [ ] `/board?category=seminar` 접근 시 세미나자료 필터 적용
- [ ] 세미나 상세에서 포스터 이미지 + 세션 타임라인 표시
- [ ] `/gallery` 접근 시 플레이스홀더 페이지 표시
- [ ] `/about/history` 연혁 페이지 표시
