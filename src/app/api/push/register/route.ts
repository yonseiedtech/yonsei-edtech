import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 클라이언트에서 발급받은 FCM 토큰을 서버에 저장 — Sprint 53
 * 컬렉션: push_tokens
 *  - id: 임의 (Firestore auto)
 *  - userId, token, userAgent, createdAt, lastUsedAt
 *
 * 동일 (userId+token) 조합은 1건만 유지. 다른 회원이 같은 토큰을 보낸 경우는 덮어씌운다 (디바이스 공유 케이스).
 */
export async function POST(req: NextRequest) {
  const user = await requireAuth(req, "member");
  if (user instanceof NextResponse) return user;

  let body: { token?: string; userAgent?: string };
  try {
    body = (await req.json()) as { token?: string; userAgent?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "token 필수" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const existing = await db
      .collection("push_tokens")
      .where("token", "==", token)
      .limit(5)
      .get();

    const nowIso = new Date().toISOString();

    // 동일 토큰 다른 userId 정리: 새 사용자로 덮어씀
    for (const doc of existing.docs) {
      if (doc.data().userId !== user.id) {
        await doc.ref.delete();
      }
    }

    // 본인 + 동일 토큰 이 이미 있으면 update, 아니면 create
    const mine = existing.docs.find((d) => d.data().userId === user.id);
    if (mine) {
      await mine.ref.update({
        userAgent: body.userAgent ?? mine.data().userAgent,
        lastUsedAt: nowIso,
      });
      return NextResponse.json({ ok: true, updated: true, id: mine.id });
    }

    const newDoc = await db.collection("push_tokens").add({
      userId: user.id,
      token,
      userAgent: body.userAgent ?? "",
      createdAt: nowIso,
      lastUsedAt: nowIso,
    });
    return NextResponse.json({ ok: true, created: true, id: newDoc.id });
  } catch (e) {
    console.error("[/api/push/register]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
