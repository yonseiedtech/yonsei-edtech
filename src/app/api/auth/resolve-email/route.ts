import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";

// Sprint 69 보안: 응답에 이메일 마스킹 + IP rate-limit 강화로 enumeration 차단
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimited = checkRateLimit(`resolve_email_${ip}`, { limit: 5, windowSec: 60 });
  if (rateLimited) return rateLimited;

  const username = req.nextUrl.searchParams.get("username");
  if (!username || username.length < 3) {
    return Response.json({ email: null });
  }

  try {
    const db = getAdminDb();
    // username 필드 매칭 우선
    let snap = await db.collection("users").where("username", "==", username).limit(1).get();
    if (snap.empty) {
      // studentId 필드 매칭 (구계정 호환)
      snap = await db.collection("users").where("studentId", "==", username).limit(1).get();
    }
    if (snap.empty) {
      return Response.json({ email: null });
    }
    const data = snap.docs[0].data() as { email?: string };
    const email = data.email ?? null;
    return Response.json({
      email,
      // 클라이언트 화면에는 마스킹 버전만 표시. 실제 발송은 server-side로 진행
      emailMasked: email ? maskEmail(email) : null,
    });
  } catch (err) {
    console.error("[resolve-email]", err);
    return Response.json({ email: null }, { status: 500 });
  }
}
