/**
 * 게시글 공감 reaction (Sprint 67-AO)
 *
 * 모든 카테고리 게시글에 적용. paper-review·notice·free 등 어디에서나 사용.
 * 한 사용자가 한 게시글에 여러 type 동시 reaction 가능 (예: 좋아요 + 멋져요).
 */

export type PostReactionType =
  | "thumbs_up" // 좋아요
  | "sparkle" // 멋져요
  | "heart" // 공감
  | "applaud"; // 응원

export const POST_REACTION_TYPES: PostReactionType[] = [
  "thumbs_up",
  "sparkle",
  "heart",
  "applaud",
];

export const POST_REACTION_EMOJIS: Record<PostReactionType, string> = {
  thumbs_up: "👍",
  sparkle: "✨",
  heart: "💗",
  applaud: "📣",
};

export const POST_REACTION_LABELS: Record<PostReactionType, string> = {
  thumbs_up: "좋아요",
  sparkle: "멋져요",
  heart: "공감돼요",
  applaud: "응원해요",
};

export interface PostReaction {
  /** `{userId}_{postId}_{type}` */
  id: string;
  userId: string;
  postId: string;
  type: PostReactionType;
  createdAt: string;
}
