import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // 공개 후기 엔드포인트 — IP 기반 레이트 리밋 적용
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimited = checkRateLimit(`review_${ip}`, { limit: 10, windowSec: 60 });
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const { seminarId, type, content, rating, authorId, authorName, studentId } = body as {
      seminarId: string;
      type: string;
      content: string;
      rating: number;
      authorId: string;
      authorName: string;
      studentId?: string;
    };

    if (!seminarId || !content || !authorName) {
      return Response.json({ error: "필수 항목 누락" }, { status: 400 });
    }

    // 입력 길이 검증
    if (content.length > 5000) {
      return Response.json({ error: "후기 내용은 5000자 이내여야 합니다." }, { status: 400 });
    }
    if (authorName.length > 100) {
      return Response.json({ error: "이름이 너무 깁니다." }, { status: 400 });
    }

    // rating 범위 검증 (M2 포함)
    const safeRating = Math.min(5, Math.max(1, Number(rating) || 5));

    const db = getAdminDb();
    const now = new Date().toISOString();
    const docRef = await db.collection("seminar_reviews").add({
      seminarId,
      type: type || "attendee",
      content: content.slice(0, 5000),
      rating: safeRating,
      authorId: authorId || `guest_${authorName}`,
      authorName: authorName.slice(0, 100),
      studentId: studentId || null,
      createdAt: now,
      updatedAt: now,
    });

    return Response.json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("[reviews API]", err);
    return Response.json({ error: "후기 등록에 실패했습니다." }, { status: 500 });
  }
}
