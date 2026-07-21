import type { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * cron_runs 컬렉션 문서 스키마 (Admin SDK 적재 전용 — 클라 write 불필요).
 *
 * Firestore 보안 규칙: read = admin only / write = 불허(Admin SDK 만 적재)
 */
export interface CronRunMeta {
  /** cron 라우트 디렉토리명 (e.g. "weekly-digest") */
  kind: string;
  /** 실행 시작 ISO 시각 */
  startedAt: string;
  /** 실행 종료 ISO 시각 */
  endedAt: string;
  /** 소요 시간 (ms) */
  durationMs: number;
  /** true=성공(2xx)/skip, false=500 이상 또는 throw */
  success: boolean;
  /** 응답 본문에서 추출한 숫자 집계 (sent·updated·deleted 등) */
  summary: Record<string, number>;
  /** 실패 시 오류 메시지 (있는 경우) */
  errorMessage?: string;
  /** endedAt 과 동일 — Firestore 인덱스·정렬 편의 */
  createdAt: string;
}

/** cron_runs 컬렉션에 실행 메타를 조용히 적재한다. 실패해도 호출부에 영향 없음. */
async function logCronRun(meta: CronRunMeta): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection("cron_runs").add(meta);
  } catch {
    // 로깅 실패는 cron 본 동작에 영향 없음 — 조용히 무시
  }
}

/** 응답 본문(JSON)에서 숫자 집계 필드만 추출 (summary counts용) */
function extractCounts(body: unknown): Record<string, number> {
  if (!body || typeof body !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

/**
 * cron GET 핸들러를 감싸 실행 메타를 `cron_runs` 컬렉션에 기록하는 고차함수.
 *
 * ### 동작 규칙
 * - **기존 로직 변경 없음** — 반환값·에러 전파 그대로 유지.
 * - **401 응답 로깅 제외** — 인증 실패는 실제 cron 실행이 아님.
 * - **로깅 실패 조용히 무시** — cron 본 동작 불간섭.
 * - **비동기 적재** — 응답 반환 후 background에서 Firestore 적재(응답 지연 없음).
 *
 * ### 성공 판정
 * - `res.status 200–499` → `success: true` (200 ok + 스킵 포함)
 * - `res.status 500+` 또는 throw → `success: false`
 *
 * @param kind cron 라우트 디렉토리명 (e.g. "weekly-digest", "notifications-cleanup")
 * @param handler 기존 GET 핸들러 함수
 */
export function withCronLog(
  kind: string,
  handler: (req: NextRequest) => Promise<Response>,
): (req: NextRequest) => Promise<Response> {
  return async (req: NextRequest): Promise<Response> => {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    let res: Response;
    try {
      res = await handler(req);
    } catch (err) {
      // 핸들러가 throw하는 경우 (대부분의 cron은 내부에서 catch — 드문 케이스 방어)
      const durationMs = Date.now() - startMs;
      const endedAt = new Date().toISOString();
      const errorMessage = err instanceof Error ? err.message : String(err);
      // await 필수 — 서버리스는 응답/throw 후 즉시 동결되어 미대기 promise 가 유실된다
      await logCronRun({
        kind,
        startedAt,
        endedAt,
        durationMs,
        success: false,
        summary: {},
        errorMessage,
        createdAt: endedAt,
      }).catch(() => {});
      throw err;
    }

    // 401은 인증 실패 — 실제 cron 실행이 아니므로 로깅 제외
    if (res.status === 401) return res;

    const durationMs = Date.now() - startMs;
    const endedAt = new Date().toISOString();
    const success = res.status >= 200 && res.status < 500;

    // 응답 반환 "전"에 적재를 await — fire-and-forget 은 Vercel 함수 동결로 기록이
    // 비결정적으로 유실된다(2026-07-21 newcomer 성공 실행 미기록 실증). cron 은 사용자가
    // 기다리지 않으므로 수 ms 지연은 무해. 로깅 실패는 여전히 본 동작에 불간섭.
    try {
      const body: unknown = await res.clone().json();
      const summary = extractCounts(body);
      const errorMessage =
        !success && body && typeof body === "object"
          ? ((body as Record<string, unknown>).error as string | undefined)
          : undefined;
      await logCronRun({ kind, startedAt, endedAt, durationMs, success, summary, errorMessage, createdAt: endedAt });
    } catch {
      // JSON 파싱 실패 시 counts 없이 메타만 적재
      await logCronRun({ kind, startedAt, endedAt, durationMs, success, summary: {}, createdAt: endedAt }).catch(
        () => {},
      );
    }

    return res;
  };
}
