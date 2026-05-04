import { NextRequest } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";

// Sprint 69 보안: 토큰이 있을 때만 검증 (게스트 후기 작성 호환)
// 반환값: { uid: string, role: string } | null (토큰 없거나 검증 실패)
async function verifyOptionalAuth(req: NextRequest): Promise<{ uid: string; role: string } | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();
    const role = (userDoc.data()?.role as string) ?? "member";
    return { uid: decoded.uid, role };
  } catch {
    return null;
  }
}

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
        })
        .map((r: Record<string, unknown>) => {
          // 연사 추천 정보는 운영진 전용 — 공개 API에서 제거
          const { recommendedTopics, recommendedSpeakers, ...rest } = r;
          return rest;
        });

      return Response.json({ data: reviews });
    } catch (err) {
      console.error("[reviews list]", err);
      return Response.json({ error: "후기 조회에 실패했습니다." }, { status: 500 });
    }
  }

  // 연사 토큰 인증 모드
  const token = req.nextUrl.searchParams.get("token");
  if (token) {
    try {
      const db = getAdminDb();
      const semDoc = await db.collection("seminars").doc(seminarId).get();
      if (!semDoc.exists || semDoc.data()?.speakerReviewToken !== token) {
        return Response.json({ verified: false, message: "유효하지 않은 연사 후기 링크입니다." });
      }

      // 이미 연사 후기 작성 여부 확인
      const reviewSnapshot = await db.collection("seminar_reviews")
        .where("seminarId", "==", seminarId)
        .where("type", "==", "speaker")
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
          recommendedTopics: data.recommendedTopics || null,
          recommendedSpeakers: data.recommendedSpeakers || null,
          createdAt: data.createdAt,
        };
      }

      const seminar = semDoc.data();
      return Response.json({
        verified: true,
        seminarTitle: seminar?.title,
        speakerName: seminar?.speaker,
        alreadyReviewed: !reviewSnapshot.empty,
        existingReview,
      });
    } catch (err) {
      console.error("[reviews speaker verify]", err);
      return Response.json({ error: "인증에 실패했습니다." }, { status: 500 });
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

  // Sprint 69 보안: 토큰이 있으면 검증 + authorId 위장 차단
  const auth = await verifyOptionalAuth(req);

  try {
    const body = await req.json();
    const { seminarId, type, content, rating, authorId, authorName, studentId, visibility, questionAnswers, recommendedTopics, recommendedSpeakers, speakerToken } = body as {
      seminarId: string;
      type: string;
      content: string;
      rating: number;
      authorId: string;
      authorName: string;
      studentId?: string;
      visibility?: string;
      questionAnswers?: Record<string, string>;
      recommendedTopics?: string;
      recommendedSpeakers?: string;
      speakerToken?: string;
    };
    // 보안: authorRole은 클라이언트가 지정 못 함 — 항상 서버에서 결정

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

    // 보안: 인증된 사용자면 authorId 가 token uid 와 일치해야 함 (다른 회원 위장 차단)
    if (auth && authorId && !authorId.startsWith("guest_") && authorId !== auth.uid) {
      return Response.json({ error: "본인의 후기만 작성할 수 있습니다." }, { status: 403 });
    }

    const db = getAdminDb();

    // 작성자가 staff 이상이면 자동으로 운영진 후기로 분류
    let resolvedType = type || "attendee";
    let resolvedAuthorRole: string | null = null;
    if (resolvedType === "attendee") {
      try {
        // 1차: userId로 매칭
        if (authorId && !authorId.startsWith("guest_")) {
          const userDoc = await db.collection("users").doc(authorId).get();
          if (userDoc.exists) {
            const userRole = userDoc.data()?.role as string | undefined;
            if (userRole && ["staff", "president", "admin"].includes(userRole)) {
              resolvedType = "staff";
              resolvedAuthorRole = userRole;
            }
          }
        }
        // 2차: 이름으로 매칭 (guest 포함)
        if (resolvedType === "attendee" && authorName) {
          const nameQuery = await db.collection("users")
            .where("name", "==", authorName)
            .where("role", "in", ["staff", "president", "admin"])
            .limit(1)
            .get();
          if (!nameQuery.empty) {
            const userRole = nameQuery.docs[0].data().role as string;
            resolvedType = "staff";
            resolvedAuthorRole = userRole;
          }
        }
      } catch {
        // 사용자 조회 실패 시 원래 type 유지
      }
    }

    // 연사 후기인 경우 토큰 검증
    if (type === "speaker") {
      if (!speakerToken) {
        return Response.json({ error: "연사 후기 토큰이 필요합니다." }, { status: 403 });
      }
      const semDoc = await db.collection("seminars").doc(seminarId).get();
      if (!semDoc.exists || semDoc.data()?.speakerReviewToken !== speakerToken) {
        return Response.json({ error: "유효하지 않은 연사 후기 토큰입니다." }, { status: 403 });
      }
    }

    // rating 범위 검증 (M2 포함)
    const safeRating = Math.min(5, Math.max(1, Number(rating) || 5));
    const now = new Date().toISOString();
    const docRef = await db.collection("seminar_reviews").add({
      seminarId,
      type: resolvedType,
      content: content.slice(0, 5000),
      rating: safeRating,
      authorId: authorId || `guest_${authorName}`,
      authorName: authorName.slice(0, 100),
      authorRole: resolvedAuthorRole,
      studentId: studentId || null,
      visibility: visibility || "public",
      status: "published",
      questionAnswers: questionAnswers || null,
      recommendedTopics: type === "speaker" && recommendedTopics ? recommendedTopics.slice(0, 2000) : null,
      recommendedSpeakers: type === "speaker" && recommendedSpeakers ? recommendedSpeakers.slice(0, 2000) : null,
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
    const { reviewId, content, rating, questionAnswers, authorId, recommendedTopics, recommendedSpeakers } = body as {
      reviewId: string;
      content: string;
      rating: number;
      questionAnswers?: Record<string, string>;
      authorId: string;
      recommendedTopics?: string;
      recommendedSpeakers?: string;
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
    const updateData: Record<string, unknown> = {
      content: content.slice(0, 5000),
      rating: safeRating,
      questionAnswers: questionAnswers || null,
      updatedAt: new Date().toISOString(),
    };
    // 연사 후기 추천 정보 업데이트
    if (doc.data()?.type === "speaker") {
      updateData.recommendedTopics = recommendedTopics ? recommendedTopics.slice(0, 2000) : null;
      updateData.recommendedSpeakers = recommendedSpeakers ? recommendedSpeakers.slice(0, 2000) : null;
    }
    await docRef.update(updateData);

    return Response.json({ success: true });
  } catch (err) {
    console.error("[reviews PATCH]", err);
    return Response.json({ error: "후기 수정에 실패했습니다." }, { status: 500 });
  }
}
