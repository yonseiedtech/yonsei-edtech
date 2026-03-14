# Design: 게시글 수정/삭제 CRUD 완성 (post-crud)

## 1. 구현 순서

```
1. useBoard.ts에 useUpdatePost, useDeletePost, useDeleteComment 훅 추가
2. PostForm.tsx에 수정 모드 (initialData + mode prop) 지원
3. /board/[id]/edit/page.tsx 수정 페이지 생성
4. /board/[id]/page.tsx 수정/삭제 버튼에 동작 연결
5. CommentList의 삭제 기능 연결
```

## 2. 파일별 상세 설계

### 2.1 `src/features/board/useBoard.ts` — 훅 추가

```typescript
// ── Update Post ──
export function useUpdatePost() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Post> }) => {
      try {
        return await postsApi.update(id, {
          title: data.title,
          content: data.content,
          category: data.category,
        });
      } catch {
        // Mock fallback: 로컬 캐시 직접 수정
        queryClient.setQueryData<Post[]>(["posts", "all"], (old) =>
          (old ?? MOCK_POSTS).map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          )
        );
        return { id, ...data };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return { updatePost: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Delete Post ──
export function useDeletePost() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await postsApi.delete(id);
      } catch {
        // Mock fallback: 로컬 캐시에서 제거
        queryClient.setQueryData<Post[]>(["posts", "all"], (old) =>
          (old ?? MOCK_POSTS).filter((p) => p.id !== id)
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return { deletePost: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Delete Comment ──
export function useDeleteComment() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      try {
        return await commentsApi.delete(commentId);
      } catch {
        queryClient.setQueryData<Comment[]>(["comments", postId], (old) =>
          (old ?? []).filter((c) => c.id !== commentId)
        );
      }
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  return { deleteComment: mutation.mutateAsync, isLoading: mutation.isPending };
}
```

### 2.2 `src/features/board/PostForm.tsx` — 수정 모드 지원

**변경 사항:**

```typescript
// Props 확장
interface PostFormProps {
  mode?: "create" | "edit";
  initialData?: Post;           // 수정 시 기존 데이터
  onSubmitSuccess?: () => void;  // 수정 완료 시 콜백
}

export default function PostForm({ mode = "create", initialData, onSubmitSuccess }: PostFormProps) {
  // mode에 따라 다른 훅 사용
  const { createPost } = useCreatePost();
  const { updatePost } = useUpdatePost();

  // 초기값 설정
  const [category, setCategory] = useState<PostCategory>(initialData?.category ?? "free");
  const { register, handleSubmit, ... } = useForm<PostData>({
    defaultValues: initialData ? { title: initialData.title, content: initialData.content } : undefined,
  });

  async function onSubmit(data: PostData) {
    if (mode === "edit" && initialData) {
      await updatePost({ id: initialData.id, data: { ...data, category } });
      toast.success("게시글이 수정되었습니다.");
      onSubmitSuccess?.() ?? router.push(`/board/${initialData.id}`);
    } else {
      await createPost({ ...data, category });
      toast.success("게시글이 등록되었습니다.");
      router.push("/board");
    }
  }

  // 제목, 버튼 텍스트 변경
  // mode === "edit" ? "수정하기" : "등록"
}
```

### 2.3 `src/app/board/[id]/edit/page.tsx` — 수정 페이지 (신규)

```typescript
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import PostForm from "@/features/board/PostForm";
import { usePost } from "@/features/board/useBoard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { toast } from "sonner";

function EditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const { post, isLoading } = usePost(id);

  // 권한 검증: 본인 또는 staff+
  if (!isLoading && post) {
    const canEdit = user?.id === post.authorId || isStaffOrAbove(user);
    if (!canEdit) {
      toast.error("수정 권한이 없습니다.");
      router.push(`/board/${id}`);
      return null;
    }
  }

  if (isLoading || !post) return <Loading />;

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <PostForm
          mode="edit"
          initialData={post}
          onSubmitSuccess={() => router.push(`/board/${id}`)}
        />
      </div>
    </div>
  );
}

export default function EditPage({ params }) {
  return (
    <AuthGuard>
      <EditContent params={params} />
    </AuthGuard>
  );
}
```

### 2.4 `src/app/board/[id]/page.tsx` — 수정/삭제 동작 연결

**변경 사항:**

```typescript
// import 추가
import { useDeletePost } from "@/features/board/useBoard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, ... } from "@/components/ui/alert-dialog";

// 삭제 핸들러
const { deletePost } = useDeletePost();
const [showDeleteDialog, setShowDeleteDialog] = useState(false);

async function handleDelete() {
  await deletePost(post.id);
  toast.success("게시글이 삭제되었습니다.");
  router.push("/board");
}

// 수정 버튼: onClick → router.push(`/board/${id}/edit`)
// 삭제 버튼: onClick → setShowDeleteDialog(true)

// AlertDialog 추가
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
      <AlertDialogDescription>
        정말 이 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 2.5 댓글 삭제 — `board/[id]/page.tsx` 내 handleDeleteComment 수정

```typescript
const { deleteComment } = useDeleteComment();

async function handleDeleteComment(commentId: string) {
  await deleteComment({ commentId, postId: id });
  toast.success("댓글이 삭제되었습니다.");
}
```

## 3. UI 컴포넌트 의존성

| 컴포넌트 | 패키지 | 상태 |
|----------|--------|------|
| AlertDialog | @radix-ui/react-alert-dialog | shadcn/ui로 추가 필요 |
| 기타 (Button, Input 등) | 이미 설치됨 | ✅ |

```bash
npx shadcn@latest add alert-dialog
```

## 4. 권한 매트릭스

| 동작 | 본인(authorId) | staff+ | 기타 |
|------|:-------------:|:------:|:----:|
| 글 수정 | ✅ | ✅ | ❌ |
| 글 삭제 | ✅ | ✅ | ❌ |
| 댓글 삭제 | ✅ | ✅ | ❌ |

## 5. 구현 체크리스트

- [ ] `useUpdatePost` 훅
- [ ] `useDeletePost` 훅
- [ ] `useDeleteComment` 훅
- [ ] PostForm `mode="edit"` + `initialData` prop
- [ ] `/board/[id]/edit/page.tsx` 수정 페이지
- [ ] `/board/[id]/page.tsx` 수정 버튼 → edit 라우트 연결
- [ ] `/board/[id]/page.tsx` 삭제 버튼 → AlertDialog + deletePost
- [ ] 댓글 삭제 연결 (useDeleteComment)
- [ ] AlertDialog 컴포넌트 추가 (`npx shadcn add alert-dialog`)
