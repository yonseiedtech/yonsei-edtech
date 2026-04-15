import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username || username.length < 3) {
    return Response.json({ email: null });
  }

  try {
    const db = getAdminDb();
    // username 필드 매칭 우선
    let snap = await db.collection("users").where("username", "==", username).limit(1).get();
    if (snap.empty) {
      // studentId 필드 매칭 (구계정 호환)
      snap = await db.collection("users").where("studentId", "==", username).limit(1).get();
    }
    if (snap.empty) {
      return Response.json({ email: null });
    }
    const data = snap.docs[0].data() as { email?: string };
    return Response.json({ email: data.email ?? null });
  } catch (err) {
    console.error("[resolve-email]", err);
    return Response.json({ email: null }, { status: 500 });
  }
}
