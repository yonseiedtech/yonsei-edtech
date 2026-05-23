/**
 * notifications-bridge.ts — 서버사이드 알림 적재 헬퍼 (Phase 3)
 *
 * cron / 서버 API route 에서 notifications 컬렉션에 인앱 알림을 직접 적재할 때 사용.
 * Firebase Admin SDK 를 사용하므로 서버 컨텍스트에서만 호출한다.
 *
 * 사용 예:
 *   import { createNotificationAdmin } from "@/lib/notifications-bridge";
 *   await createNotificationAdmin({ userId, type: "seminar_reminder", title, body, relatedLink });
 */

import { getAdminDb } from "./firebase-admin";
import type { NotificationType } from "@/types";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  relatedLink?: string;
  metadata?: Record<string, unknown>;
}

/**
 * notifications 컬렉션에 인앱 알림 1건을 적재한다.
 * 실패해도 throw 하지 않고 조용히 처리하여 메인 cron 로직을 블로킹하지 않는다.
 */
export async function createNotificationAdmin(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection("notifications").add({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.body ?? "",
      link: input.relatedLink ?? null,
      read: false,
      createdAt: new Date().toISOString(),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
  } catch (err) {
    // 알림 적재 실패는 메인 흐름을 블로킹하지 않는다
    console.warn("[notifications-bridge] createNotificationAdmin failed:", err);
  }
}

/**
 * 여러 사용자에게 동일한 알림을 fan-out 으로 적재한다.
 * Firestore batch (최대 500건) 단위로 처리한다.
 */
export async function fanOutNotificationAdmin(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">,
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    const db = getAdminDb();
    const now = new Date().toISOString();
    const BATCH_LIMIT = 500;

    for (let i = 0; i < userIds.length; i += BATCH_LIMIT) {
      const chunk = userIds.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();
      for (const userId of chunk) {
        const ref = db.collection("notifications").doc();
        batch.set(ref, {
          userId,
          type: input.type,
          title: input.title,
          message: input.body ?? "",
          link: input.relatedLink ?? null,
          read: false,
          createdAt: now,
          ...(input.metadata ? { metadata: input.metadata } : {}),
        });
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn("[notifications-bridge] fanOutNotificationAdmin failed:", err);
  }
}
