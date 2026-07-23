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

// ── GET /api/guide-pages?guideId=xxx&chapterId=xxx ───────────────────────────
export async function GET(req: NextRequest) {
  const guideId = req.nextUrl.searchParams.get("guideId");
  const chapterId = req.nextUrl.searchParams.get("chapterId");

  if (!guideId && !chapterId) {
    return Response.json({ error: "guideId 또는 chapterId가 필요합니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    // orderBy 제거(복합 인덱스 회피) 후 메모리 정렬
    const snap = chapterId
      ? await db.collection("guide_pages").where("chapterId", "==", chapterId).get()
      : await db.collection("guide_pages").where("guideId", "==", guideId!).get();
    const data = snap.docs.map(
      (d) => ({ id: d.id, ...normalizeDoc(d.data() as Record<string, unknown>) }) as Record<string, unknown>,
    );
    data.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
    return Response.json({ data });
  } catch (err) {
    console.error("[guide-pages GET]", err);
    return Response.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// ── POST /api/guide-pages ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!body.guideId || !body.chapterId) {
      return Response.json({ error: "guideId와 chapterId가 필요합니다." }, { status: 400 });
    }

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

    // anchor slug — 미제공 시 자동 생성
    const anchor = (body.anchor as string)?.trim() ||
      `page-${Date.now()}`;

    // 다음 order 계산
    const existingSnap = await db
      .collection("guide_pages")
      .where("chapterId", "==", body.chapterId)
      .get();
    const maxOrder = existingSnap.docs.reduce((max, d) => {
      const o = (d.data() as Record<string, unknown>).order as number ?? 0;
      return Math.max(max, o);
    }, -1);

    const ref = await db.collection("guide_pages").add({
      ...body,
      anchor,
      order: body.order ?? maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await ref.get();
    return Response.json({ data: { id: doc.id, ...normalizeDoc(doc.data() as Record<string, unknown>) } });
  } catch (err) {
    console.error("[guide-pages POST]", err);
    return Response.json({ error: "생성에 실패했습니다." }, { status: 500 });
  }
}
