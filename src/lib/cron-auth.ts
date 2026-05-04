/**
 * Sprint 69 핫픽스: cron 엔드포인트 인증 헬퍼
 *
 * 기존: `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` 단순 비교 → timing attack 가능
 * 개선: `crypto.timingSafeEqual` 로 상수 시간 비교
 */

import { timingSafeEqual } from "node:crypto";

/**
 * Cron 인증 검증. 통과 시 true, 실패 시 false.
 * 사용 예: `if (!verifyCronAuth(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });`
 */
export function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron-auth] CRON_SECRET env not set");
    return false;
  }
  const header = req.headers.get("authorization");
  if (!header) return false;
  const expected = `Bearer ${secret}`;
  // 길이 다르면 timingSafeEqual 가 throw 하므로 사전 체크 (이 정보 자체는 leak 되지 않음 — secret 길이는 변경 없음)
  if (header.length !== expected.length) return false;
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
