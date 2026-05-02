/**
 * 서버사이드 FCM 발송 헬퍼 — Sprint 53
 *
 * - sendToUsers(userIds, payload): 회원별 등록 토큰 모두에 발송
 * - 실패 토큰은 push_tokens 컬렉션에서 즉시 삭제 (NotRegistered/InvalidRegistration)
 * - notifications 컬렉션에는 별도로 저장하지 않음 (별도 인앱 알림 흐름과 분리)
 */

import { getAdminDb, getAdminMessaging } from "./firebase-admin";

export interface PushPayload {
  title: string;
  body: string;
  link: string;
  /** 동일 tag 면 모바일 OS 가 알림 grouping/replace */
  tag?: string;
}

/** 만료/실패로 삭제 대상이 되는 FCM 에러 코드 */
const STALE_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

interface PushTokenDoc {
  userId: string;
  token: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt?: string;
}

async function loadTokensForUsers(userIds: string[]): Promise<{ id: string; data: PushTokenDoc }[]> {
  if (userIds.length === 0) return [];
  const db = getAdminDb();
  const out: { id: string; data: PushTokenDoc }[] = [];
  // Firestore "in" 은 최대 30개 제한 → 30개씩 chunk
  for (let i = 0; i < userIds.length; i += 30) {
    const chunk = userIds.slice(i, i + 30);
    const snap = await db
      .collection("push_tokens")
      .where("userId", "in", chunk)
      .get();
    for (const d of snap.docs) {
      out.push({ id: d.id, data: d.data() as PushTokenDoc });
    }
  }
  return out;
}

/**
 * 여러 회원에게 푸시 발송. 발송 결과 통계 반환.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{
  attempted: number;
  successful: number;
  removedStale: number;
  errors: number;
}> {
  const tokenDocs = await loadTokensForUsers(userIds);
  if (tokenDocs.length === 0) {
    return { attempted: 0, successful: 0, removedStale: 0, errors: 0 };
  }
  const messaging = getAdminMessaging();
  const db = getAdminDb();

  const messages = tokenDocs.map((t) => ({
    token: t.data.token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      link: payload.link,
      tag: payload.tag ?? "yonsei-edtech",
    },
    webpush: {
      fcmOptions: { link: payload.link },
    },
  }));

  let successful = 0;
  let errors = 0;
  let removedStale = 0;
  // sendEach 는 최대 500개 / 호출 (multicast 호환)
  for (let i = 0; i < messages.length; i += 500) {
    const batch = messages.slice(i, i + 500);
    const docsBatch = tokenDocs.slice(i, i + 500);
    let res;
    try {
      res = await messaging.sendEach(batch);
    } catch (e) {
      console.error("[push-admin] sendEach error:", e);
      errors += batch.length;
      continue;
    }
    for (let k = 0; k < res.responses.length; k++) {
      const r = res.responses[k];
      if (r.success) {
        successful++;
        // lastUsedAt 갱신은 비동기 fire-and-forget
        const tokenDoc = docsBatch[k];
        db.collection("push_tokens")
          .doc(tokenDoc.id)
          .update({ lastUsedAt: new Date().toISOString() })
          .catch(() => {});
        continue;
      }
      const code = r.error?.code ?? "unknown";
      if (STALE_ERROR_CODES.has(code)) {
        const tokenDoc = docsBatch[k];
        try {
          await db.collection("push_tokens").doc(tokenDoc.id).delete();
          removedStale++;
        } catch {
          // ignore
        }
      } else {
        errors++;
        console.warn("[push-admin] send error:", code, r.error?.message);
      }
    }
  }

  return {
    attempted: tokenDocs.length,
    successful,
    removedStale,
    errors,
  };
}
