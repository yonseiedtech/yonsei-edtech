/**
 * 가입용 보안질문 답변 PBKDF2-SHA256 해시 (Web Crypto).
 * 서버 검증(src/lib/security-answer.ts)과 동일 포맷: pbkdf2$<iter>$<saltHex>$<hashHex>
 * iterations 310_000 은 security-answer.ts 의 PBKDF2_ITERATIONS 와 동기화.
 */
export async function pbkdf2AnswerHash(normalized: string): Promise<string> {
  const iterations = 310_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalized),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  const toHex = (u: Uint8Array) =>
    Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$${iterations}$${toHex(salt)}$${toHex(new Uint8Array(bits))}`;
}

/** 클라이언트용 SHA-256 헥스 해싱 유틸 (Web Crypto) */
export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
