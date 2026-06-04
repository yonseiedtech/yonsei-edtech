# 소통 보드 (Q&A Communication Board) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스터디 회차·세미나에 질문↔답변으로 소통하는 보드를 생성·수정·삭제하고, 좋아요·채택·정렬과 Zoom용 전체화면 발표 보기를 제공한다.

**Architecture:** 4개 Firestore 컬렉션(`comm_boards`/`comm_questions`/`comm_answers`/`comm_likes`)을 `@/lib/bkend`의 `dataApi` 패턴으로 노출. 보안은 firestore.rules로 강제(보드 read 공개, 질문/답변은 `allowGuest`+`status` 게이트). UI는 `src/features/comm-board/` 공용 컴포넌트로 회차·세미나에 임베드하고, 공개 라우트 `/boards/[id]`와 발표 보기 `/boards/[id]/present`를 추가.

**Tech Stack:** Next.js 16(App Router, client components), Firestore(client SDK), @tanstack/react-query, qrcode.react, sonner(toast), Tailwind, vitest.

**참고 설계 문서:** `docs/superpowers/specs/2026-06-04-comm-board-design.md`

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/types/comm-board.ts` (생성) | CommBoard/Question/Answer/Like 타입 + 라벨 맵 |
| `src/types/index.ts` (수정) | comm-board 재노출 |
| `src/features/comm-board/comm-helpers.ts` (생성) | 정렬·권한·likeId 순수 헬퍼 |
| `src/features/comm-board/__tests__/comm-helpers.test.ts` (생성) | 헬퍼 단위 테스트 |
| `src/lib/bkend.ts` (수정) | commBoards/Questions/Answers/Likes API |
| `firestore.rules` (수정) | 4개 컬렉션 보안 규칙 |
| `src/features/comm-board/CommBoardDialog.tsx` (생성) | 보드 생성/수정 다이얼로그 |
| `src/features/comm-board/CommBoardSection.tsx` (생성) | 회차·세미나 임베드(목록+생성) |
| `src/features/comm-board/QuestionComposer.tsx` (생성) | 질문 작성기 |
| `src/features/comm-board/AnswerThread.tsx` (생성) | 답변 목록+작성기 |
| `src/features/comm-board/QuestionItem.tsx` (생성) | 질문 카드(좋아요·채택·삭제) |
| `src/features/comm-board/CommBoardDetail.tsx` (생성) | 보드 본체(질문 목록) |
| `src/features/comm-board/CommBoardPresent.tsx` (생성) | 전체화면 발표 보기 |
| `src/features/activities/ActivityWeekDetailPage.tsx` (수정) | 회차에 Section 임베드 |
| `src/app/seminars/[id]/page.tsx` (수정) | 세미나에 Section 임베드 |
| `src/app/boards/[boardId]/page.tsx` (생성) | 공개 보드 상세 라우트 |
| `src/app/boards/[boardId]/present/page.tsx` (생성) | 발표 보기 라우트 |

---

## Task 1: 타입 정의

**Files:**
- Create: `src/types/comm-board.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: 타입 파일 작성**

`src/types/comm-board.ts`:

```ts
// 소통 보드(Q&A) 타입 — 스터디 회차·세미나 공용
export type CommContextType = "study" | "project" | "external" | "seminar";
export type CommBoardStatus = "open" | "closed";
export type CommSortMode = "recent" | "popular";
export type CommLikeTarget = "question" | "answer";

export interface CommBoard {
  id: string;
  contextType: CommContextType;
  contextId: string;
  /** 회차 기반 활동의 특정 회차 progress id (세미나는 없음) */
  activityProgressId?: string;
  week?: number;
  title: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  /** 비로그인 질문/답변 허용 */
  allowGuest: boolean;
  /** 익명 옵션 노출 */
  allowAnonymous: boolean;
  status: CommBoardStatus;
  defaultSort: CommSortMode;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommQuestion {
  id: string;
  boardId: string;
  contextId: string;
  authorId?: string;
  authorName?: string;
  guestName?: string;
  anonymous: boolean;
  body: string;
  resolved: boolean;
  /** 채택된 답변 id (UI 에서 답변의 채택 여부를 이 값으로 판단) */
  resolvedAnswerId?: string;
  likeCount: number;
  answerCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommAnswer {
  id: string;
  questionId: string;
  boardId: string;
  authorId?: string;
  authorName?: string;
  guestName?: string;
  anonymous: boolean;
  body: string;
  likeCount: number;
  createdAt?: string;
}

export interface CommLike {
  id: string;
  userId: string;
  targetType: CommLikeTarget;
  targetId: string;
  createdAt?: string;
}

export const COMM_SORT_LABELS: Record<CommSortMode, string> = {
  recent: "최신순",
  popular: "인기순",
};
```

- [ ] **Step 2: index 재노출 추가**

`src/types/index.ts`에 기존 `export * from "./operations";` 아래 줄 추가:

```ts
export * from "./comm-board";
```

- [ ] **Step 3: 타입체크 통과 확인**

Run: `cd /c/work/yonsei-edtech && npx tsc --noEmit 2>&1 | grep comm-board || echo "no comm-board type errors"`
Expected: `no comm-board type errors`

- [ ] **Step 4: 커밋**

```bash
cd /c/work/yonsei-edtech && git add src/types/comm-board.ts src/types/index.ts && git commit -m "feat(comm-board): Q&A 보드 타입 정의"
```

---

## Task 2: 순수 헬퍼 + 단위 테스트 (TDD)

