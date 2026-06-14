// 회원 간 쪽지 (Direct Message) — 사이클 113, 사용자 요청
// 알림(notifications)·할일(course_todos)과 함께 ProfileSideWidget 3탭에서 노출.

export interface DirectMessage {
  id: string;
  /** 보낸 사람 userId */
  fromId: string;
  fromName: string;
  /** 받는 사람 userId */
  toId: string;
  toName?: string;
  content: string;
  read: boolean;
  createdAt: string;
}
