// ────────────────────────────────────────────────────────────
// types/activity-groups.ts — 다회성 모임(Activity Groups) 도메인 타입
// (독서모임·와인모임 등 지속 운영 그룹)
// ────────────────────────────────────────────────────────────

export const ACTIVITY_GROUP_CATEGORIES = ["독서", "취미", "친목", "운동", "기타"] as const;
export type ActivityGroupCategory = (typeof ACTIVITY_GROUP_CATEGORIES)[number];

export type ActivityGroupStatus = "recruiting" | "active" | "closed";

export const ACTIVITY_GROUP_STATUS_LABELS: Record<ActivityGroupStatus, string> = {
  recruiting: "모집중",
  active: "운영중",
  closed: "마감",
};

export type ActivityGroupMemberRole = "leader" | "member";

export interface ActivityGroup {
  id: string;
  name: string;
  description: string;
  category: ActivityGroupCategory;
  /** 선택 이모지 아이콘 */
  coverEmoji?: string;
  leaderId: string;
  leaderName: string;
  /** 모임 주기 (자유 문구, 예: "격주 목요일 19시") */
  cadence?: string;
  place?: string;
  status: ActivityGroupStatus;
  /** 정원 (없으면 무제한) */
  memberLimit?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityGroupMember {
  /** docId 규약: `${groupId}_${userId}` */
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  role: ActivityGroupMemberRole;
  joinedAt: string;
}

export interface ActivityGroupSession {
  id: string;
  groupId: string;
  title: string;
  date: string;
  place?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}
