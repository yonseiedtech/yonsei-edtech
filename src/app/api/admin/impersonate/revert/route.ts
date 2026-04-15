import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * 임퍼소네이션 복귀 API.
 * 인증 토큰의 `impersonatedBy` claim을 확인하여 원본 관리자 uid로 커스텀 토큰 재발급.
 */
export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const idToken = header.slice(7);

  try {
    const adminAuth = getAdminAuth();
    const db = getAdminDb();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const impersonatorUid = decoded.impersonatedBy as string | undefined;

    if (!impersonatorUid) {
      return Response.json({ error: "임퍼소네이션 상태가 아닙니다." }, { status: 400 });
    }

    // 원본 관리자 존재 확인
    const adminDoc = await db.collection("users").doc(impersonatorUid).get();
    if (!adminDoc.exists) {
      return Response.json({ error: "원본 관리자 계정을 찾을 수 없습니다." }, { status: 404 });
    }

    const customToken = await adminAuth.createCustomToken(impersonatorUid);

    await db.collection("audit_logs").add({
      adminUid: impersonatorUid,
      targetUid: decoded.uid,
      action: "impersonate:revert",
      at: FieldValue.serverTimestamp(),
    });

    return Response.json({ customToken, adminUid: impersonatorUid });
  } catch (err) {
    console.error("[impersonate/revert] failed:", err);
    return Response.json({ error: "복귀 토큰 생성에 실패했습니다." }, { status: 500 });
  }
}
