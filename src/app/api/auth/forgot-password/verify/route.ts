import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { forgotPasswordVerifySchema } from "@/lib/api-validators";

export async function POST(req: NextRequest) {
  // 응답 시간 일정화
  await new Promise((r) => setTimeout(r, 300));

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  // 보안 응답 통일 — schema 실패 시 401 (입력 형식까지 노출 안 함)
  const parsed = forgotPasswordVerifySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const { name, username, birthDate } = parsed.data;

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
