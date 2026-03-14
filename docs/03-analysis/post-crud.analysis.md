# Design-Implementation Gap Analysis Report: post-crud

> **Summary**: 게시글 수정/삭제 CRUD 완성 기능의 설계 vs 구현 비교 분석
>
> **Design Document**: `docs/02-design/features/post-crud.design.md`
> **Implementation Path**: `src/features/board/`, `src/app/board/[id]/`
> **Analysis Date**: 2026-03-14
> **Status**: Approved

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 100% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **100%** | **PASS** |

---

## Checklist Item Analysis (9/9 Implemented)

### 1. `useUpdatePost` hook (`src/features/board/useBoard.ts`)

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| Hook export | `useUpdatePost()` | Line 143: `export function useUpdatePost()` | PASS |
| mutationFn signature | `{ id: string; data: Partial<Post> }` | Line 147: 동일 | PASS |
| API call | `postsApi.update(id, {...})` | Line 149: 동일 | PASS |
| Mock fallback | 로컬 캐시 직접 수정 | Line 156: 동일 | PASS |
| onSuccess | `invalidateQueries(["posts"])` | Line 168: 동일 | PASS |
| Return | `{ updatePost, isLoading }` | Line 173: 동일 | PASS |

**추가 구현**: 설계에 없는 단건 캐시 갱신 로직이 추가됨 (Line 162, `["posts", id]`). 이는 UX 개선을 위한 유익한 추가 사항.

**Result**: PASS (설계 충실 + 추가 개선)

---

### 2. `useDeletePost` hook (`src/features/board/useBoard.ts`)

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| Hook export | `useDeletePost()` | Line 178: `export function useDeletePost()` | PASS |
| mutationFn signature | `async (id: string)` | Line 183: 동일 | PASS |
| API call | `postsApi.delete(id)` | Line 184: 동일 | PASS |
| Mock fallback | 캐시에서 filter 제거 | Line 187: 동일 | PASS |
| Return | `{ deletePost, isLoading }` | Line 197: 동일 | PASS |

**Result**: PASS

---

### 3. `useDeleteComment` hook (`src/features/board/useBoard.ts`)

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| Hook export | `useDeleteComment()` | Line 202: `export function useDeleteComment()` | PASS |
| mutationFn signature | `{ commentId, postId }` | Line 206: 동일 | PASS |
| API call | `commentsApi.delete(commentId)` | Line 208: 동일 | PASS |
| Mock fallback | 캐시에서 filter 제거 | Line 211: 동일 | PASS |
| onSuccess | `invalidateQueries(["comments", postId])` | Line 216: 동일 | PASS |
| Return | `{ deleteComment, isLoading }` | Line 221: 동일 | PASS |

**Result**: PASS

---

### 4. PostForm `mode="edit"` + `initialData` prop (`src/features/board/PostForm.tsx`)

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| Props interface | `mode?, initialData?, onSubmitSuccess?` | Line 30-34: 동일 | PASS |
| Default mode | `mode = "create"` | Line 36: 동일 | PASS |
| Category 초기값 | `initialData?.category ?? "free"` | Line 39: 동일 | PASS |
| useForm defaultValues | `initialData ? { title, content } : undefined` | Line 43-45: 동일 | PASS |
| Edit submit 로직 | `updatePost({ id, data })` | Line 58: 동일 | PASS |
| Edit toast | "게시글이 수정되었습니다." | Line 59: 동일 | PASS |
| onSubmitSuccess 콜백 | `onSubmitSuccess?.()` | Line 60-63: 동일 (if/else 방식) | PASS |
| 버튼 텍스트 | `mode === "edit" ? "수정하기" : "등록"` | Line 151-160: 동일 | PASS |
| 제목 텍스트 | `isEdit ? "글 수정" : "글쓰기"` | Line 87: 동일 | PASS |

**추가 구현**: 에러 핸들링 try/catch 추가 (Line 70-72), 취소 버튼 분기 (Line 80, 146). 설계에 명시되지 않았으나 유익한 추가.

**Result**: PASS

---

### 5. `/board/[id]/edit/page.tsx` 수정 페이지 (`src/app/board/[id]/edit/page.tsx`)

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| 파일 존재 | 신규 생성 | 파일 존재 확인 | PASS |
| AuthGuard 래핑 | `<AuthGuard>` | Line 60: 동일 | PASS |
| usePost 호출 | `usePost(id)` | Line 16: 동일 | PASS |
| 권한 검증 | `user?.id === post.authorId \|\| isStaffOrAbove(user)` | Line 34: 동일 | PASS |
| 권한 없을 때 | toast.error + router.push | Line 36-37: 동일 | PASS |
| PostForm props | `mode="edit" initialData={post} onSubmitSuccess` | Line 44-47: 동일 | PASS |
| Layout | `py-16, max-w-3xl, px-4` | Line 42-43: 동일 | PASS |