**Files:**
- Create: `src/features/comm-board/comm-helpers.ts`
- Test: `src/features/comm-board/__tests__/comm-helpers.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/comm-board/__tests__/comm-helpers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  sortQuestions,
  makeLikeId,
  canManageBoard,
  canDeletePost,
} from "@/features/comm-board/comm-helpers";
import type { CommQuestion, CommBoard, User } from "@/types";

function q(p: Partial<CommQuestion>): CommQuestion {
  return {
    id: "q", boardId: "b", contextId: "c", anonymous: false, body: "x",
    resolved: false, likeCount: 0, answerCount: 0, createdAt: "2026-01-01T00:00:00Z",
    ...p,
  };
}
function mkUser(p: Partial<User>): User {
  return { id: "u1", name: "홍길동", role: "member" } as User;
}
const board = { ownerId: "owner1" } as Pick<CommBoard, "ownerId">;

describe("sortQuestions", () => {
  it("최신순: createdAt desc", () => {
    const list = [
      q({ id: "a", createdAt: "2026-01-01T00:00:00Z" }),
      q({ id: "b", createdAt: "2026-02-01T00:00:00Z" }),
    ];
    expect(sortQuestions(list, "recent").map((x) => x.id)).toEqual(["b", "a"]);
  });
  it("인기순: likeCount desc → answerCount → createdAt", () => {
    const list = [
      q({ id: "a", likeCount: 1, answerCount: 5 }),
      q({ id: "b", likeCount: 3, answerCount: 0 }),
      q({ id: "c", likeCount: 1, answerCount: 9 }),
    ];
    expect(sortQuestions(list, "popular").map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
  it("원본 배열을 변형하지 않는다", () => {
    const list = [q({ id: "a" }), q({ id: "b", createdAt: "2026-03-01T00:00:00Z" })];
    const before = list.map((x) => x.id);
    sortQuestions(list, "recent");
    expect(list.map((x) => x.id)).toEqual(before);
  });
});

describe("makeLikeId", () => {
  it("deterministic id 조합", () => {
    expect(makeLikeId("u1", "question", "q9")).toBe("u1__question__q9");
  });
});

describe("canManageBoard", () => {
  it("비로그인은 false", () => {
    expect(canManageBoard(null, board)).toBe(false);
  });
  it("소유자는 true", () => {
    expect(canManageBoard(mkUser({ id: "owner1" }) , { ...board, ownerId: "owner1" })).toBe(true);
  });
  it("운영진(staff)은 true", () => {
    expect(canManageBoard({ id: "x", name: "s", role: "staff" } as User, board)).toBe(true);
  });
  it("일반 회원(비소유)은 false", () => {
    expect(canManageBoard({ id: "x", name: "m", role: "member" } as User, board)).toBe(false);
  });
});

describe("canDeletePost", () => {
  it("작성자 본인은 true", () => {
    expect(canDeletePost({ id: "x", name: "m", role: "member" } as User, { authorId: "x" }, board)).toBe(true);
  });
  it("보드 소유자는 남의 글도 true", () => {
    expect(canDeletePost({ id: "owner1", name: "o", role: "member" } as User, { authorId: "z" }, board)).toBe(true);
  });
  it("게스트 글(authorId 없음)을 일반 회원은 삭제 불가", () => {
    expect(canDeletePost({ id: "x", name: "m", role: "member" } as User, {}, board)).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /c/work/yonsei-edtech && npx vitest run src/features/comm-board/__tests__/comm-helpers.test.ts`
Expected: FAIL — `Failed to resolve import "@/features/comm-board/comm-helpers"`

- [ ] **Step 3: 헬퍼 구현**

`src/features/comm-board/comm-helpers.ts`:

```ts
import type { CommQuestion, CommSortMode, CommBoard, CommLikeTarget, User } from "@/types";
import { isStaffOrAbove } from "@/lib/permissions";

/** 질문 정렬 — 원본 불변. 최신: createdAt desc / 인기: like→answer→createdAt desc */
export function sortQuestions(list: CommQuestion[], mode: CommSortMode): CommQuestion[] {
  const copy = [...list];
  if (mode === "popular") {
    copy.sort(
      (a, b) =>
        b.likeCount - a.likeCount ||
        b.answerCount - a.answerCount ||
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  } else {
    copy.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }
  return copy;
}

/** 좋아요 deterministic doc id */
export function makeLikeId(userId: string, targetType: CommLikeTarget, targetId: string): string {
  return `${userId}__${targetType}__${targetId}`;
}

/** 보드 수정/삭제/닫기 권한: 소유자 또는 운영진(staff+) */
export function canManageBoard(user: User | null, board: Pick<CommBoard, "ownerId">): boolean {
  if (!user) return false;
  return user.id === board.ownerId || isStaffOrAbove(user);
}

/** 질문/답변 삭제 권한: 작성자 본인(로그인) 또는 보드 소유자 또는 운영진 */
export function canDeletePost(
  user: User | null,
  post: { authorId?: string },
  board: Pick<CommBoard, "ownerId">,
): boolean {
  if (!user) return false;
  if (post.authorId && post.authorId === user.id) return true;
  return user.id === board.ownerId || isStaffOrAbove(user);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /c/work/yonsei-edtech && npx vitest run src/features/comm-board/__tests__/comm-helpers.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: 커밋**

```bash
cd /c/work/yonsei-edtech && git add src/features/comm-board/comm-helpers.ts src/features/comm-board/__tests__/comm-helpers.test.ts && git commit -m "feat(comm-board): 정렬·권한 헬퍼 + 단위 테스트"
```

---

## Task 3: API 계층 (bkend.ts)

**Files:**
- Modify: `src/lib/bkend.ts` (타입 import 추가 + 파일 끝에 API 블록 추가)

- [ ] **Step 1: 타입 import 추가**

`src/lib/bkend.ts` 상단의 `import type { ... } from "@/types";` 구문에 다음 타입을 추가한다(기존 import 목록 끝에 콤마로 이어붙임):

```ts
  CommBoard,
  CommQuestion,
  CommAnswer,
  CommLike,
  CommContextType,
  CommLikeTarget,
```

> 참고: `doc`, `updateDoc`, `getDoc`, `setDoc`, `deleteDoc`, `increment`, `serverTimestamp`, `db` 는 이미 bkend.ts에서 import/사용 중이므로 추가 import 불필요.

- [ ] **Step 2: API 블록 추가**

`src/lib/bkend.ts` **맨 끝**에 추가:

```ts
// ─────────────────────────────────────────────────────────────
// 소통 보드 (Q&A Communication Board) — 스터디 회차·세미나 공용
// 보드 read 공개, 질문/답변은 firestore.rules 에서 allowGuest+status 게이트.
// 좋아요/답변 카운트는 increment() 로 경쟁 방지(denorm).
// ─────────────────────────────────────────────────────────────
export const commBoardsApi = {
  listByContext: (contextType: CommContextType, contextId: string, activityProgressId?: string) =>
    dataApi.list<CommBoard>("comm_boards", {
      "filter[contextType]": contextType,
      "filter[contextId]": contextId,
      ...(activityProgressId ? { "filter[activityProgressId]": activityProgressId } : {}),
      limit: 100,
    }),
  get: (id: string) => dataApi.get<CommBoard>("comm_boards", id),
  create: (data: Record<string, unknown>) => dataApi.create<CommBoard>("comm_boards", data),
  update: (id: string, data: Partial<CommBoard>) =>
    dataApi.update<CommBoard>("comm_boards", id, data as unknown as Record<string, unknown>),
  delete: (id: string) => dataApi.delete("comm_boards", id),
};

