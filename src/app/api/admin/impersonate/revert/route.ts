import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * 임퍼소네이션 복귀 API.
 *
 * 다단계 폴백으로 원본 관리자 uid를 식별:
 *  1) 토큰 developer claim `impersonatedBy` (방금 발급된 신선한 토큰)
 *  2) Auth customClaims.impersonatedBy (Firebase ID 토큰 자동 갱신 후에도 보존)
 *  3) audit_logs `impersonate:start` 최근 기록 (이전 fix 이전에 시작된 stuck 세션 복구)
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

    // Tier 1: developer claim (커스텀 토큰 직후)
    let impersonatorUid = decoded.impersonatedBy as string | undefined;

    // Tier 2: 영구 customClaims (refresh 후에도 보존)
    let userRecord;
    if (!impersonatorUid) {
      userRecord = await adminAuth.getUser(decoded.uid);
      impersonatorUid = userRecord.customClaims?.impersonatedBy as string | undefined;
    }

    // Tier 3: audit_logs 폴백 (영구 claim 도입 이전 시작된 세션)
    if (!impersonatorUid) {
      // targetUid 단일 인덱스(자동)만 사용. 메모리에서 action·시각 필터링.
      const snap = await db.collection("audit_logs")
        .where("targetUid", "==", decoded.uid)
        .limit(50)
        .get();
      const logs = snap.docs
        .map((d) => d.data() as { action?: string; adminUid?: string; at?: FirebaseFirestore.Timestamp })
        .filter((l) => l.action === "impersonate:start" || l.action === "impersonate:revert");
      logs.sort((a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0));
      const mostRecent = logs[0];
      if (mostRecent?.action === "impersonate:start" && mostRecent.adminUid) {
        impersonatorUid = mostRecent.adminUid;
      }
    }

    if (!impersonatorUid) {
      return Response.json({ error: "임퍼소네이션 상태가 아닙니다." }, { status: 400 });
    }

    // 원본 관리자 존재 + 권한 검증 (오래된 audit log로 권한 잃은 계정 복귀 차단)
    const adminDoc = await db.collection("users").doc(impersonatorUid).get();
    if (!adminDoc.exists) {
      return Response.json({ error: "원본 관리자 계정을 찾을 수 없습니다." }, { status: 404 });
    }
    const role = adminDoc.data()?.role as string | undefined;
    if (role !== "president" && role !== "admin" && role !== "sysadmin") {
      return Response.json({ error: "복귀 권한이 없습니다." }, { status: 403 });
    }

    // 영구 customClaims에서 impersonatedBy 제거 (다음 로그인부터 배너 사라짐)
    try {
      const rec = userRecord ?? await adminAuth.getUser(decoded.uid);
      const claims = { ...(rec.customClaims ?? {}) };
      if (claims.impersonatedBy) {
        delete claims.impersonatedBy;
        await adminAuth.setCustomUserClaims(decoded.uid, Object.keys(claims).length > 0 ? claims : null);
      }
    } catch (e) {
      console.warn("[impersonate/revert] failed to clear customClaims:", e);
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
