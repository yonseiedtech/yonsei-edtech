import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import { Timestamp } from "firebase-admin/firestore";

function tsToIso(v: unknown): string {
  if (typeof v === "string") return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v && typeof v === "object") {
    const o = v as { _seconds?: number; seconds?: number };
    const sec = o._seconds ?? o.seconds;
    if (typeof sec === "number") return new Date(sec * 1000).toISOString();
  }
  return "";
}

function normalizeDoc(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    createdAt: tsToIso(raw.createdAt) || raw.createdAt,
    updatedAt: tsToIso(raw.updatedAt) || raw.updatedAt,
  };
}

// ── GET /api/guide-chapters?guideId=xxx ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const guideId = req.nextUrl.searchParams.get("guideId");
  if (!guideId) return Response.json({ error: "guideId가 필요합니다." }, { status: 400 });

  // 인증 불필요(공개 가이드). visibility는 상위 learning_guides에서 처리.

  try {
    const db = getAdminDb();
    // orderBy 제거(복합 인덱스 회피) 후 메모리 정렬
    const snap = await db
      .collection("guide_chapters")
      .where("guideId", "==", guideId)
      .get();
    const data = snap.docs.map(
      (d) => ({ id: d.id, ...normalizeDoc(d.data() as Record<string, unknown>) }) as Record<string, unknown>,
    );
    data.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
    return Response.json({ data });
  } catch (err) {
    console.error("[guide-chapters GET]", err);
    return Response.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// ── POST /api/guide-chapters ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!body.guideId) return Response.json({ error: "guideId가 필요합니다." }, { status: 400 });

    const db = getAdminDb();
    const now = new Date().toISOString();

    // 가이드 소유권 확인
    const guideDoc = await db.collection("learning_guides").doc(body.guideId as string).get();
    if (!guideDoc.exists) return Response.json({ error: "가이드를 찾을 수 없습니다." }, { status: 404 });
    const guideData = guideDoc.data() as Record<string, unknown>;
    const isStaff = ROLE_HIERARCHY[authResult.role as keyof typeof ROLE_HIERARCHY] >= ROLE_HIERARCHY.staff;
    if (guideData.authorId !== authResult.uid && !isStaff) {
      return Response.json({ error: "권한이 부족합니다." }, { status: 403 });
    }

    // 다음 order 값 계산
    const existingSnap = await db
      .collection("guide_chapters")
      .where("guideId", "==", body.guideId)
      .get();
    const maxOrder = existingSnap.docs.reduce((max, d) => {
      const o = (d.data() as Record<string, unknown>).order as number ?? 0;
      return Math.max(max, o);
    }, -1);

    const ref = await db.collection("guide_chapters").add({
      ...body,
      order: body.order ?? maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    // 가이드 chapterCount 업데이트
    await db.collection("learning_guides").doc(body.guideId as string).update({
      chapterCount: existingSnap.size + 1,
      updatedAt: now,
    });

    const doc = await ref.get();
    return Response.json({ data: { id: doc.id, ...normalizeDoc(doc.data() as Record<string, unknown>) } });
  } catch (err) {
    console.error("[guide-chapters POST]", err);
    return Response.json({ error: "생성에 실패했습니다." }, { status: 500 });
  }
}