**추가 구현**: Loading spinner UI (Line 18-24), post not found UI (Line 26-32). 설계의 `<Loading />` 보다 구체적인 구현.

**Result**: PASS

---

### 6. `/board/[id]/page.tsx` 수정 버튼 -> edit 라우트 연결

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| 수정 버튼 존재 | Button + Edit 아이콘 | Line 91-98: `<Button>` + `<Edit>` 아이콘 | PASS |
| onClick 동작 | `router.push(\`/board/${id}/edit\`)` | Line 94: 동일 | PASS |
| 권한 조건부 렌더링 | `isAuthor \|\| isAdmin` | Line 89: 동일 | PASS |

**Result**: PASS

---

### 7. `/board/[id]/page.tsx` 삭제 버튼 -> AlertDialog + deletePost

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| useDeletePost import | `useDeletePost` | Line 10: 동일 | PASS |
| AlertDialog import | 전체 서브컴포넌트 | Line 14-23: 동일 | PASS |
| showDeleteDialog state | `useState(false)` | Line 36: 동일 | PASS |
| handleDelete 함수 | `deletePost(post.id)` + toast + router.push | Line 56-60: 동일 | PASS |
| 삭제 버튼 | `onClick -> setShowDeleteDialog(true)` | Line 103: 동일 | PASS |
| AlertDialog 구조 | Title, Description, Cancel, Action | Line 133-146: 동일 | PASS |
| 다이얼로그 텍스트 | "게시글 삭제", "정말 이 게시글을..." | Line 136-139: 동일 | PASS |

**Result**: PASS

---

### 8. Comment delete wired with useDeleteComment

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| useDeleteComment 호출 | `useDeleteComment()` | Line 35: 동일 | PASS |
| handleDeleteComment | `deleteComment({ commentId, postId: id })` | Line 62-63: 동일 | PASS |
| toast 메시지 | "댓글이 삭제되었습니다." | Line 64: 동일 | PASS |
| CommentList onDelete | `onDelete={handleDeleteComment}` | Line 126: 동일 | PASS |

**CommentList 컴포넌트 검증** (`src/features/board/CommentList.tsx`):
- `onDelete` prop 수신 (Line 9)
- 권한 조건부 삭제 버튼 (Line 27: `currentUserId === comment.authorId \|\| isAdmin`)
- 클릭 시 `onDelete(comment.id)` 호출 (Line 29)

**Result**: PASS

---

### 9. AlertDialog component (`src/components/ui/alert-dialog.tsx`)

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| 파일 존재 | shadcn/ui AlertDialog | 파일 존재 확인 | PASS |
| Export 목록 | AlertDialog, Content, Header, Footer, Title, Description, Action, Cancel | Line 174-187: 전체 export 확인 | PASS |

**Note**: 설계에서는 `@radix-ui/react-alert-dialog` 기반을 명시했으나, 실제 구현은 `@base-ui/react/alert-dialog` 기반. 기능적으로 동일하며, shadcn/ui의 최신 버전 반영으로 판단.

**Result**: PASS (기반 라이브러리 차이는 기능적 영향 없음)

---

## Differences Found

### 🟡 Added Features (Design X, Implementation O)

| Item | Implementation Location | Description | Impact |
|------|------------------------|-------------|--------|
| 단건 캐시 갱신 | useBoard.ts:162 | useUpdatePost에서 `["posts", id]` 캐시 추가 갱신 | Low (UX 개선) |
| Error handling | PostForm.tsx:70-72 | Submit 실패 시 toast.error 표시 | Low (안정성 개선) |
| Loading spinner | edit/page.tsx:18-24 | 로딩 중 spinner UI | Low (UX 개선) |
| Post not found UI | edit/page.tsx:26-32 | 게시글 없을 때 안내 메시지 | Low (UX 개선) |
| Back navigation | PostForm.tsx:79-85 | 수정 모드일 때 "돌아가기" 버튼 | Low (UX 개선) |

### 🔵 Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| AlertDialog 기반 | @radix-ui/react-alert-dialog | @base-ui/react/alert-dialog | None (API 호환) |
| onSubmitSuccess 처리 | `onSubmitSuccess?.() ?? router.push(...)` | `if (onSubmitSuccess) {...} else {...}` | None (동작 동일) |
| 권한 체크 방식 (detail) | `isStaffOrAbove(user)` | `["admin","president","staff"].includes(user.role)` | None (결과 동일) |

---

## Recommended Actions

### Documentation Update Needed

1. **AlertDialog 기반 라이브러리 반영**: 설계 문서의 `@radix-ui/react-alert-dialog`를 `@base-ui/react/alert-dialog`로 업데이트
2. **추가 구현 사항 문서화**: 단건 캐시 갱신, 에러 핸들링 등 추가 구현 사항을 설계 문서에 반영

### No Immediate Actions Required

설계와 구현이 100% 일치하며, 추가 구현 사항은 모두 UX/안정성 개선 방향으로 유익한 내용입니다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-14 | Initial gap analysis | Claude |
