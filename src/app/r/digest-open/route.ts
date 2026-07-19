import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * 다이제스트 열람 픽셀 (M7, 2026-07-20)
 *
 * GET /r/digest-open?c=<weekKey>
 *
 * 이메일 HTML 말미에 삽입하는 1×1 투명 GIF.
 *
 * 주의: 이메일 클라이언트가 이미지를 프록시·캐시·차단하면 열람이 기록되지
 * 않을 수 있음. 따라서 여기서 집계되는 count는 열람율의 참고 지표이며
 * 완전한 열람률 측정이 아니다 (Gmail 이미지 프록시 등 환경 의존).
 *
 * digest_opens/{weekKey} 문서에 count increment (Admin SDK).
 * 적재 실패해도 1×1 GIF 응답은 항상 반환 (추적보다 정상 응답 우선).
 */

// 1×1 투명 GIF (최소 바이너리 43바이트)
const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const c = (searchParams.get("c") ?? "unknown").slice(0, 100);

  try {
    const db = getAdminDb();
    await db
      .collection("digest_opens")
      .doc(c)
      .set(
        {
          weekKey: c,
          count: FieldValue.increment(1),
          lastAt: new Date().toISOString(),
        },
        { merge: true },
      );
  } catch (e) {
    console.error("[r/digest-open] open increment failed:", e);
  }

  return new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
