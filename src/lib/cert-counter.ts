/**
 * Sprint 69 핫픽스: 수료증 번호 발급용 트랜잭션 카운터
 *
 * 기존 문제: seminar-status / activity-status cron 이 동시에 실행되면
 * `certificates` 컬렉션의 `certificateNo desc` orderBy → lastSeq 추론 방식이 race 됨
 * → 같은 번호가 두 발급에 중복 할당될 수 있음.
 *
 * 해결: `counters/cert_${YY}` 문서를 runTransaction 으로 lastSeq increment.
 * 호출자는 returned seq 를 그대로 `${year}-${pad(seq, 3)}` 로 포맷.
 */

import type { Firestore } from "firebase-admin/firestore";

/**
 * 주어진 연도(YY)에 대해 다음 시퀀스 번호를 트랜잭션으로 발급.
 * 동시 실행에 대해 monotonically increasing 보장.
 *
 * 최초 호출 시 기존 certificates 컬렉션을 1회 스캔해 lastSeq seed 를 잡는다
 * (legacy 데이터 호환).
 */
export async function nextCertSeq(
  db: Firestore,
  year: string, // "26" 형식 (2자리)
): Promise<number> {
  const counterRef = db.collection("counters").doc(`cert_${year}`);

  return db.runTransaction(async (txn) => {
    const snap = await txn.get(counterRef);
    let lastSeq = (snap.data()?.lastSeq as number) ?? 0;

    // 최초 시드: legacy certificates 스캔 (transaction 안에서 read는 가능)
    if (!snap.exists) {
      const legacySnap = await db
        .collection("certificates")
        .orderBy("certificateNo", "desc")
        .limit(1)
        .get();
      if (!legacySnap.empty) {
        const no = legacySnap.docs[0].data().certificateNo as string | undefined;
        if (no && no.startsWith(year + "-")) {
          lastSeq = parseInt(no.slice(3), 10) || 0;
        }
      }
    }

    const next = lastSeq + 1;
    txn.set(counterRef, { lastSeq: next, year, updatedAt: new Date().toISOString() }, { merge: true });
    return next;
  });
}

/** 발급 번호 포맷: `${YY}-${NNN}` */
export function formatCertNo(year: string, seq: number): string {
  return `${year}-${String(seq).padStart(3, "0")}`;
}
