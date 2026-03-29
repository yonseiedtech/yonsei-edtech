import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";

// 후기 목록 조회 또는 참석자 인증 API
export async function GET(req: NextRequest) {
  const seminarId = req.nextUrl.searchParams.get("seminarId");
  const mode = req.nextUrl.searchParams.get("mode");
  const name = req.nextUrl.searchParams.get("name");
  const studentId = req.nextUrl.searchParams.get("studentId");

  if (!seminarId) {
    return Response.json({ error: "세미나 ID가 필요합니다." }, { status: 400 });
  }

  // mode=list: 후기 목록 반환 (공개, published만)
  if (mode === "list") {
    try {
      const db = getAdminDb();
      const snapshot = await db.collection("seminar_reviews")
        .where("seminarId", "==", seminarId)
        .get();

      const reviews = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r: Record<string, unknown>) => {
          const status = (r.status as string) ?? "published";
          const visibility = (r.visibility as string) ?? "public";
          if (status === "hidden") return false;
          if (r.type === "staff" && visibility !== "public") return false;
          return true;
        });

      return Response.json({ data: reviews });
    } catch (err) {
      console.error("[reviews list]", err);
      return Response.json({ error: "후기 조회에 실패했습니다." }, { status: 500 });
    }
  }

  // 참석자 인증 모드
  if (!name) {
    return Response.json({ error: "세미나 ID와 이름이 필요합니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection("seminar_attendees")
      .where("seminarId", "==", seminarId)
      .get();

    const attendees = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as {
      id: string; userName: string; studentId?: string; userId?: string;
    }[];

    // 학번 + 이름 매칭 우선, 없으면 이름만 매칭
    let match = studentId
      ? attendees.find((a) => a.studentId === studentId && a.userName === name)
      : undefined;
    if (!match && studentId) {
      match = attendees.find((a) => a.studentId === studentId);
    }
    if (!match) {
      match = attendees.find((a) => a.userName === name);
    }

    if (!match) {
      return Response.json({ verified: false, message: "참석자 목록에서 확인되지 않았습니다." });
    }

    // 이미 후기 작성 여부 확인 + 기존 후기 데이터 반환
    const authorId = match.userId || `guest_${name}`;
    const reviewSnapshot = await db.collection("seminar_reviews")
      .where("seminarId", "==", seminarId)
      .where("authorId", "==", authorId)
      .where("type", "==", "attendee")
      .get();

    let existingReview = null;
    if (!reviewSnapshot.empty) {
      const doc = reviewSnapshot.docs[0];
      const data = doc.data();
      existingReview = {
        id: doc.id,
        content: data.content,
        rating: data.rating,
        questionAnswers: data.questionAnswers || null,
        createdAt: data.createdAt,
      };
    }

    return Response.json({
      verified: true,
      attendee: { name: match.userName, studentId: match.studentId, userId: match.userId },
      alreadyReviewed: !reviewSnapshot.empty,
      existingReview,
    });
  } catch (err) {
    console.error("[reviews verify]", err);
    return Response.json({ error: "인증에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // 공개 후기 엔드포인트 — IP 기반 레이트 리밋 적용
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimited = checkRateLimit(`review_${ip}`, { limit: 10, windowSec: 60 });
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const { seminarId, type, content, rating, authorId, authorName, studentId, visibility, questionAnswers } = body as {
      seminarId: string;
      type: string;
      content: string;
      rating: number;
      authorId: string;
      authorName: string;
      studentId?: string;
      visibility?: string;
      questionAnswers?: Record<string, string>;
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
      visibility: visibility || "public",
      status: "published",
      questionAnswers: questionAnswers || null,
      createdAt: now,
      updatedAt: now,
    });

    return Response.json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("[reviews API]", err);
    return Response.json({ error: "후기 등록에 실패했습니다." }, { status: 500 });
  }
}

// 후기 수정 API
export async function PATCH(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimited = checkRateLimit(`review_patch_${ip}`, { limit: 10, windowSec: 60 });
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const { reviewId, content, rating, questionAnswers, authorId } = body as {
      reviewId: string;
      content: string;
      rating: number;
      questionAnswers?: Record<string, string>;
      authorId: string;
    };

    if (!reviewId || !content || !authorId) {
      return Response.json({ error: "필수 항목 누락" }, { status: 400 });
    }
    if (content.length > 5000) {
      return Response.json({ error: "후기 내용은 5000자 이내여야 합니다." }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection("seminar_reviews").doc(reviewId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return Response.json({ error: "후기를 찾을 수 없습니다." }, { status: 404 });
    }

    // 본인 확인
    if (doc.data()?.authorId !== authorId) {
      return Response.json({ error: "본인의 후기만 수정할 수 있습니다." }, { status: 403 });
    }

    const safeRating = Math.min(5, Math.max(1, Number(rating) || 5));
    await docRef.update({
      content: content.slice(0, 5000),
      rating: safeRating,
      questionAnswers: questionAnswers || null,
      updatedAt: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[reviews PATCH]", err);
    return Response.json({ error: "후기 수정에 실패했습니다." }, { status: 500 });
  }
}
