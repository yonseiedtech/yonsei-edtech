import { z } from "zod";
import type { NextRequest } from "next/server";

/**
 * API 라우트의 입력 검증 — Zod safeParse 표준화 헬퍼.
 * 실패 시 400 Response 반환, 성공 시 파싱된 data 반환.
 *
 * 사용법:
 *   const parsed = await parseJsonBody(req, MySchema);
 *   if (parsed instanceof Response) return parsed;
 *   // parsed 는 typed
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  req: NextRequest | Request,
  schema: T,
): Promise<z.infer<T> | Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".");
    return Response.json(
      {
        error: `${path ? `[${path}] ` : ""}${first?.message ?? "유효하지 않은 입력입니다."}`,
      },
      { status: 400 },
    );
  }
  return result.data;
}

// ── 자주 쓰이는 스키마 ─────────────────────────────────────

export const impersonateSchema = z.object({
  targetUserId: z.string().min(1, "targetUserId가 필요합니다."),
});

export const approvalEmailSchema = z.object({
  email: z.string().email("유효한 이메일 형식이 아닙니다."),
  name: z.string().optional(),
  approved: z.boolean(),
});
