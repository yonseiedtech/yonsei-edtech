import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

// Sprint 69: brute-force 비용 상승을 위한 rate-limit 대폭 강화
// 30분 5회. securityAnswerHash 가 sha256(salt 미적용) 인 동안 leak 시 피해 최소화.
// TODO: 별도 sprint 에서 PBKDF2/scrypt + per-user salt 마이그레이션.
const bucket = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 5;
const WINDOW_MS = 30 * 60_000;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = bucket.get(key);
  if (!entry || entry.resetAt < now) {
    bucket.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  if (entry.count > LIMIT) return false;
  return true;
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function POST(req: NextRequest) {
  // Sprint 69: 응답 지연 1.5s — 자동화된 brute-force 비용 상승 (정상 사용자 UX 영향 미미)
  await new Promise((r) => setTimeout(r, 1500));

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  let body: {
    name?: string;
    username?: string;
    birthDate?: string;
    answer?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const { name, username, birthDate, answer } = body;
  if (!name || !username || !birthDate || !answer) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const rateKey = `${ip}:${username}`;
  if (!rateLimit(rateKey)) {
    return Response.json({ ok: false, rateLimited: true }, { status: 429 });
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

    const expected = user.securityAnswerHash as string | undefined;
    if (!expected) {
      return Response.json({ ok: false }, { status: 401 });
    }

    const provided = sha256Hex(answer.trim().toLowerCase());
    if (provided !== expected) {
      return Response.json({ ok: false }, { status: 401 });
    }

    // 재설정 링크 생성 + 이메일 발송
    const email = user.email as string | undefined;
    if (!email) {
      return Response.json({ ok: false }, { status: 500 });
    }

    const adminAuth = getAdminAuth();
    const link = await adminAuth.generatePasswordResetLink(email);

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
        to: email,
        subject: "[연세교육공학회] 비밀번호 재설정 안내",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #003876;">연세교육공학회</h2>
            <p>안녕하세요,</p>
            <p>비밀번호 찾기 본인 확인이 완료되어 재설정 링크를 보내드립니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>
            <a href="${link.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"
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

    return Response.json({ ok: true, sent: !!resendKey });
  } catch (err) {
    console.error("[forgot-password/answer]", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