export const commQuestionsApi = {
  listByBoard: (boardId: string) =>
    dataApi.list<CommQuestion>("comm_questions", { "filter[boardId]": boardId, limit: 500 }),
  create: (data: Record<string, unknown>) =>
    dataApi.create<CommQuestion>("comm_questions", {
      ...data,
      resolved: false,
      likeCount: 0,
      answerCount: 0,
    }),
  update: (id: string, data: Partial<CommQuestion>) =>
    dataApi.update<CommQuestion>("comm_questions", id, data as unknown as Record<string, unknown>),
  delete: (id: string) => dataApi.delete("comm_questions", id),
  /** 채택/해제 — 질문 문서만 갱신(답변엔 쓰지 않음, UI 가 resolvedAnswerId 로 판단) */
  setResolved: (id: string, resolved: boolean, resolvedAnswerId: string | null) =>
    dataApi.update<CommQuestion>("comm_questions", id, {
      resolved,
      resolvedAnswerId: resolvedAnswerId ?? null,
    } as unknown as Record<string, unknown>),
};

export const commAnswersApi = {
  listByBoard: (boardId: string) =>
    dataApi.list<CommAnswer>("comm_answers", { "filter[boardId]": boardId, limit: 2000 }),
  create: async (data: Record<string, unknown>): Promise<CommAnswer> => {
    const created = await dataApi.create<CommAnswer>("comm_answers", { ...data, likeCount: 0 });
    // denorm: 질문 answerCount +1 (likeCount/answerCount/updatedAt 만 바꾸므로 rules 허용)
    await updateDoc(doc(db, "comm_questions", String(data.questionId)), {
      answerCount: increment(1),
    });
    return created;
  },
  delete: async (answer: Pick<CommAnswer, "id" | "questionId">): Promise<void> => {
    await dataApi.delete("comm_answers", answer.id);
    await updateDoc(doc(db, "comm_questions", answer.questionId), {
      answerCount: increment(-1),
    });
  },
};

export const commLikesApi = {
  /** 로그인 사용자가 보드 내에서 누른 좋아요 집합("type__id") — UI liked 상태용 */
  listMineSet: async (userId: string): Promise<Set<string>> => {
    const res = await dataApi.list<CommLike>("comm_likes", {
      "filter[userId]": userId,
      limit: 2000,
    });
    return new Set(res.data.map((l) => `${l.targetType}__${l.targetId}`));
  },
  /** 토글 — 켜지면 true 반환. 대상 likeCount increment. (로그인 전용) */
  toggle: async (
    userId: string,
    targetType: CommLikeTarget,
    targetId: string,
  ): Promise<boolean> => {
    const id = `${userId}__${targetType}__${targetId}`;
    const ref = doc(db, "comm_likes", id);
    const snap = await getDoc(ref);
    const targetCol = targetType === "question" ? "comm_questions" : "comm_answers";
    if (snap.exists()) {
      await deleteDoc(ref);
      await updateDoc(doc(db, targetCol, targetId), { likeCount: increment(-1) });
      return false;
    }
    await setDoc(ref, { userId, targetType, targetId, createdAt: serverTimestamp() });
    await updateDoc(doc(db, targetCol, targetId), { likeCount: increment(1) });
    return true;
  },
};
```

- [ ] **Step 3: 타입체크**

Run: `cd /c/work/yonsei-edtech && npx tsc --noEmit 2>&1 | grep -E "bkend|comm_" || echo "ok"`
Expected: `ok`

- [ ] **Step 4: 커밋**

```bash
cd /c/work/yonsei-edtech && git add src/lib/bkend.ts && git commit -m "feat(comm-board): boards/questions/answers/likes API"
```

---

## Task 4: firestore.rules

**Files:**
- Modify: `firestore.rules` (다른 `match` 블록들과 같은 들여쓰기 레벨, `service`/`match /databases` 내부)

- [ ] **Step 1: 규칙 블록 추가**

`firestore.rules`에서 `match /user_feedback/{docId} { ... }` 블록 **바로 아래**에 추가
(찾기: `grep -n "match /user_feedback" firestore.rules`):

```
    // ─── 소통 보드 (Q&A Communication Board) ───
    // board read 공개. 질문/답변 create 는 board.allowGuest + status==open 게이트.
    // 카운트(likeCount/answerCount) 갱신은 인증 사용자 누구나(해당 필드만) 허용.
    function commBoardData(boardId) {
      return get(/databases/$(database)/documents/comm_boards/$(boardId)).data;
    }
    function commBoardWritable(boardId) {
      return exists(/databases/$(database)/documents/comm_boards/$(boardId))
        && commBoardData(boardId).status == 'open'
        && (commBoardData(boardId).allowGuest == true || isAuthenticated());
    }
    match /comm_boards/{boardId} {
      allow read, list: if true;
      allow create: if isAuthenticated()
        && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isAuthenticated()
        && (resource.data.ownerId == request.auth.uid || isStaffOrAbove());
    }
    match /comm_questions/{qId} {
      allow read, list: if true;
      allow create: if commBoardWritable(request.resource.data.boardId)
        && (!('authorId' in request.resource.data)
            || request.resource.data.authorId == request.auth.uid);
      allow update: if isAuthenticated() && (
        resource.data.authorId == request.auth.uid
        || commBoardData(resource.data.boardId).ownerId == request.auth.uid
        || isStaffOrAbove()
        || request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['likeCount', 'answerCount', 'updatedAt'])
      );
      allow delete: if isAuthenticated() && (
        resource.data.authorId == request.auth.uid
        || commBoardData(resource.data.boardId).ownerId == request.auth.uid
        || isStaffOrAbove()
      );
    }
    match /comm_answers/{aId} {
      allow read, list: if true;
      allow create: if commBoardWritable(request.resource.data.boardId)
        && (!('authorId' in request.resource.data)
            || request.resource.data.authorId == request.auth.uid);
      allow update: if isAuthenticated() && (
        resource.data.authorId == request.auth.uid
        || commBoardData(resource.data.boardId).ownerId == request.auth.uid
        || isStaffOrAbove()
        || request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['likeCount', 'updatedAt'])
      );
      allow delete: if isAuthenticated() && (
        resource.data.authorId == request.auth.uid
        || commBoardData(resource.data.boardId).ownerId == request.auth.uid
        || isStaffOrAbove()
      );
    }
    match /comm_likes/{likeId} {
      allow read, list: if true;
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated()
        && resource.data.userId == request.auth.uid;
    }
