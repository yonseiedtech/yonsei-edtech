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
    // 2026-06-11 보안: raw email 반환 제거 — enumeration 시 회원 이메일 수집 표면 차단.
    // 현재 클라이언트 호출부 없음(grep 전수 확인). 향후 사용 시에도 마스킹만 노출하고
    // 실제 메일 발송은 서버 사이드에서 수행할 것.
    return Response.json({
      email: null,
      emailMasked: email ? maskEmail(email) : null,
    });
  } catch (err) {
    console.error("[resolve-email]", err);
    return Response.json({ email: null }, { status: 500 });
  }
}
