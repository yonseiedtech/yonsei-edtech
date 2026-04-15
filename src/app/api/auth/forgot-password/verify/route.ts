import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  // 응답 시간 일정화
  await new Promise((r) => setTimeout(r, 300));

  let body: { name?: string; username?: string; birthDate?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const { name, username, birthDate } = body;
  if (!name || !username || !birthDate) {
    return Response.json({ ok: false }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snap = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (snap.empty) {
      return Response.json({ ok: false }, { status: 401 });
    }

    const user = snap.docs[0].data();
    if (
      (user.name || "").trim() !== name.trim() ||
      (user.birthDate || "") !== birthDate
    ) {
      return Response.json({ ok: false }, { status: 401 });
    }

    if (!user.securityQuestion) {
      return Response.json({ ok: false }, { status: 401 });
    }

    return Response.json({ ok: true, securityQuestion: user.securityQuestion });
  } catch (err) {
    console.error("[forgot-password/verify]", err);
    return Response.json({ ok: false }, { status: 401 });
  }
}