```

- [ ] **Step 2: 규칙 문법 검증(빌드 영향 없음 — 컴파일만)**

Run: `cd /c/work/yonsei-edtech && npx firebase deploy --only firestore:rules --dry-run 2>&1 | tail -5 || echo "firebase CLI 미설치 시 배포 단계에서 검증"`
Expected: 규칙 컴파일 성공 또는 CLI 미설치 안내. (실제 배포는 Task 12 배포 단계)

- [ ] **Step 3: 커밋**

```bash
cd /c/work/yonsei-edtech && git add firestore.rules && git commit -m "feat(comm-board): firestore 보안 규칙 4개 컬렉션"
```

---

## Task 5: 보드 생성/수정 다이얼로그

**Files:**
- Create: `src/features/comm-board/CommBoardDialog.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/features/comm-board/CommBoardDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { commBoardsApi } from "@/lib/bkend";
import type { CommBoard, CommContextType } from "@/types";
import { Button } from "@/components/ui/button";

interface Props {
  contextType: CommContextType;
  contextId: string;
  activityProgressId?: string;
  week?: number;
  ownerId: string;
  ownerName: string;
  /** 수정 모드일 때 기존 보드 */
  board?: CommBoard;
  onClose: () => void;
  onSaved: (board: CommBoard) => void;
}

