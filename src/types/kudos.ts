// ─────────────────────────────────────────────────────────────
// kudos.ts — 학습 활동 kudos (코호트 한정 응원, v7-H5)
//
// 같은 가입 학기(코호트) 동기의 "이번 주 학습 활동"에 보내는 가벼운 양성 전용
// 응원 1건. 순위·비교가 아닌 관계성(자기결정성) 지지 장치.
//
// 멱등성/과알림 방지:
//  - doc id = `${fromUserId}_${toUserId}_${weekKey}` (deterministic)
//    → 한 회원이 같은 동기에게 같은 주에 1회만 보낼 수 있다(주 1회 자연 제한).
//  - 알림도 동일 발신자 기준 주 1회로 자연히 제한된다.
// 프라이버시:
//  - 발신자·수신자·운영진만 read (firestore.rules kudos 게이트).
//  - 학습 "세부 수치"는 다루지 않고 "활동 사실"에만 응원한다.
// ─────────────────────────────────────────────────────────────

/** 응원 종류 — 지금은 단일 응원("cheer"). 확장 여지를 위해 유니온으로 둔다. */
export type KudosType = "cheer";

export interface Kudos {
  /** `${fromUserId}_${toUserId}_${weekKey}` */
  id: string;
  /** 응원을 보낸 회원 */
  fromUserId: string;
  /** 응원 받은 회원 */
  toUserId: string;
  /** 발신자 이름 (알림·표시용 denorm) */
  fromName: string;
  /** 응원 대상 활동 주의 월요일(로컬) YYYY-MM-DD — weekKeyOf() 와 동일 기준 */
  weekKey: string;
  type: KudosType;
  createdAt: string;
}
