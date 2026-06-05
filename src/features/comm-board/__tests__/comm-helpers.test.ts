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
  return { id: "u1", name: "홍길동", role: "member", ...p } as User;
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