export default function CommBoardDialog({
  contextType,
  contextId,
  activityProgressId,
  week,
  ownerId,
  ownerName,
  board,
  onClose,
  onSaved,
}: Props) {
  const editing = !!board;
  const [title, setTitle] = useState(board?.title ?? "");
  const [description, setDescription] = useState(board?.description ?? "");
  const [allowGuest, setAllowGuest] = useState(board?.allowGuest ?? false);
  const [allowAnonymous, setAllowAnonymous] = useState(board?.allowAnonymous ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("보드 제목을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      if (editing && board) {
        const updated = await commBoardsApi.update(board.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          allowGuest,
          allowAnonymous,
        });
        toast.success("보드가 수정되었습니다.");
        onSaved(updated);
      } else {
        const created = await commBoardsApi.create({
          contextType,
          contextId,
          activityProgressId,
          week,
          title: title.trim(),
          description: description.trim() || undefined,
          ownerId,
          ownerName,
          allowGuest,
          allowAnonymous,
          status: "open",
          defaultSort: "recent",
        });
        toast.success("보드가 생성되었습니다.");
        onSaved(created);
      }
      onClose();
    } catch (e) {
      console.error("[comm-board/save]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{editing ? "보드 수정" : "소통 보드 만들기"}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="보드 제목 (예: 오늘 발표 Q&A)"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="설명 (선택)"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={allowGuest} onChange={(e) => setAllowGuest(e.target.checked)} />
          비로그인(게스트) 질문/답변 허용
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={allowAnonymous} onChange={(e) => setAllowAnonymous(e.target.checked)} />
          익명 작성 옵션 노출
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Save size={13} className="mr-1" />}
            {editing ? "수정" : "생성"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `cd /c/work/yonsei-edtech && npx tsc --noEmit 2>&1 | grep CommBoardDialog || echo "ok"`
Expected: `ok`

- [ ] **Step 3: 커밋**

```bash
cd /c/work/yonsei-edtech && git add src/features/comm-board/CommBoardDialog.tsx && git commit -m "feat(comm-board): 보드 생성/수정 다이얼로그"
```

---

## Task 6: 임베드 섹션 (보드 목록 + 생성)

**Files:**
- Create: `src/features/comm-board/CommBoardSection.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/features/comm-board/CommBoardSection.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircleQuestion, Plus, Lock, ChevronRight } from "lucide-react";
import { commBoardsApi } from "@/lib/bkend";
import type { CommBoard, CommContextType, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CommBoardDialog from "./CommBoardDialog";

interface Props {
  contextType: CommContextType;
  contextId: string;
  activityProgressId?: string;
  week?: number;
  user: User | null;
}

export default function CommBoardSection({
  contextType,
  contextId,
  activityProgressId,
  week,
  user,
}: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["comm-boards", contextType, contextId, activityProgressId ?? ""];

  const { data: boards = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await commBoardsApi.listByContext(contextType, contextId, activityProgressId);
      return (res.data as CommBoard[]).sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <MessageCircleQuestion size={13} /> 소통 보드 ({boards.length})
        </h4>
        {user && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={11} /> 보드 만들기
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">불러오는 중…</p>
      ) : boards.length === 0 ? (
        <p className="rounded border border-dashed bg-muted/20 px-2 py-3 text-center text-[11px] text-muted-foreground">
          아직 소통 보드가 없습니다.{user ? " '보드 만들기'로 질문/답변 보드를 열어보세요." : ""}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {boards.map((b) => (
            <li key={b.id}>
              <Link
                href={`/boards/${b.id}`}
                className="flex items-center justify-between gap-2 rounded border px-2.5 py-2 text-xs transition hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {b.status === "closed" && <Lock size={11} className="shrink-0 text-muted-foreground" />}
                  <span className="truncate font-medium">{b.title}</span>
                  {b.allowGuest && (
                    <Badge variant="outline" className="text-[9px]">게스트</Badge>
                  )}
                </span>
                <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {dialogOpen && user && (
        <CommBoardDialog
          contextType={contextType}
          contextId={contextId}
          activityProgressId={activityProgressId}
          week={week}
          ownerId={user.id}
          ownerName={user.name}
          onClose={() => setDialogOpen(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `cd /c/work/yonsei-edtech && npx tsc --noEmit 2>&1 | grep CommBoardSection || echo "ok"`
Expected: `ok`

- [ ] **Step 3: 커밋**

```bash
cd /c/work/yonsei-edtech && git add src/features/comm-board/CommBoardSection.tsx && git commit -m "feat(comm-board): 임베드 섹션(보드 목록+생성)"
```

---

## Task 7: 회차·세미나 페이지에 섹션 임베드

**Files:**
- Modify: `src/features/activities/ActivityWeekDetailPage.tsx`
- Modify: `src/app/seminars/[id]/page.tsx`

- [ ] **Step 1: 회차 페이지 import + 컨텍스트 타입 매핑**

`src/features/activities/ActivityWeekDetailPage.tsx` 상단 import 영역에 추가:

```tsx
import CommBoardSection from "@/features/comm-board/CommBoardSection";
import type { CommContextType } from "@/types";
```

- [ ] **Step 2: StudySessionNotesCard 아래에 섹션 추가**

`ActivityWeekDetailPage.tsx`에서 `<StudySessionNotesCard ... />` 사용처(약 660행, `activityProgressId={week.id}` 가 있는 곳) **바로 다음 형제 요소**로 추가한다. 이 컴포넌트의 활동 종류 변수명은 파일 상단에서 확인할 것(아래 코드는 `activity.type` 을 컨텍스트로 매핑; 만약 변수명이 다르면 해당 변수로 교체):

```tsx
<CommBoardSection
  contextType={(activity?.type ?? "study") as CommContextType}
  contextId={activityId}
  activityProgressId={week.id}
  week={week.week}
  user={user}
/>
```

> 검증: `grep -n "activityId\|activity?.type\|activity.type\|week.week\|const { user }" src/features/activities/ActivityWeekDetailPage.tsx` 로 실제 변수명을 확인하고 위 props 를 맞춘다. `activityId`·`week`·`user` 는 이미 이 컴포넌트 스코프에 존재한다(파일 상단 `useAuthStore`, props).

- [ ] **Step 3: 세미나 페이지 import + 섹션 추가**

`src/app/seminars/[id]/page.tsx` 상단에 추가:

```tsx
import CommBoardSection from "@/features/comm-board/CommBoardSection";
```

`SeminarDetail({ id })` 컴포넌트 내부, 기존 `<ReviewsSection ... />` 사용처 **바로 아래**(같은 부모 안)에 추가. `user` 는 이 컴포넌트가 `useAuthStore()` 로 이미 보유:

```tsx
<CommBoardSection contextType="seminar" contextId={id} user={user} />
```

> 검증: `grep -n "ReviewsSection\|const { user }\|useAuthStore" src/app/seminars/[id]/page.tsx`. `user` 변수가 SeminarDetail 스코프에 없으면 상단에서 `const { user } = useAuthStore();` 를 추가한다.

- [ ] **Step 4: 빌드 확인**

Run: `cd /c/work/yonsei-edtech && npx tsc --noEmit 2>&1 | grep -E "ActivityWeekDetailPage|seminars" || echo "ok"`
Expected: `ok`

- [ ] **Step 5: 커밋**

```bash
cd /c/work/yonsei-edtech && git add src/features/activities/ActivityWeekDetailPage.tsx "src/app/seminars/[id]/page.tsx" && git commit -m "feat(comm-board): 회차·세미나 페이지에 소통 보드 섹션 임베드"
```

---

## Task 8: 질문 작성기 + 답변 스레드 컴포넌트

**Files:**
- Create: `src/features/comm-board/QuestionComposer.tsx`
- Create: `src/features/comm-board/AnswerThread.tsx`

- [ ] **Step 1: QuestionComposer 작성**

`src/features/comm-board/QuestionComposer.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { commQuestionsApi } from "@/lib/bkend";
import type { CommBoard, User } from "@/types";
import { Button } from "@/components/ui/button";

interface Props {
  board: CommBoard;
  user: User | null;
  onCreated: () => void;
}

/** 질문/답변 공용으로 쓰는 게스트 이름·익명 로직을 포함한 질문 작성기 */
export default function QuestionComposer({ board, user, onCreated }: Props) {
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [saving, setSaving] = useState(false);

  const isGuest = !user;
  const disabled = board.status === "closed" || (isGuest && !board.allowGuest);

  async function handleSubmit() {
    if (!body.trim()) {
      toast.error("질문 내용을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      await commQuestionsApi.create({
        boardId: board.id,
        contextId: board.contextId,
        authorId: user?.id,
        authorName: user && !anonymous ? user.name : undefined,
        guestName: isGuest && guestName.trim() ? guestName.trim() : undefined,
        anonymous: board.allowAnonymous ? anonymous : false,
        body: body.trim(),
      });
      setBody("");
      setAnonymous(false);
      onCreated();
      toast.success("질문이 등록되었습니다.");
    } catch (e) {
      console.error("[comm-question/create]", e);
      toast.error("등록 실패 — 권한 또는 보드 상태를 확인하세요.");
    } finally {
      setSaving(false);
    }
  }

  if (disabled) {
    return (
      <p className="rounded border border-dashed bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
        {board.status === "closed" ? "닫힌 보드입니다 (읽기 전용)." : "이 보드는 로그인 사용자만 질문할 수 있습니다."}
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
      {isGuest && (
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="이름 (선택, 비우면 익명)"
          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="질문을 입력하세요"
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="flex items-center justify-between">
        {user && board.allowAnonymous ? (
          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            익명으로 게시
          </label>
        ) : (
          <span />
        )}
        <Button size="sm" onClick={handleSubmit} disabled={saving || !body.trim()}>
          {saving ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Send size={13} className="mr-1" />}
          질문 등록
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: AnswerThread 작성**

`src/features/comm-board/AnswerThread.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Send, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { commAnswersApi, commLikesApi, commQuestionsApi } from "@/lib/bkend";
import type { CommAnswer, CommBoard, CommQuestion, User } from "@/types";
import { canDeletePost } from "./comm-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  board: CommBoard;
  question: CommQuestion;
  user: User | null;
  likedSet: Set<string>;
  /** 질문 작성자(로그인)인지 — 채택 권한 판단 */
  canAccept: boolean;
  onChanged: () => void;
}

export default function AnswerThread({
  board,
  question,
  user,
  likedSet,
  canAccept,
  onChanged,
}: Props) {
  const queryClient = useQueryClient();
  const { data: answers = [], isLoading } = useQuery({
    queryKey: ["comm-answers", question.id],
    queryFn: async () => {
      const res = await commAnswersApi.listByBoard(board.id);
      return (res.data as CommAnswer[])
        .filter((a) => a.questionId === question.id)
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    },
  });

  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [saving, setSaving] = useState(false);
  const isGuest = !user;
  const disabled = board.status === "closed" || (isGuest && !board.allowGuest);

  async function handleAdd() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await commAnswersApi.create({
        questionId: question.id,
        boardId: board.id,
        authorId: user?.id,
        authorName: user?.name,
        guestName: isGuest && guestName.trim() ? guestName.trim() : undefined,
        anonymous: false,
        body: body.trim(),
      });
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["comm-answers", question.id] });
      onChanged();
      toast.success("답변이 등록되었습니다.");
    } catch (e) {
      console.error("[comm-answer/create]", e);
      toast.error("답변 등록 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleLike(a: CommAnswer) {
    if (!user) {
      toast.error("좋아요는 로그인 후 가능합니다.");
      return;
    }
    try {
      await commLikesApi.toggle(user.id, "answer", a.id);
      await queryClient.invalidateQueries({ queryKey: ["comm-answers", question.id] });
      onChanged();
    } catch {
      toast.error("좋아요 처리 실패");
    }
  }

  async function handleAccept(a: CommAnswer) {
    try {
      const newAccepted = question.resolvedAnswerId === a.id ? null : a.id;
      await commQuestionsApi.setResolved(question.id, newAccepted !== null, newAccepted);
      onChanged();
      toast.success(newAccepted ? "답변을 채택했습니다." : "채택을 해제했습니다.");
    } catch {
      toast.error("채택 처리 실패");
    }
  }

  async function handleDelete(a: CommAnswer) {
    if (!confirm("이 답변을 삭제하시겠습니까?")) return;
    try {
      await commAnswersApi.delete({ id: a.id, questionId: a.questionId });
      await queryClient.invalidateQueries({ queryKey: ["comm-answers", question.id] });
      onChanged();
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제 실패");
    }
  }

  return (
    <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">답변 불러오는 중…</p>
      ) : (
        answers.map((a) => {
          const accepted = question.resolvedAnswerId === a.id;
          const liked = likedSet.has(`answer__${a.id}`);
          const name = a.anonymous ? "익명" : a.authorName ?? a.guestName ?? "게스트";
          return (
            <div
              key={a.id}
              className={cn(
                "rounded border px-2.5 py-1.5 text-xs",
                accepted ? "border-emerald-300 bg-emerald-50" : "bg-card",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {name}
                  {accepted && (
                    <Badge variant="outline" className="border-emerald-400 text-[9px] text-emerald-700">
                      채택됨
                    </Badge>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLike(a)}
                    className={cn(
                      "flex items-center gap-0.5 rounded px-1 text-[10px]",
                      liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ThumbsUp size={11} /> {a.likeCount}
                  </button>
                  {canAccept && (
                    <button
                      type="button"
                      onClick={() => handleAccept(a)}
                      title={accepted ? "채택 해제" : "채택"}
                      className={cn(
                        "rounded p-0.5",
                        accepted ? "text-emerald-600" : "text-muted-foreground hover:text-emerald-600",
                      )}
                    >
                      <Check size={12} />
                    </button>
                  )}
                  {canDeletePost(user, a, board) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{a.body}</p>
            </div>
          );
        })
      )}

      {!disabled && (
        <div className="space-y-1.5">
          {isGuest && (
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="이름 (선택)"
              className="w-full rounded-md border bg-background px-2 py-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          )}
          <div className="flex gap-1.5">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={1}
              placeholder="답변 작성…"
              className="flex-1 rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <Button size="sm" className="h-auto px-2" onClick={handleAdd} disabled={saving || !body.trim()}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 타입체크**

Run: `cd /c/work/yonsei-edtech && npx tsc --noEmit 2>&1 | grep -E "QuestionComposer|AnswerThread" || echo "ok"`
Expected: `ok`

- [ ] **Step 4: 커밋**

```bash
cd /c/work/yonsei-edtech && git add src/features/comm-board/QuestionComposer.tsx src/features/comm-board/AnswerThread.tsx && git commit -m "feat(comm-board): 질문 작성기 + 답변 스레드"
```

---

## Task 9: 질문 카드 + 보드 본체

**Files:**
- Create: `src/features/comm-board/QuestionItem.tsx`
- Create: `src/features/comm-board/CommBoardDetail.tsx`

- [ ] **Step 1: QuestionItem 작성**

`src/features/comm-board/QuestionItem.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronUp, MessageSquare, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { commLikesApi, commQuestionsApi } from "@/lib/bkend";
import type { CommBoard, CommQuestion, User } from "@/types";
import { canDeletePost } from "./comm-helpers";
import AnswerThread from "./AnswerThread";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  board: CommBoard;
  question: CommQuestion;
  user: User | null;
  likedSet: Set<string>;
  onChanged: () => void;
}

export default function QuestionItem({ board, question, user, likedSet, onChanged }: Props) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const liked = likedSet.has(`question__${question.id}`);
  const name = question.anonymous ? "익명" : question.authorName ?? question.guestName ?? "게스트";
  // 채택 권한: 질문 작성자(로그인 본인) 또는 보드 소유자 또는 운영진
  const canAccept =
    !!user && (question.authorId === user.id || user.id === board.ownerId || user.role === "staff" || user.role === "president" || user.role === "admin" || user.role === "sysadmin");

  async function handleLike() {
    if (!user) {
      toast.error("좋아요는 로그인 후 가능합니다.");
      return;
    }
    try {
      await commLikesApi.toggle(user.id, "question", question.id);
      onChanged();
    } catch {
      toast.error("좋아요 처리 실패");
    }
  }

  async function handleDelete() {
    if (!confirm("이 질문을 삭제하시겠습니까? (답변도 함께 사라집니다)")) return;
    try {
      await commQuestionsApi.delete(question.id);
      await queryClient.invalidateQueries();
      onChanged();
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제 실패");
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        question.resolved ? "border-emerald-200 bg-emerald-50/40" : "bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            {question.resolved && <CheckCircle2 size={14} className="text-emerald-600" />}
            <span className="text-[11px] text-muted-foreground">{name}</span>
            {question.resolved && (
              <Badge variant="outline" className="border-emerald-400 text-[9px] text-emerald-700">
                해결됨
              </Badge>
            )}
          </div>
          <p className="whitespace-pre-wrap">{question.body}</p>
        </div>
        {canDeletePost(user, question, board) && (
          <button
            type="button"
            onClick={handleDelete}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={handleLike}
          className={cn("flex items-center gap-1", liked ? "text-primary" : "hover:text-foreground")}
        >
          <ThumbsUp size={13} /> {question.likeCount}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <MessageSquare size={13} /> 답변 {question.answerCount}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {expanded && (
        <AnswerThread
          board={board}
          question={question}
          user={user}
          likedSet={likedSet}
          canAccept={canAccept}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: CommBoardDetail 작성**

`src/features/comm-board/CommBoardDetail.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Lock, Monitor, Pencil, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";
import { commBoardsApi, commQuestionsApi, commLikesApi } from "@/lib/bkend";
import type { CommBoard, CommQuestion, CommSortMode, User } from "@/types";
import { COMM_SORT_LABELS } from "@/types";
import { sortQuestions, canManageBoard } from "./comm-helpers";
import QuestionComposer from "./QuestionComposer";
import QuestionItem from "./QuestionItem";
import CommBoardDialog from "./CommBoardDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  boardId: string;
  user: User | null;
}

export default function CommBoardDetail({ boardId, user }: Props) {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<CommSortMode>("recent");
  const [editOpen, setEditOpen] = useState(false);

  const { data: board, isLoading, isError } = useQuery({
    queryKey: ["comm-board", boardId],
    queryFn: () => commBoardsApi.get(boardId),
    retry: false,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["comm-questions", boardId],
    enabled: !!board,
    queryFn: async () => {
      const res = await commQuestionsApi.listByBoard(boardId);
      return res.data as CommQuestion[];
    },
  });

  const { data: likedSet = new Set<string>() } = useQuery({
    queryKey: ["comm-likes", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: () => commLikesApi.listMineSet(user!.id),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["comm-questions", boardId] });
    queryClient.invalidateQueries({ queryKey: ["comm-likes", user?.id ?? "anon"] });
  }

  async function handleToggleStatus() {
    if (!board) return;
    try {
      await commBoardsApi.update(board.id, { status: board.status === "open" ? "closed" : "open" });
      queryClient.invalidateQueries({ queryKey: ["comm-board", boardId] });
      toast.success(board.status === "open" ? "보드를 닫았습니다." : "보드를 다시 열었습니다.");
    } catch {
      toast.error("상태 변경 실패");
    }
  }

  async function handleDeleteBoard() {
    if (!board) return;
    if (!confirm("보드를 삭제하시겠습니까? 모든 질문/답변이 사라집니다.")) return;
    try {
      await commBoardsApi.delete(board.id);
      toast.success("보드가 삭제되었습니다.");
      window.history.back();
    } catch {
      toast.error("삭제 실패");
    }
  }

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">불러오는 중…</p>;
  }
  if (isError || !board) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground" role="alert">
        보드를 찾을 수 없습니다.
      </div>
    );
  }

  const sorted = sortQuestions(questions, sort);
  const manage = canManageBoard(user, board);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <button onClick={() => window.history.back()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={13} /> 뒤로
      </button>

      <div className="space-y-2 rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              {board.status === "closed" && <Lock size={16} className="text-muted-foreground" />}
              {board.title}
            </h1>
            {board.description && <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>}
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{board.ownerName}</span>
              {board.allowGuest && <Badge variant="outline" className="text-[9px]">게스트 허용</Badge>}
            </div>
          </div>
          <Link
            href={`/boards/${board.id}/present`}
            className="flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent"
          >
            <Monitor size={13} /> 발표 보기
          </Link>
        </div>

        {manage && (
          <div className="flex flex-wrap gap-1.5 border-t pt-2">
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" onClick={() => setEditOpen(true)}>
              <Pencil size={11} /> 수정
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" onClick={handleToggleStatus}>
              {board.status === "open" ? <Lock size={11} /> : <Unlock size={11} />}
              {board.status === "open" ? "닫기" : "열기"}
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px] text-destructive" onClick={handleDeleteBoard}>
              <Trash2 size={11} /> 삭제
            </Button>
          </div>
        )}
      </div>

      <QuestionComposer board={board} user={user} onCreated={refresh} />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">질문 {questions.length}개</span>
        <div className="flex gap-1">
          {(["recent", "popular"] as CommSortMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSort(m)}
              className={`rounded px-2 py-0.5 text-[11px] ${sort === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              {COMM_SORT_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded border border-dashed bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
          아직 질문이 없습니다. 첫 질문을 남겨보세요.
        </p>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((q) => (
            <QuestionItem key={q.id} board={board} question={q} user={user} likedSet={likedSet} onChanged={refresh} />
          ))}
        </div>
      )}

      {editOpen && user && (
        <CommBoardDialog
          contextType={board.contextType}
          contextId={board.contextId}
          activityProgressId={board.activityProgressId}
          week={board.week}
          ownerId={board.ownerId}
          ownerName={board.ownerName}
          board={board}
          onClose={() => setEditOpen(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["comm-board", boardId] })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: 타입체크**

Run: `cd /c/work/yonsei-edtech && npx tsc --noEmit 2>&1 | grep -E "QuestionItem|CommBoardDetail" || echo "ok"`
Expected: `ok`

- [ ] **Step 4: 커밋**

```bash
cd /c/work/yonsei-edtech && git add src/features/comm-board/QuestionItem.tsx src/features/comm-board/CommBoardDetail.tsx && git commit -m "feat(comm-board): 질문 카드 + 보드 본체"
```

---

## Task 10: 공개 보드 상세 라우트

**Files:**
- Create: `src/app/boards/[boardId]/page.tsx`

- [ ] **Step 1: 라우트 작성**

`src/app/boards/[boardId]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import CommBoardDetail from "@/features/comm-board/CommBoardDetail";

export default function BoardPage() {
  const params = useParams();
  const boardId = String(params.boardId);
  const { user } = useAuthStore();
  return <CommBoardDetail boardId={boardId} user={user} />;
}
```

- [ ] **Step 2: 라우트 렌더 확인(개발 서버)**

Run: `cd /c/work/yonsei-edtech && npx tsc --noEmit 2>&1 | grep "boards/\[boardId\]" || echo "ok"`
Expected: `ok`

> 참고: `useAuthStore` 의 정확한 export 경로는 `grep -rn "useAuthStore" src/features/activities/ActivityWeekDetailPage.tsx` 로 이미 확인됨(`@/features/auth/auth-store`). 다르면 맞춘다.

- [ ] **Step 3: 커밋**

```bash
cd /c/work/yonsei-edtech && git add "src/app/boards/[boardId]/page.tsx" && git commit -m "feat(comm-board): 공개 보드 상세 라우트 /boards/[id]"
```

---

## Task 11: 전체화면 발표 보기 (Zoom용)

**Files:**
- Create: `src/features/comm-board/CommBoardPresent.tsx`
- Create: `src/app/boards/[boardId]/present/page.tsx`

- [ ] **Step 1: CommBoardPresent 작성** (5초 폴링 + QR)

`src/features/comm-board/CommBoardPresent.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, ThumbsUp } from "lucide-react";
import { commBoardsApi, commQuestionsApi } from "@/lib/bkend";
import type { CommQuestion } from "@/types";
import { sortQuestions } from "./comm-helpers";

interface Props {
  boardId: string;
}

export default function CommBoardPresent({ boardId }: Props) {
  const [hideResolved, setHideResolved] = useState(false);

  const { data: board } = useQuery({
    queryKey: ["comm-board", boardId],
    queryFn: () => commBoardsApi.get(boardId),
    retry: false,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["comm-questions", boardId],
    queryFn: async () => (await commQuestionsApi.listByBoard(boardId)).data as CommQuestion[],
    refetchInterval: 5000, // 발표 중 실시간 갱신
  });

  const boardUrl = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/boards/${boardId}` : ""),
    [boardId],
  );

  const visible = sortQuestions(
    hideResolved ? questions.filter((q) => !q.resolved) : questions,
    "popular",
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-50">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{board?.title ?? "소통 보드"}</h1>
          {board?.description && <p className="mt-1 text-slate-300">{board.description}</p>}
          <button
            onClick={() => setHideResolved((v) => !v)}
            className="mt-3 rounded border border-slate-600 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
          >
            {hideResolved ? "해결된 질문 표시" : "해결된 질문 숨기기"}
          </button>
        </div>
        {boardUrl && (
          <div className="flex flex-col items-center rounded-lg bg-white p-3">
            <QRCodeSVG value={boardUrl} size={120} />
            <span className="mt-1 text-[10px] font-medium text-slate-700">QR로 질문 참여</span>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mt-20 text-center text-xl text-slate-400">아직 질문이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((q) => (
            <div
              key={q.id}
              className={`rounded-xl border p-5 ${q.resolved ? "border-emerald-600 bg-emerald-950/40" : "border-slate-700 bg-slate-900"}`}
            >
              <p className="whitespace-pre-wrap text-lg leading-relaxed">{q.body}</p>
              <div className="mt-3 flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <ThumbsUp size={15} /> {q.likeCount}
                </span>
                <span>답변 {q.answerCount}</span>
                {q.resolved && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 size={15} /> 해결됨
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: present 라우트 작성**

`src/app/boards/[boardId]/present/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import CommBoardPresent from "@/features/comm-board/CommBoardPresent";

export default function BoardPresentPage() {
  const params = useParams();
  return <CommBoardPresent boardId={String(params.boardId)} />;
}
```

- [ ] **Step 3: 타입체크**

Run: `cd /c/work/yonsei-edtech && npx tsc --noEmit 2>&1 | grep -E "Present|present" || echo "ok"`
Expected: `ok`
> 참고: `qrcode.react` 는 `package.json` 에 이미 설치됨. named export 는 `QRCodeSVG`.

- [ ] **Step 4: 커밋**

```bash
cd /c/work/yonsei-edtech && git add src/features/comm-board/CommBoardPresent.tsx "src/app/boards/[boardId]/present/page.tsx" && git commit -m "feat(comm-board): 전체화면 발표 보기(QR+5초 폴링)"
```

---

## Task 12: 전체 빌드 검증 + 수동 QA + 배포

**Files:** 없음 (검증·배포)

- [ ] **Step 1: 전체 타입체크 + 단위 테스트**

Run: `cd /c/work/yonsei-edtech && npx vitest run src/features/comm-board && npx tsc --noEmit 2>&1 | grep -E "comm-board|comm_" || echo "type ok"`
Expected: 테스트 PASS, `type ok`

- [ ] **Step 2: 프로덕션 빌드**

Run: `cd /c/work/yonsei-edtech && npm run build 2>&1 | tail -20`
Expected: 빌드 성공 (`Compiled successfully`). `/boards/[boardId]` 와 `/boards/[boardId]/present` 라우트가 출력에 포함.

- [ ] **Step 3: 수동 QA 체크리스트** (`npm run dev` 후 브라우저)

- [ ] 스터디 회차 페이지에서 "보드 만들기" → 보드 생성 → 목록 노출
- [ ] 세미나 상세 페이지에 소통 보드 섹션 노출
- [ ] `/boards/[id]` 진입 → 질문 등록(로그인) → 목록 표시
- [ ] 익명 토글로 질문 → "익명" 표시 확인
- [ ] 로그아웃 상태(게스트)에서 allowGuest 보드에 질문 등록 가능 / allowGuest=false 보드는 작성 차단
- [ ] 답변 등록 → 질문 answerCount 증가
- [ ] 좋아요 토글(로그인) → likeCount 증감, 비로그인 좋아요 시 안내 토스트
- [ ] 질문 작성자/보드 소유자가 답변 채택 → 질문 "해결됨" + 답변 "채택됨"
- [ ] 보드 소유자가 게스트 질문 삭제(모더레이션) 가능
- [ ] 보드 "닫기" → 작성 UI 비활성(읽기 전용)
- [ ] 정렬 토글 최신/인기 동작
- [ ] `/boards/[id]/present` → 인기순 카드, QR 노출, 다른 탭에서 질문 추가 시 5초 내 반영

- [ ] **Step 4: firestore.rules 배포** (⚠️ 신규 컬렉션은 rules 배포 없이는 접근 거부됨)

Run: `cd /c/work/yonsei-edtech && npx firebase deploy --only firestore:rules`
Expected: `Deploy complete!`
> firebase 로그인 필요 시 사용자에게 `! npx firebase login` 안내.

- [ ] **Step 5: 앱 배포** (CLAUDE.md 절차 — 모든 변경 완료 후 한 번만)

Run:
```bash
cd /c/work/yonsei-edtech && git push origin master && npm run deploy:vercel
```
Expected: Vercel 배포 Ready. 프로덕션 URL https://yonsei-edtech.vercel.app 에서 동작 확인.
> CLAUDE.md 규칙: `npm run deploy:vercel`(토큰 명시)로만 배포. Alias 연결 확인 필수.

---

## 자체 검토 결과 (작성자 체크)

- **스펙 커버리지**: 보드 CRUD(Task 5·9), 게스트/익명(Task 8), 좋아요(Task 8·9 + API Task 3), 채택/해결됨(Task 8·9), 정렬(Task 2·9), 회차+세미나 임베드(Task 7), 공개 라우트(Task 10), 발표 보기+QR(Task 11), 권한 규칙(Task 4) — 스펙 8개 섹션 모두 매핑됨.
- **타입 일관성**: `CommBoard/CommQuestion/CommAnswer/CommLike` 필드명이 Task 1 정의와 Task 3 API, Task 5~11 컴포넌트에서 일치. `isAccepted` 필드는 모델에서 제거하고 `question.resolvedAnswerId === answer.id` 로 판단(설계 §5 결정 반영) — 답변 write 권한 단순화.
- **Placeholder 스캔**: 없음. Task 7 의 변수명(`activity.type` 등)은 실제 파일 확인 grep 지시를 명시.
- **범위 밖(v1 제외)**: streak 가산점, 서버 레이트리밋, 첨부파일, 웹소켓 — 설계 §8 과 일치.
