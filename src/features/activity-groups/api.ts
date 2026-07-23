/**
 * 다회성 모임(Activity Groups) 자체 API 모듈
 *
 * dataApi 프리미티브(bkend.ts)를 재사용하는 자체 API — bkend.ts 수정 금지.
 * 컬렉션 3개: activity_groups / activity_group_members / activity_group_sessions
 *
 * activity_group_members docId 규약: `${groupId}_${userId}` (가입/탈퇴 멱등)
 */

import {
  getDoc,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { dataApi } from "@/lib/bkend";
import type { ActivityGroup, ActivityGroupMember, ActivityGroupSession } from "@/types";

// ── helpers ──

function timestampToIso(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return v;
}

function serializeSnap(snap: { id: string; data: () => Record<string, unknown> | undefined }): Record<string, unknown> {
  const data = snap.data() ?? {};
  const result: Record<string, unknown> = { id: snap.id };
  for (const [k, v] of Object.entries(data)) {
    result[k] = timestampToIso(v);
  }
  return result;
}

// ── activity_groups ──

export const activityGroupsApi = {
  /** 전체 목록 (생성일 역순) */
  list: () =>
    dataApi.list<ActivityGroup>("activity_groups", { sort: "createdAt:desc" }),

  /** 단건 조회 */
  get: (id: string) => dataApi.get<ActivityGroup>("activity_groups", id),

  /** 생성 */
  create: (data: Omit<ActivityGroup, "id" | "createdAt" | "updatedAt">) =>
    dataApi.create<ActivityGroup>("activity_groups", data as Record<string, unknown>),

  /** 수정 (그룹장 전용 — 규칙은 Firestore rules 로 강제) */
  update: (id: string, data: Partial<Omit<ActivityGroup, "id" | "createdAt">>) =>
    dataApi.update<ActivityGroup>("activity_groups", id, data as Record<string, unknown>),
};

// ── activity_group_members ──

export const activityGroupMembersApi = {
  /** 그룹 멤버 목록 (가입순) */
  listByGroup: (groupId: string) =>
    dataApi.list<ActivityGroupMember>("activity_group_members", {
      "filter[groupId]": groupId,
      sort: "joinedAt:asc",
    }),

  /** 유저가 속한 멤버십 목록 */
  listByUser: (userId: string) =>
    dataApi.list<ActivityGroupMember>("activity_group_members", {
      "filter[userId]": userId,
    }),

  /**
   * 가입 (멱등) — docId: `${groupId}_${userId}`
   * 이미 존재하면 기존 멤버십 반환, 없으면 생성.
   */
  join: async (
    groupId: string,
    userId: string,
    userName: string,
    role: "leader" | "member" = "member",
  ): Promise<ActivityGroupMember> => {
    const docId = `${groupId}_${userId}`;
    const ref = doc(db, "activity_group_members", docId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      return serializeSnap(existing) as unknown as ActivityGroupMember;
    }
    await setDoc(ref, {
      groupId,
      userId,
      userName,
      role,
      joinedAt: serverTimestamp(),
    });
    const snap = await getDoc(ref);
    return serializeSnap(snap) as unknown as ActivityGroupMember;
  },

  /** 탈퇴 (멱등) — 문서 없어도 오류 없음 */
  leave: async (groupId: string, userId: string): Promise<void> => {
    const docId = `${groupId}_${userId}`;
    await deleteDoc(doc(db, "activity_group_members", docId));
  },

  /** 멤버십 존재 확인 */
  isMember: async (groupId: string, userId: string): Promise<boolean> => {
    const docId = `${groupId}_${userId}`;
    const snap = await getDoc(doc(db, "activity_group_members", docId));
    return snap.exists();
  },
};

// ── activity_group_sessions ──

export const activityGroupSessionsApi = {
  /** 그룹의 회차 목록 (날짜 오름차순) */
  listByGroup: (groupId: string) =>
    dataApi.list<ActivityGroupSession>("activity_group_sessions", {
      "filter[groupId]": groupId,
      sort: "date:asc",
    }),

  /** 회차 생성 (그룹장·staff 전용 — rules 로 강제) */
  create: (data: Omit<ActivityGroupSession, "id" | "createdAt">) =>
    dataApi.create<ActivityGroupSession>(
      "activity_group_sessions",
      data as Record<string, unknown>,
    ),

  /** 회차 수정 */
  update: (id: string, data: Partial<Omit<ActivityGroupSession, "id" | "createdAt">>) =>
    dataApi.update<ActivityGroupSession>(
      "activity_group_sessions",
      id,
      data as Record<string, unknown>,
    ),

  /** 회차 삭제 */
  delete: (id: string) => dataApi.delete("activity_group_sessions", id),
};
