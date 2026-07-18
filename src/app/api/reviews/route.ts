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

      // QA-v3 다중 연사: speakers[] 기반 명단 + ?speakerName= 본인 선택 + 연사별 기존 후기 매칭
      // (기존: 단일 speaker 필드 + docs[0] 고정이라 두 번째 연사가 첫 연사 후기를 덮어씀)
      const seminar = semDoc.data();
      const speakerNames: string[] = Array.isArray(seminar?.speakers)
        ? (seminar!.speakers as { name?: string }[]).map((sp) => sp?.name ?? "").filter(Boolean)
        : [];
      if (speakerNames.length === 0 && seminar?.speaker) speakerNames.push(seminar.speaker as string);

      const requestedName = req.nextUrl.searchParams.get("speakerName");
      const selected =
        requestedName && speakerNames.includes(requestedName)
          ? requestedName
          : speakerNames.length <= 1
            ? (speakerNames[0] ?? (seminar?.speaker as string | undefined) ?? null)
            : null;

      const reviewSnapshot = await db.collection("seminar_reviews")
        .where("seminarId", "==", seminarId)
        .where("type", "==", "speaker")
        .get();

      let existingReview = null;
      let matchedDoc = null;
      if (selected) {
        matchedDoc =
          reviewSnapshot.docs.find((d) => (d.data().authorName as string) === selected) ??
          // 레거시(단일 연사) 후기는 authorName 불일치 가능 — 단일 연사일 때만 첫 문서 폴백
          (speakerNames.length <= 1 ? reviewSnapshot.docs[0] : undefined) ??
          null;
      }
      if (matchedDoc) {
        const data = matchedDoc.data();
        existingReview = {
          id: matchedDoc.id,
          content: data.content,
          rating: data.rating,
          questionAnswers: data.questionAnswers || null,
          recommendedTopics: data.recommendedTopics || null,
          recommendedSpeakers: data.recommendedSpeakers || null,
          createdAt: data.createdAt,
        };
      }

      return Response.json({
        verified: true,
        seminarTitle: seminar?.title,
        speakerName: selected,
        speakers: speakerNames,
        alreadyReviewed: !!matchedDoc,
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
        // (v5-M7 감사 B) 이름 기반 2차 매칭 제거 — 비로그인 게스트가 운영진 실명을
        // 입력하면 "운영진 후기"로 표기되는 표시상 사칭 벡터였다. 운영진 판별은
        // 위의 인증 uid 기반 1차 매칭만 신뢰한다.
      } catch {
        // 사용자 조회 실패 시 원래 type 유지
      }
    }

    // 연사 후기인 경우 토큰 검증 + 다중 연사 명단·중복 검증 (QA-v3)
    if (type === "speaker") {
      if (!speakerToken) {
        return Response.json({ error: "연사 후기 토큰이 필요합니다." }, { status: 403 });
      }
      const semDoc = await db.collection("seminars").doc(seminarId).get();
      if (!semDoc.exists || semDoc.data()?.speakerReviewToken !== speakerToken) {
        return Response.json({ error: "유효하지 않은 연사 후기 토큰입니다." }, { status: 403 });
      }
      const semData = semDoc.data();
      const validNames: string[] = Array.isArray(semData?.speakers)
        ? (semData!.speakers as { name?: string }[]).map((sp) => sp?.name ?? "").filter(Boolean)
        : [];
      if (validNames.length === 0 && semData?.speaker) validNames.push(semData.speaker as string);
      if (validNames.length > 0 && !validNames.includes(authorName)) {
        return Response.json({ error: "등록된 연사 명단에 없는 이름입니다." }, { status: 400 });
      }
      // 연사별 1회 — 같은 연사의 후기가 이미 있으면 새로 만들지 않음 (수정 흐름으로 유도)
      const dup = await db
        .collection("seminar_reviews")
        .where("seminarId", "==", seminarId)
        .where("type", "==", "speaker")
        .where("authorName", "==", authorName)
        .limit(1)
        .get();
      if (!dup.empty) {
        return Response.json(
          { error: "이미 이 연사의 후기가 등록되어 있습니다. 링크로 다시 접속하면 수정할 수 있어요.", alreadyReviewed: true },
          { status: 409 },
        );
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
      // QA-v3: 연사 후기는 연사별 결정적 ID 를 서버가 강제 (다중 연사 충돌·클라이언트 위조 방지)
      authorId: type === "speaker" ? `speaker_${seminarId}__${authorName.slice(0, 60)}` : (authorId || `guest_${authorName}`),
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

  // Sprint 보안: 토큰이 있을 때만 검증 (회원 후기 스푸핑 차단). 게스트 후기는 호환 유지.
  const auth = await verifyOptionalAuth(req);

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

    // 본인 확인 (보안 강화):
    // - 회원 후기(authorId가 guest_ 접두사 아님): 반드시 토큰 uid와 일치해야 함 (클라이언트 위장 차단)
    // - 게스트 후기(guest_*): 기존 방식 유지 (authorId 일치만 확인, 호환성)
    const docAuthorId = doc.data()?.authorId as string | undefined;
    const isGuestReview = docAuthorId?.startsWith("guest_") ?? false;
    const isSpeakerReview = docAuthorId?.startsWith("speaker_") ?? false;

    if (isSpeakerReview) {
      // QA-v3: 연사 후기 수정은 세미나 토큰으로 본인 확인
      // (기존엔 회원 분기로 빠져 uid 비교 → 연사 수정이 항상 401/403 이던 잠복 결함)
      const speakerToken = (body as { speakerToken?: string }).speakerToken;
      const docSeminarId = doc.data()?.seminarId as string | undefined;
      if (!speakerToken || !docSeminarId) {
        return Response.json({ error: "연사 후기 토큰이 필요합니다." }, { status: 403 });
      }
      const semDoc = await db.collection("seminars").doc(docSeminarId).get();
      if (!semDoc.exists || semDoc.data()?.speakerReviewToken !== speakerToken) {
        return Response.json({ error: "유효하지 않은 연사 후기 토큰입니다." }, { status: 403 });
      }
    } else if (!isGuestReview) {
      // 회원 후기는 인증 토큰 필수
      if (!auth) {
        return Response.json({ error: "회원 후기 수정은 로그인이 필요합니다." }, { status: 401 });
      }
      if (docAuthorId !== auth.uid) {
        return Response.json({ error: "본인의 후기만 수정할 수 있습니다." }, { status: 403 });
      }
    } else {
      // 게스트 후기: authorId 일치 (기존 호환)
      if (docAuthorId !== authorId) {
        return Response.json({ error: "본인의 후기만 수정할 수 있습니다." }, { status: 403 });
      }
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
