import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

/**
 * POST /api/auth/heartbeat — 레거시(doc id≠uid) 회원의 lastLoginAt 갱신 서버 폴백.
 *
 * 배경: 클라이언트 SDK의 profilesApi.update 는 firestore.rules isOwner(docId==uid) 검사를
 * 통과해야 한다. CSV 임포트 회원은 Firestore doc id 가 Firebase UID 와 다르므로 영구 거부됨.
 * AuthProvider 의 .catch 가 이 엔드포인트를 호출해 Admin SDK 경유로 규칙 우회.
 *
 * 인증: requireAuth/verifyAuth 미사용 — 두 함수는 users 문서를 uid 로 직접 조회(doc(uid).get)
 *       하므로 레거시 회원은 문서 미존재 → null 반환 → 401 이 된다. 대신 getAdminAuth()로
 *       토큰만 검증하고, 문서 탐색·갱신은 아래 3단계 로직이 담당한다.
 *
 * 보안: 토큰의 uid/email 에 매칭되는 문서만 갱신. 임의 대상 갱신 불가(매칭 조건이 보장).
 *       다중 매칭 시 첫 1건만 갱신 + 경고 로그.
 *
 * Rate: 클라이언트가 profilesApi.update 실패 시에만 호출 → 하루 최대 1회/사용자(저빈도).
 *       별도 서버 스로틀 미적용(스로틀 비용이 이득을 상회하지 않는다).
 */
export async function POST(req: NextRequest) {
  // ── 1. 토큰 검증 ─────────────────────────────────────────────────────────
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const rawToken = header.slice(7);

  let uid: string;
  let tokenEmail: string | undefined;
  try {
    const decoded = await getAdminAuth().verifyIdToken(rawToken);
    uid = decoded.uid;
    tokenEmail = decoded.email?.toLowerCase();
  } catch {
    return NextResponse.json({ error: "토큰 검증 실패." }, { status: 401 });
  }

  // ── 2. 문서 탐색 (① doc id == uid → ② uid 필드 == uid → ③ email 매칭) ──
  const db = getAdminDb();
  let matchedRef: FirebaseFirestore.DocumentReference | null = null;
  let matchMethod = "";

  // ① doc id == uid (정상 회원 경로 — 빠른 반환)
  const directSnap = await db.collection("users").doc(uid).get();
  if (directSnap.exists) {
    matchedRef = directSnap.ref;
    matchMethod = "doc-id";
  }

  // ② uid 필드 == uid (레거시 회원이 uid 필드를 별도 보유하는 경우)
  if (!matchedRef) {
    const byUid = await db.collection("users").where("uid", "==", uid).limit(2).get();
    if (!byUid.empty) {
      if (byUid.size > 1) {
        console.warn("[heartbeat] uid 필드 다중 매칭 — 첫 1건만 갱신. uid:", uid);
      }
      matchedRef = byUid.docs[0].ref;
      matchMethod = "uid-field";
    }
  }

  // ③ email == 토큰 email (소문자 비교 — CSV 임포트 계정 최종 폴백)
  if (!matchedRef && tokenEmail) {
    const byEmail = await db
      .collection("users")
      .where("email", "==", tokenEmail)
      .limit(2)
      .get();
    if (!byEmail.empty) {
      if (byEmail.size > 1) {
        console.warn("[heartbeat] email 다중 매칭 — 첫 1건만 갱신. email:", tokenEmail);
      }
      matchedRef = byEmail.docs[0].ref;
      matchMethod = "email";
    }
  }

  if (!matchedRef) {
    // Auth 계정만 있고 users 문서가 없는 엣지 케이스
    return NextResponse.json({ updated: false, reason: "user-not-found" });
  }

  // ── 3. lastLoginAt 갱신 (본인 문서만 — 탐색 조건이 보장) ─────────────────
  await matchedRef.update({ lastLoginAt: new Date().toISOString() });

  return NextResponse.json({ updated: true, method: matchMethod });
}
