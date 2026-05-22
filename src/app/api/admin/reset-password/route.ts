import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminAuth } from "@/lib/firebase-admin";

/**
 * 운영 콘솔 — 회원 비밀번호를 아이디(학번)로 직접 초기화.
 * 재설정 이메일 발송이 아니라, Firebase Auth 비밀번호를 회원의 username(학번) 값으로 즉시 설정한다.
 * 운영진이 회원에게 직접 학번으로 로그인하도록 안내하는 용도.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";

    if (!email) {
      return Response.json({ error: "이메일이 필요합니다." }, { status: 400 });
    }
    if (!username) {
      return Response.json({ error: "아이디(학번)가 없는 회원입니다." }, { status: 400 });
    }
    // Firebase Auth 비밀번호 최소 길이 6자
    if (username.length < 6) {
      return Response.json(
        { error: "아이디(학번)가 6자 미만이라 임시 비밀번호로 사용할 수 없습니다." },
        { status: 400 },
      );
    }

    const adminAuth = getAdminAuth();
    const authUser = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(authUser.uid, { password: username });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[admin/reset-password] error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("auth/user-not-found")) {
      return Response.json({ error: "해당 이메일로 등록된 사용자가 없습니다." }, { status: 404 });
    }
    return Response.json({ error: "비밀번호 초기화에 실패했습니다." }, { status: 500 });
  }
}
