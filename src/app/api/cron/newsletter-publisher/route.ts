import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { Resend } from "resend";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 예약 발송 뉴스레터 자동 발행 Cron (매시간 실행)
 * publishAt <= now 인 draft 학회보를 찾아 이메일 발송 후 status를 published로 업데이트
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = new Date().toISOString();

  // draft 중 publishAt <= now 인 문서 조회
  const snapshot = await db
    .collection("newsletters")
    .where("status", "==", "draft")
    .get();

  const due = snapshot.docs.filter((d) => {
    const pa = d.data().publishAt as string | undefined;
    return pa && pa <= now;
  });

  if (due.length === 0) {
    return Response.json({ ok: true, published: 0 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resend = resendKey ? new Resend(resendKey) : null;

  // 승인된 전체 회원 이메일 조회
  const usersSnap = await db.collection("users").where("approved", "==", true).get();
  const emails: string[] = [];
  usersSnap.forEach((d) => {
    const email = d.data().email as string | undefined;
    if (email) emails.push(email);
  });

  let published = 0;
  const errors: string[] = [];

  for (const docSnap of due) {
    const issue = docSnap.data();
    const title = (issue.title as string) ?? "";
    const subtitle = (issue.subtitle as string) ?? "";
    const issueNumber = (issue.issueNumber as number) ?? 0;

    let sections: Array<{ title: string; type: string; authorName: string }> = [];
    if (typeof issue.sections === "string") {
      try { sections = JSON.parse(issue.sections); } catch { sections = []; }
    } else if (Array.isArray(issue.sections)) {
      sections = issue.sections as typeof sections;
    }

    // Sprint 69 핫픽스: 중복 발송 방지를 위한 낙관적 락
    // 발송 시작 전에 status='publishing' 으로 즉시 변경 → 다음 cron tick 재진입 차단
    // 발송 완료 후 'published' 로 최종 변경. 발송 중 실패해도 'publishing' 상태로 남아 재발송 안 됨.
    try {
      await db.collection("newsletters").doc(docSnap.id).update({
        status: "publishing",
        publishingStartedAt: new Date().toISOString(),
      });
    } catch (lockErr) {
      console.error("[cron/newsletter-publisher] lock failed:", docSnap.id, lockErr);
      errors.push(docSnap.id);
      continue;
    }

    try {
      // 이메일 발송
      if (resend && emails.length > 0) {
        const tocHtml = sections
          .map(
            (s, i) =>
              `<tr>
                <td style="padding:4px 8px;color:#888;font-size:13px;">${i + 1}.</td>
                <td style="padding:4px 8px;font-size:13px;">${escapeHtml(s.title)}</td>
                <td style="padding:4px 8px;color:#888;font-size:12px;">${escapeHtml(s.authorName)}</td>
              </tr>`,
          )
          .join("");

        const html = `
          <div style="font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;max-width:520px;margin:0 auto;background:#fff;">
            <div style="background:linear-gradient(135deg,#003876,#0066cc);padding:32px 24px;border-radius:12px 12px 0 0;">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.7);">연세교육공학회보</p>
              <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.5);">vol. ${issueNumber}</p>
              <h1 style="margin:16px 0 0;font-size:22px;font-weight:bold;color:#fff;">${escapeHtml(subtitle || title)}</h1>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 16px;font-size:14px;color:#333;">연세교육공학회보 제${issueNumber}호가 발행되었습니다.</p>
              ${sections.length > 0 ? `
              <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#333;">📋 목차</p>
                <table style="width:100%;border-collapse:collapse;">${tocHtml}</table>
              </div>` : ""}
              <a href="https://yonsei-edtech.vercel.app/newsletter"
                 style="display:inline-block;padding:12px 28px;background:#003876;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">
                학회보 읽기
              </a>
            </div>
            <div style="padding:16px 24px;border-top:1px solid #eee;">
              <p style="margin:0;font-size:11px;color:#999;">연세교육공학회 | yonsei.edtech@gmail.com<br/>이 메일은 연세교육공학회 회원에게 발송됩니다.</p>
            </div>
          </div>
        `;

        const BATCH_SIZE = 50;
        for (let i = 0; i < emails.length; i += BATCH_SIZE) {
          const batch = emails.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map((to) =>
              resend.emails.send({
                from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
                to,
                subject: `[연세교육공학회보] ${title}`,
                html,
              }),
            ),
          );
        }
      }

      // status → published, publishAt 제거
      await db.collection("newsletters").doc(docSnap.id).update({
        status: "published",
        publishAt: null,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Sprint 69 핫픽스: forEach + async (fire-and-forget) → for...of + chunked Promise.all
      // serverless 종료 후 dangling promise 방지 + 알림 누락 차단
      const NOTIF_CHUNK = 50;
      const userIds: string[] = [];
      usersSnap.forEach((u) => userIds.push(u.id));
      for (let i = 0; i < userIds.length; i += NOTIF_CHUNK) {
        const chunk = userIds.slice(i, i + NOTIF_CHUNK);
        await Promise.all(
          chunk.map((userId) =>
            db.collection("notifications").add({
              userId,
              type: "newsletter",
              title: "새 학회보가 발행되었습니다",
              message: `${title} (제${issueNumber}호)`,
              link: "/newsletter",
              read: false,
              createdAt: new Date().toISOString(),
            }).catch((e) => console.warn("[newsletter] notif failed", userId, e)),
          ),
        );
      }

      published++;
    } catch (err) {
      console.error("[cron/newsletter-publisher] issue", docSnap.id, err);
      errors.push(docSnap.id);
      // 실패 시 status='publishing' 그대로 유지 → 운영자가 수동 점검 후 재발행
      // (자동 retry 시 부분 발송된 회원에게 중복 발송 위험)
    }
  }

  return Response.json({ ok: true, published, errors });
}
