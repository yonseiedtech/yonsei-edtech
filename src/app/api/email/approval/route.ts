import { NextRequest } from "next/server";
import { Resend } from "resend";
import { requireAuth } from "@/lib/api-auth";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  let email: string, name: string, approved: boolean;
  try {
    const body = await req.json();
    email = body.email;
    name = body.name;
    approved = body.approved;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!email) {
    return Response.json({ error: "이메일이 필요합니다." }, { status: 400 });
  }

  const resend = getResend();
  if (!resend) {
    // Resend 미설정 시 조용히 스킵 (개발 환경)
    return Response.json({ sent: false, reason: "RESEND_API_KEY not configured" });
  }

  try {
    if (approved) {
      await resend.emails.send({
        from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
        to: email,
        subject: "[연세교육공학회] 회원 가입이 승인되었습니다",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #003876;">연세교육공학회</h2>
            <p>${name || "회원"}님, 안녕하세요!</p>
            <p>가입 신청이 <strong>승인</strong>되었습니다. 이제 로그인하여 학회 활동에 참여하실 수 있습니다.</p>
            <a href="https://yonsei-edtech.vercel.app/login"
               style="display: inline-block; margin: 16px 0; padding: 12px 24px;
                      background: #003876; color: white; text-decoration: none;
                      border-radius: 8px; font-weight: bold;">
              로그인하기
            </a>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">
              연세교육공학회 | yonsei.edtech@gmail.com
            </p>
          </div>
        `,
      });
    } else {
      await resend.emails.send({
        from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
        to: email,
        subject: "[연세교육공학회] 회원 가입 안내",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #003876;">연세교육공학회</h2>
            <p>${name || "회원"}님, 안녕하세요.</p>
            <p>가입 신청이 반려되었습니다. 자세한 사항은 아래 이메일로 문의해주세요.</p>
            <p style="margin-top: 16px;">
              <a href="mailto:yonsei.edtech@gmail.com" style="color: #003876;">
                yonsei.edtech@gmail.com
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">
              연세교육공학회 | yonsei.edtech@gmail.com
            </p>
          </div>
        `,
      });
    }

    return Response.json({ sent: true });
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return Response.json({ error: "이메일 발송에 실패했습니다." }, { status: 500 });
  }
}
