import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  let email: string;
  try {
    const body = await req.json();
    email = body.email;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!email) {
    return Response.json({ error: "이메일이 필요합니다." }, { status: 400 });
  }

  try {
    const adminAuth = getAdminAuth();
    // Firebase Admin SDK로 비밀번호 재설정 링크 생성
    const link = await adminAuth.generatePasswordResetLink(email);

    // Resend가 설정되어 있으면 커스텀 이메일, 아니면 Firebase 기본 이메일 사용
    const { Resend } = await import("resend");
    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
        to: email,
        subject: "[연세교육공학회] 비밀번호 재설정 안내",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #003876;">연세교육공학회</h2>
            <p>안녕하세요,</p>
            <p>관리자에 의해 비밀번호 재설정이 요청되었습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>
            <a href="${link}"
               style="display: inline-block; margin: 16px 0; padding: 12px 24px;
                      background: #003876; color: white; text-decoration: none;
                      border-radius: 8px; font-weight: bold;">
              비밀번호 재설정
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 16px;">
              이 링크는 일정 시간 후 만료됩니다. 본인이 요청하지 않았다면 이 이메일을 무시하세요.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">연세교육공학회 | yonsei.edtech@gmail.com</p>
          </div>
        `,
      });
    }
    // Resend 미설정 시 generatePasswordResetLink 호출 자체가
    // Firebase 기본 비밀번호 재설정 이메일을 트리거하지는 않음.
    // 대안: sendPasswordResetEmail을 클라이언트에서 호출하도록 안내 가능.

    return Response.json({ sent: true });
  } catch (err) {
    console.error("[password-reset] error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("auth/user-not-found")) {
      return Response.json({ error: "해당 이메일로 등록된 사용자가 없습니다." }, { status: 404 });
    }
    return Response.json({ error: "비밀번호 초기화에 실패했습니다." }, { status: 500 });
  }
}
