/**
 * Simple in-memory rate limiter for AI API endpoints.
 * Tracks requests per identifier (userId or IP) with a sliding window.
 *
 * ⚠️ KNOWN LIMITATION (Sprint 67-AR audit, 2026-05-12):
 * Vercel serverless 환경에서는 인스턴스간 메모리가 공유되지 않아 본 limiter는
 * 사실상 무효. 다음 스프린트에서 Vercel KV(Upstash Redis) 또는 동등 분산 저장소로 전환 필요.
 * 단일 인스턴스(Node 서버)에서는 정상 동작.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  /** Max requests per window (default: 20) */
  limit?: number;
  /** Window duration in seconds (default: 60) */
  windowSec?: number;
}

/**
 * Check rate limit for a given identifier.
 * Returns null if allowed, or a Response if rate limited.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {},
): Response | null {
  const { limit = 20, windowSec = 60 } = options;
  const now = Date.now();
  const key = identifier;

  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return Response.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  return null;
}

/** Extract client identifier from request (userId preferred, fallback to IP) */
export function getClientId(
  req: Request,
  userId?: string | null,
): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}
