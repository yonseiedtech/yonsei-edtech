import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 본인의 모든 push_tokens 를 삭제 (디바이스 1대 정도 가정).
 * Sprint 53.
 */
export async function POST(req: NextRequest) {
  const user = await requireAuth(req, "member");
  if (user instanceof NextResponse) return user;

  try {
    const db = getAdminDb();
    const snap = await db
      .collection("push_tokens")
      .where("userId", "==", user.id)
      .get();
    let deleted = 0;
    for (const doc of snap.docs) {
      await doc.ref.delete();
      deleted++;
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    console.error("[/api/push/unregister]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
