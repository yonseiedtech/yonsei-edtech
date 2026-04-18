import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  buildCertificateHtml,
  buildCertificateEmailHtml,
  buildCertificateEmailSubject,
} from "@/features/certificates/buildCertificateHtml";
import type { Certificate } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface EmailRequestBody {
  /** 명시적으로 발송할 cert id 배열 (우선순위 1) */
  certificateIds?: string[];
  /** 또는 세미나 단위로 일괄 (cert type 필터 가능) */
  seminarId?: string;
  type?: Certificate["type"];
  /** true면 이미 발송된 cert도 재발송 */
  force?: boolean;
}

interface SendResult {
  certId: string;
  recipientName: string;
  recipientEmail: string;
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFrom(): string {
  return process.env.RESEND_FROM || "연세교육공학회 <noreply@yonsei-edtech.com>";
}

async function generatePdfBuffer(req: NextRequest, cert: Certificate): Promise<Buffer> {
  const html = buildCertificateHtml(cert);
  const fileName = `certificate-${cert.certificateNo || cert.id}.pdf`;
  const origin = req.nextUrl.origin;
  const res = await fetch(`${origin}/api/certificates/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, fileName }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`PDF 생성 실패: ${res.status} ${detail.slice(0, 200)}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "staff");
  if (auth instanceof NextResponse) return auth;

  let body: EmailRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { error: "RESEND_API_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  // 1) cert 목록 로딩
  const db = getAdminDb();
  let certs: Certificate[] = [];
  try {
    if (body.certificateIds && body.certificateIds.length > 0) {
      const ids = body.certificateIds.slice(0, 100);
      const reads = await Promise.all(
        ids.map((id) => db.collection("certificates").doc(id).get()),
      );
      certs = reads
        .filter((s) => s.exists)
        .map((s) => ({ id: s.id, ...(s.data() as Record<string, unknown>) } as Certificate));
    } else if (body.seminarId) {
      let q = db.collection("certificates").where("seminarId", "==", body.seminarId);
      if (body.type) q = q.where("type", "==", body.type);
      const snap = await q.get();
      certs = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as Certificate),
      );
    } else {
      return NextResponse.json(
        { error: "certificateIds 또는 seminarId가 필요합니다." },
        { status: 400 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "수료증 조회 실패", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  if (certs.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0, results: [] });
  }

  // 2) 순차 발송 (Puppeteer 콜드스타트 부하 분산 + Resend rate limit 고려)
  const results: SendResult[] = [];
  let sent = 0,
    failed = 0,
    skipped = 0;
  const from = getFrom();

  for (const cert of certs) {
    const certId = cert.id;
    const recipientName = cert.recipientName || "";
    const recipientEmail = (cert.recipientEmail || "").trim();

    if (!recipientEmail) {
      results.push({
        certId,
        recipientName,
        recipientEmail: "",
        ok: false,
        error: "수신자 이메일 없음",
      });
      failed += 1;
      continue;
    }

    if (cert.emailSent && !body.force) {
      results.push({
        certId,
        recipientName,
        recipientEmail,
        ok: true,
        skipped: true,
      });
      skipped += 1;
      continue;
    }

    try {
      const pdf = await generatePdfBuffer(req, cert);
      const filename = `certificate-${cert.certificateNo || cert.id}.pdf`;
      const html = buildCertificateEmailHtml(cert, { siteUrl: req.nextUrl.origin });
      const subject = buildCertificateEmailSubject(cert);

      const send = await resend.emails.send({
        from,
        to: recipientEmail,
        subject,
        html,
        attachments: [{ filename, content: pdf }],
      });

      if (send.error) {
        throw new Error(send.error.message || "Resend 발송 실패");
      }

      // Firestore 갱신
      const nowIso = new Date().toISOString();
      await db
        .collection("certificates")
        .doc(certId)
        .update({
          emailSent: nowIso,
          emailFailedAt: null,
          emailError: null,
        })
        .catch(() => null);

      results.push({ certId, recipientName, recipientEmail, ok: true });
      sent += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const nowIso = new Date().toISOString();
      await db
        .collection("certificates")
        .doc(certId)
        .update({
          emailFailedAt: nowIso,
          emailError: msg.slice(0, 500),
        })
        .catch(() => null);
      results.push({ certId, recipientName, recipientEmail, ok: false, error: msg });
      failed += 1;
    }

    // Resend rate-limit 보호 (free 100/day, paid 더 큼) — 짧은 sleep
    await new Promise((r) => setTimeout(r, 250));
  }

  return NextResponse.json({
    sent,
    failed,
    skipped,
    total: certs.length,
    results,
  });
}
