import { NextRequest } from "next/server";
import { Resend } from "resend";
import { requireAuth } from "@/lib/api-auth";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  let email: string, name: string, message: string, reply: string;
  try {
    const body = await req.json();
    email = body.email;
    name = body.name;
    message = body.message;
    reply = body.reply;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!email || !reply) {
    return Response.json(
      { error: "이메일과 답변 내용이 필요합니다." },
      { status: 400 },
    );
  }

  const resend = getResend();
  if (!resend) {
    return Response.json({ sent: false, reason: "RESEND_API_KEY not configured" });
  }

  try {
    await resend.emails.send({
      from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
      to: email,
      subject: "[연세교육공학회] 문의에 대한 답변입니다",
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #003876;">연세교육공학회</h2>
          <p>${escapeHtml(name || "회원")}님, 안녕하세요.</p>
          <p>보내주신 문의에 답변 드립니다.</p>

          <div style="margin: 20px 0; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #888;">문의 내용</p>
            <p style="margin: 0; color: #333;">${escapeHtml(message || "").replace(/\n/g, "<br />")}</p>
          </div>

          <div style="margin: 20px 0; padding: 16px; background: #eef3ff; border-left: 4px solid #003876; border-radius: 4px;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #003876; font-weight: bold;">답변</p>
            <p style="margin: 0; color: #333; line-height: 1.7;">${escapeHtml(reply).replace(/\n/g, "<br />")}</p>
          </div>

          <p style="margin-top: 24px; color: #666; font-size: 13px;">
            추가 문의 사항이 있으시면 아래 이메일로 연락해주세요.
          </p>
          <p>
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

    return Response.json({ sent: true });
  } catch (err) {
    console.error("[email] Failed to send inquiry reply:", err);
    return Response.json(
      { error: "이메일 발송에 실패했습니다." },
      { status: 500 },
    );
  }
}
