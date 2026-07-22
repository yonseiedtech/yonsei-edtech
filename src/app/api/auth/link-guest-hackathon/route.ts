import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { HACKATHON_CONTEXT_ID } from "@/features/hackathon/config";

/**
 * POST /api/auth/link-guest-hackathon — 비회원 해커톤 신청 → 로그인 회원 자동 연결.
 *
 * 인증 필요. 인증된 사용자의 이메일로 comm_questions 중
 * contextId == HACKATHON_CONTEXT_ID && guestEmail == userEmail 인 게스트 신청을 찾아
 * authorId 를 uid 로 채운다 (authorName/guestName 유지, guestEmail 제거 — PII 최소화).
 *
 * Admin SDK 를 사용하므로 Firestore rules 의 authorId 소유자 검증을 우회한다(필요).
 * 멱등: authorId 가 이미 있으면 skip.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const uid = authResult.uid;

  const db = getAdminDb();

  // 인증 사용자의 이메일 취득 — users 프로필 우선, 토큰 폴백
  let email = "";
  try {
    const userSnap = await db.collection("users").doc(uid).get();
    const u = userSnap.data() as Record<string, unknown> | undefined;
    email = ((u?.email as string | undefined) ?? authResult.email ?? "")
      .trim()
      .toLowerCase();
  } catch {
    email = (authResult.email ?? "").trim().toLowerCase();
  }

  if (!email) return NextResponse.json({ linked: 0 });

  try {
    const snap = await db
      .collection("comm_questions")
      .where("contextId", "==", HACKATHON_CONTEXT_ID)
      .where("guestEmail", "==", email)
      .get();

    if (snap.empty) return NextResponse.json({ linked: 0 });

    const nowIso = new Date().toISOString();
    const batch = db.batch();
    let linked = 0;

    for (const d of snap.docs) {
      const data = d.data();
      // 멱등: 이미 연결된 문서는 skip
      if (data.authorId) continue;
      batch.update(d.ref, {
        authorId: uid,
        guestEmail: FieldValue.delete(), // PII 제거
        updatedAt: nowIso,
      });
      linked += 1;
    }

    if (linked > 0) await batch.commit();
    return NextResponse.json({ linked });
  } catch (err) {
    console.error("[/api/auth/link-guest-hackathon]", err);
    return NextResponse.json(
      { error: "연동에 실패했습니다." },
      { status: 500 },
    );
  }
}
