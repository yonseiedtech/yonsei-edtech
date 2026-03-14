# Plan: 게시글 수정/삭제 CRUD 완성 (post-crud)

## 1. 개요

현재 게시글 작성(Create)과 조회(Read)만 구현된 상태에서
수정(Update)과 삭제(Delete)를 추가하여 CRUD를 완성한다.

## 2. 목표

- 본인 작성 게시글 수정 기능
- 본인 작성 게시글 삭제 기능 (확인 다이얼로그)
- 관리자(staff+) 게시글 수정/삭제 권한
- 댓글 삭제 기능 (본인 + 관리자)

## 3. 사용자 스토리

| 역할 | 스토리 | 우선순위 |
|------|--------|----------|
| 작성자 | 내가 쓴 게시글의 제목과 내용을 수정할 수 있다 | P0 |
| 작성자 | 내가 쓴 게시글을 삭제할 수 있다 (확인 필요) | P0 |
| 작성자 | 내가 쓴 댓글을 삭제할 수 있다 | P1 |
| 관리자(staff+) | 다른 사람의 게시글을 수정/삭제할 수 있다 | P1 |
| 관리자(staff+) | 다른 사람의 댓글을 삭제할 수 있다 | P2 |

## 4. 기능 범위

### In Scope
- **게시글 수정 페이지**: `/board/[id]/edit` 라우트
- **게시글 삭제**: 상세 페이지에서 삭제 버튼 + 확인 Dialog
- **댓글 삭제**: 댓글 항목에 삭제 버튼
- **권한 검증**: 본인 또는 staff+ 확인
- **React Query 훅**: useUpdatePost, useDeletePost, useDeleteComment

### Out of Scope
- 게시글 수정 이력 추적
- 댓글 수정 기능
- 소프트 삭제 (soft delete)
- 게시글 이미지/파일 첨부

## 5. 기술 설계 개요

### 5.1 새 라우트

```
/board/[id]/edit — 게시글 수정 페이지
  - AuthGuard (로그인 필수)
  - 기존 PostForm 재사용 (initialData prop 추가)
  - 본인 또는 staff+ 권한 확인
```

### 5.2 수정 대상 파일

| 파일 | 변경 |
|------|------|
| `src/features/board/useBoard.ts` | useUpdatePost, useDeletePost, useDeleteComment 훅 추가 |
| `src/features/board/PostForm.tsx` | mode="edit" 지원, initialData prop |
| `src/app/board/[id]/page.tsx` | 수정/삭제 버튼 추가 (권한 조건부) |
| `src/app/board/[id]/edit/page.tsx` | 새 파일 — 수정 페이지 |
| `src/features/board/CommentSection.tsx` | 댓글 삭제 버튼 추가 |

### 5.3 권한 로직

```typescript
// 수정/삭제 권한
const canEdit = user?.id === post.authorId || isStaffOrAbove(user);
const canDeleteComment = user?.id === comment.authorId || isStaffOrAbove(user);
```

### 5.4 삭제 UX

```
1. 삭제 버튼 클릭
2. AlertDialog: "정말 삭제하시겠습니까?"
3. 확인 → API 호출 (또는 Mock store 업데이트)
4. 성공 → toast + 목록으로 리다이렉트
```

## 6. 의존성

- 기존 PostForm 컴포넌트
- 기존 useBoard 훅 패턴
- AlertDialog UI 컴포넌트 (shadcn/ui)

## 7. 예상 작업량

- **S (Small)** — 1~2세션
- PostForm 수정 모드: 0.5세션
- 삭제 로직 + UI: 0.5세션
- 댓글 삭제: 0.5세션
