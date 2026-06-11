/**
 * 보안질문 답변 해싱 — PBKDF2-SHA256 + per-user salt (서버 전용: Node crypto)
 *
 * 저장 포맷: `pbkdf2$<iterations>$<saltHex>$<hashHex>`
 * 레거시 포맷: 무염 SHA-256 64-hex — 검증 성공 시 upgradedHash 를 반환해
 * 호출부가 문서를 새 포맷으로 갱신하도록 한다 (점진 마이그레이션).
 *
 * 클라이언트 생성 경로는 src/lib/hash.ts 의 pbkdf2AnswerHash (Web Crypto, 동일 포맷).
 */
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

/** OWASP 2023 PBKDF2-SHA256 최소 권장. hash.ts 클라이언트 리터럴과 동기화. */
export const PBKDF2_ITERATIONS = 310_000;
const KEY_LEN = 32;
const SALT_LEN = 16;

export function generateSecurityAnswerHash(normalized: string): string {
  const salt = randomBytes(SALT_LEN);
  const dk = pbkdf2Sync(normalized, salt, PBKDF2_ITERATIONS, KEY_LEN, "sha256");
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString("hex")}$${dk.toString("hex")}`;
}

export interface VerifyResult {
  ok: boolean;
  /** 레거시 해시가 매치된 경우 — 이 값으로 securityAnswerHash 를 재저장할 것 */
  upgradedHash?: string;
}

export function verifySecurityAnswer(normalized: string, stored: string): VerifyResult {
  if (stored.startsWith("pbkdf2$")) {
    const parts = stored.split("$");
    if (parts.length !== 4) return { ok: false };
    const iterations = Number(parts[1]);
    // 비정상 iterations 는 DoS(과대)·약화(과소) 양쪽 모두 거부
    if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > 5_000_000) {
      return { ok: false };
    }
    if (!/^[0-9a-f]+$/.test(parts[2]) || !/^[0-9a-f]+$/.test(parts[3])) return { ok: false };
    const salt = Buffer.from(parts[2], "hex");
    const expected = Buffer.from(parts[3], "hex");
    if (salt.length < 8 || expected.length < 16) return { ok: false };
    const dk = pbkdf2Sync(normalized, salt, iterations, expected.length, "sha256");
    return { ok: timingSafeEqual(dk, expected) };
  }

  // 레거시: 무염 SHA-256 hex
  if (!/^[0-9a-f]{64}$/i.test(stored)) return { ok: false };
  const provided = createHash("sha256").update(normalized).digest();
  const legacy = Buffer.from(stored, "hex");
  if (!timingSafeEqual(provided, legacy)) return { ok: false };
  return { ok: true, upgradedHash: generateSecurityAnswerHash(normalized) };
}
