import type { Firestore } from "firebase-admin/firestore";

/**
 * 세미나 후기 요청 알림의 경로 간 통합 dedupe (QA-v3, 2026-07-05)
 *
 * 후기 유도 알림이 4개 경로(당일 체크인·completed 전환·D+1 크론·D+7 리마인더)에서
 * 각자 자기 type/link 로만 dedupe 해 최대 4중 발송되던 문제 —
 * 표준: type "seminar_review_request" + refId(=seminarId). 이 헬퍼는 신규 표준(refId)과
 * 레거시 발송 기록(type/link 변형 3종)을 모두 조회해 "이미 받은 사용자" 집합을 돌려준다.
 */
export async function sentReviewRequestUserIds(
  db: Firestore,
  seminarId: string,
): Promise<Set<string>> {
  const col = db.collection("notifications");
  const [byRef, legacyOldType, legacyDetailLink] = await Promise.all([
    // 표준 (2026-07-05 이후 전 경로)
    col.where("type", "==", "seminar_review_request").where("refId", "==", seminarId).get(),
    // 레거시: seminar-status 크론 (type "review_request" + /review 링크)
    col.where("type", "==", "review_request").where("link", "==", `/seminars/${seminarId}/review`).get(),
    // 레거시: 당일 체크인 (?tab=reviews 링크) + D+1 크론 (/review 링크) — 같은 type
    col.where("type", "==", "seminar_review_request").where("link", "in", [
      `/seminars/${seminarId}?tab=reviews`,
      `/seminars/${seminarId}/review`,
    ]).get(),
  ]);
  const sent = new Set<string>();
  for (const snap of [byRef, legacyOldType, legacyDetailLink]) {
    for (const d of snap.docs) {
      const uid = (d.data() as { userId?: string }).userId;
      if (uid) sent.add(uid);
    }
  }
  return sent;
}
