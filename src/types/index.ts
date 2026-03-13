export interface User {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: "admin" | "member";
  generation: number;
  field: string;
  profileImage?: string;
  bio?: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  category: "notice" | "seminar" | "free";
  authorId: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "pending" | "replied";
  createdAt: string;
}

export type PostCategory = Post["category"];

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  notice: "공지사항",
  seminar: "세미나 자료",
  free: "자유게시판",
};
