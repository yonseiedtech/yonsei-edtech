import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { parseJsonBody, impersonateSchema } from "@/lib/api-validators";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "president");
  if (authResult instanceof Response) return authResult;

  const parsed = await parseJsonBody(req, impersonateSchema);
  if (parsed instanceof Response) return parsed;
  const { targetUserId } = parsed;

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

    // ID 토큰 자동 갱신(1h) 시 developer claims가 사라져 revert가 실패하는 버그를 막기 위해
    // 영구 customClaims로 impersonatedBy를 보관한다. 기존 claims는 보존.
    const userRecord = await adminAuth.getUser(targetUserId);
    const existingClaims = userRecord.customClaims ?? {};
    await adminAuth.setCustomUserClaims(targetUserId, {
      ...existingClaims,
      impersonatedBy: authResult.uid,
    });

    // 즉시 사용 가능한 customToken에도 동일 claim을 함께 실어 보낸다 (refresh 전까지 빠른 경로).
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
