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
