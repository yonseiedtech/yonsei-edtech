# Design: 역할 시스템 + 게시판 확장 + 세미나 관리

## Feature: role-board-seminar

## Phase 1: 역할 시스템 (6개 역할 + 권한)

### 1.1 타입 확장 (`src/types/index.ts`)
- UserRole: `admin | president | staff | alumni | member | guest`
- ROLE_LABELS 상수: 6역할 한글 라벨
- PostCategory: `notice | seminar | free | promotion | newsletter`
- CATEGORY_LABELS: 5개 카테고리 한글 라벨
- Seminar 인터페이스: id, title, description, date, time, location, speaker, speakerBio?, maxAttendees?, attendeeIds, status, createdBy, createdAt, updatedAt

### 1.2 권한 유틸 (`src/lib/permissions.ts`) — 신규
- ROLE_HIERARCHY: guest(0) < member(1) < alumni(2) < staff(3) < president(4) < admin(5)
- getUserRole(user): null이면 guest 반환
- isAtLeast(user, minimumRole): 계층 비교
- hasPermission(user, allowedRoles[]): 배열 포함 확인
- isStaffOrAbove(user): staff 이상
- isPresidentOrAbove(user): president 이상

### 1.3 AuthGuard 리팩토링 (`src/features/auth/AuthGuard.tsx`)
- Props: allowedRoles?: UserRole[] 추가
- requireAdmin은 레거시 호환용으로 유지
- hasPermission() 활용

### 1.4 데모 계정 (`src/features/auth/useAuth.ts`)
- admin / admin123 → admin
- president / test123 → president
- staff / test123 → staff
- alumni / test123 → alumni
- 아무아이디 / test123 → member

### 1.5 Header 네비게이션 (`src/components/layout/Header.tsx`)
- NAV_ITEMS에 minRole 속성 추가
- 게시판, 세미나, 멤버: minRole="member" (비로그인 숨김)
- 관리자 링크: staff 이상만 노출
- 모바일 메뉴도 동일 적용

### 1.6 권한 매트릭스 문서 (`docs/ROLE_PERMISSIONS.md`) — 신규
- 6역할 x 기능 매트릭스 표

## Phase 2: 게시판 카테고리 확장 + 홈페이지 리디자인

### 2.1 목업 데이터 (`src/features/board/board-data.ts`)
- promotion 게시글 3개 추가
- newsletter 게시글 3개 추가

### 2.2 CategoryTabs (`src/features/board/CategoryTabs.tsx`)
- CATEGORIES에 promotion, newsletter 추가
- flex-wrap 적용

### 2.3 PostForm (`src/features/board/PostForm.tsx`)
- 5개 카테고리 표시
- notice: president 이상만 선택 가능
- promotion, newsletter: staff 이상만 선택 가능
- seminar, free: 모든 회원

### 2.4 PostList (`src/features/board/PostList.tsx`)
- promotion 배지: emerald 색상
- newsletter 배지: violet 색상

### 2.5 홈페이지 프리뷰 컴포넌트 — 신규 4개
- `src/components/home/NoticePreview.tsx`: 공지사항 최근 3개 목록
- `src/components/home/PromotionPreview.tsx`: 홍보게시판 최근 3개 카드
- `src/components/home/NewsletterPreview.tsx`: 학회보 최근 3개 리스트
- `src/components/home/SeminarPreview.tsx`: 예정 세미나 1~2개 하이라이트

### 2.6 홈페이지 배치 (`src/app/page.tsx`)
- Hero → AboutPreview → NoticePreview → SeminarPreview → PromotionPreview → NewsletterPreview → ActivityCards

## Phase 3: 세미나 관리

### 3.1 데이터/스토어/훅
- `src/features/seminar/seminar-data.ts` — MOCK_SEMINARS 5개 (upcoming 3, completed 2)
- `src/features/seminar/seminar-store.ts` — Zustand (addSeminar, updateSeminar, deleteSeminar, toggleAttendance)
- `src/features/seminar/useSeminar.ts` — useSeminars, useSeminar, useCreateSeminar, useToggleAttendance

### 3.2 UI 컴포넌트
- `src/features/seminar/SeminarStatusTabs.tsx` — 전체/예정/완료 탭
- `src/features/seminar/SeminarList.tsx` — 세미나 카드 목록 (상태 배지, 일시, 장소, 참석자)
- `src/features/seminar/SeminarForm.tsx` — 등록 폼 (react-hook-form, 9개 필드)

### 3.3 페이지 라우트
- `src/app/seminars/layout.tsx` — 메타데이터
- `src/app/seminars/page.tsx` — 목록 (AuthGuard member 이상, staff 이상 등록 버튼)
- `src/app/seminars/[id]/page.tsx` — 상세 + 참석 신청/취소 토글
- `src/app/seminars/create/page.tsx` — 등록 (AuthGuard staff 이상)

## Phase 4: 관리자 + 마무리

### 4.1 관리자 페이지 (`src/app/admin/page.tsx`)
- allowedRoles: staff, president, admin
- 회원 승인: president 이상만 표시

### 4.2 마이페이지 (`src/app/mypage/page.tsx`)
- ROLE_LABELS 사용하여 역할 표시

### 4.3 로그인 폼 (`src/features/auth/LoginForm.tsx`)
- 전체 데모 계정 안내 표시

### 4.4 게시글 상세 (`src/app/board/[id]/page.tsx`)
- isAdmin: staff 이상으로 확장

## 파일 목록

### 수정 파일 (10개)
1. src/types/index.ts
2. src/features/auth/AuthGuard.tsx
3. src/features/auth/useAuth.ts
4. src/features/auth/LoginForm.tsx
5. src/components/layout/Header.tsx
6. src/features/board/board-data.ts
7. src/features/board/CategoryTabs.tsx
8. src/features/board/PostForm.tsx
9. src/features/board/PostList.tsx
10. src/app/page.tsx

### 신규 파일 (15개)
1. src/lib/permissions.ts
2. docs/ROLE_PERMISSIONS.md
3. src/components/home/NoticePreview.tsx
4. src/components/home/PromotionPreview.tsx
5. src/components/home/NewsletterPreview.tsx
6. src/components/home/SeminarPreview.tsx
7. src/features/seminar/seminar-data.ts
8. src/features/seminar/seminar-store.ts
9. src/features/seminar/useSeminar.ts
10. src/features/seminar/SeminarStatusTabs.tsx
11. src/features/seminar/SeminarList.tsx
12. src/features/seminar/SeminarForm.tsx
13. src/app/seminars/layout.tsx
14. src/app/seminars/page.tsx
15. src/app/seminars/[id]/page.tsx
16. src/app/seminars/create/page.tsx
17. src/app/admin/page.tsx
18. src/app/mypage/page.tsx
