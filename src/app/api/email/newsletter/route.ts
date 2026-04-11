import { NextRequest } from "next/server";
import { Resend } from "resend";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

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

  let title: string, subtitle: string, issueNumber: number, sections: { title: string; type: string; authorName: string }[];
  try {
    const body = await req.json();
    title = body.title;
    subtitle = body.subtitle;
    issueNumber = body.issueNumber;
    sections = body.sections ?? [];
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!title) {
    return Response.json({ error: "제목이 필요합니다." }, { status: 400 });
  }

  const resend = getResend();
  if (!resend) {
    return Response.json({ sent: false, reason: "RESEND_API_KEY not configured" });
  }

  // 승인된 전체 회원 이메일 조회
  try {
    const db = getAdminDb();
    const usersSnapshot = await db
      .collection("users")
      .where("approved", "==", true)
      .get();

    const emails: string[] = [];
    usersSnapshot.forEach((doc) => {
      const email = doc.data().email;
      if (email) emails.push(email);
    });

    if (emails.length === 0) {
      return Response.json({ sent: false, reason: "발송 대상 이메일이 없습니다." });
    }

    // 목차 HTML 생성
    const tocHtml = sections
      .map(
        (s, i) =>
          `<tr>
            <td style="padding:4px 8px;color:#888;font-size:13px;">${i + 1}.</td>
            <td style="padding:4px 8px;font-size:13px;">${escapeHtml(s.title)}</td>
            <td style="padding:4px 8px;color:#888;font-size:12px;">${escapeHtml(s.authorName)}</td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;max-width:520px;margin:0 auto;background:#fff;">
        <!-- 헤더 -->
        <div style="background:linear-gradient(135deg,#003876,#0066cc);padding:32px 24px;border-radius:12px 12px 0 0;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.7);">연세교육공학회보</p>
          <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.5);">vol. ${issueNumber}</p>
          <h1 style="margin:16px 0 0;font-size:22px;font-weight:bold;color:#fff;">${escapeHtml(subtitle || title)}</h1>
        </div>

        <!-- 본문 -->
        <div style="padding:24px;">
          <p style="margin:0 0 16px;font-size:14px;color:#333;">
            연세교육공학회보 제${issueNumber}호가 발행되었습니다.
          </p>

          ${sections.length > 0 ? `
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#333;">📋 목차</p>
            <table style="width:100%;border-collapse:collapse;">${tocHtml}</table>
          </div>
          ` : ""}

          <a href="https://yonsei-edtech.vercel.app/newsletter"
             style="display:inline-block;padding:12px 28px;background:#003876;color:#fff;
                    text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
            학회보 읽기
          </a>
        </div>

        <!-- 푸터 -->
        <div style="padding:16px 24px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#999;">
            연세교육공학회 | yonsei.edtech@gmail.com<br/>
            이 메일은 연세교육공학회 회원에게 발송됩니다.
          </p>
        </div>
      </div>
    `;

    // Resend batch: 최대 100명씩 나눠 발송
    const BATCH_SIZE = 50;
    let sentCount = 0;
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((to) =>
          resend.emails.send({
            from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
            to,
            subject: `[연세교육공학회보] ${title}`,
            html,
          })
        )
      );
      sentCount += batch.length;
    }

    return Response.json({ sent: true, count: sentCount });
  } catch (err) {
    console.error("[email/newsletter] Failed:", err);
    return Response.json(
      { error: "이메일 발송에 실패했습니다." },
      { status: 500 }
    );
  }
}
