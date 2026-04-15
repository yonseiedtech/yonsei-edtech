import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "president");
  if (authResult instanceof Response) return authResult;

  let targetUserId: string;
  try {
    const body = await req.json();
    targetUserId = body.targetUserId;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!targetUserId) {
    return Response.json({ error: "targetUserId가 필요합니다." }, { status: 400 });
  }
  if (targetUserId === authResult.uid) {
    return Response.json({ error: "본인 계정으로는 전환할 수 없습니다." }, { status: 400 });
  }

  try {
    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    // 대상 사용자 확인
    const targetDoc = await db.collection("users").doc(targetUserId).get();
    if (!targetDoc.exists) {
      return Response.json({ error: "대상 사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const token = await adminAuth.createCustomToken(targetUserId, {
      impersonatedBy: authResult.uid,
    });

    // 감사 로그
    await db.collection("audit_logs").add({
      adminUid: authResult.uid,
      targetUid: targetUserId,
      action: "impersonate:start",
      at: FieldValue.serverTimestamp(),
    });

    return Response.json({ customToken: token, impersonatorUid: authResult.uid });
  } catch (err) {
    console.error("[impersonate] failed:", err);
    return Response.json({ error: "전환 토큰 생성에 실패했습니다." }, { status: 500 });
  }
}
