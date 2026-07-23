import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import type { Firestore } from "firebase-admin/firestore";

async function assertGuideOwner(db: Firestore, guideId: string, uid: string, role: string): Promise<Response | null> {
  const guideDoc = await db.collection("learning_guides").doc(guideId).get();
  if (!guideDoc.exists) return Response.json({ error: "가이드를 찾을 수 없습니다." }, { status: 404 });
  const guideData = guideDoc.data() as Record<string, unknown>;
  const isStaff = ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] >= ROLE_HIERARCHY.staff;
  if (guideData.authorId !== uid && !isStaff) {
    return Response.json({ error: "권한이 부족합니다." }, { status: 403 });
  }
  return null;
}

// ── PATCH /api/guide-chapters/[id] ───────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json() as Record<string, unknown>;
    const db = getAdminDb();

    const chapterDoc = await db.collection("guide_chapters").doc(id).get();
    if (!chapterDoc.exists) return Response.json({ error: "챕터를 찾을 수 없습니다." }, { status: 404 });
    const chapterData = chapterDoc.data() as Record<string, unknown>;

    const authError = await assertGuideOwner(db, chapterData.guideId as string, authResult.uid, authResult.role);
    if (authError) return authError;

    await db.collection("guide_chapters").doc(id).update({
      ...body,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[guide-chapters/[id] PATCH]", err);
    return Response.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

// ── DELETE /api/guide-chapters/[id] ──────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  try {
    const db = getAdminDb();

    const chapterDoc = await db.collection("guide_chapters").doc(id).get();
    if (!chapterDoc.exists) return Response.json({ error: "챕터를 찾을 수 없습니다." }, { status: 404 });
    const chapterData = chapterDoc.data() as Record<string, unknown>;

    const authError = await assertGuideOwner(db, chapterData.guideId as string, authResult.uid, authResult.role);
    if (authError) return authError;

    // 해당 챕터의 모든 페이지도 삭제
    const pagesSnap = await db
      .collection("guide_pages")
      .where("chapterId", "==", id)
      .get();
    const batch = db.batch();
    for (const pageDoc of pagesSnap.docs) {
      batch.delete(pageDoc.ref);
    }
    batch.delete(db.collection("guide_chapters").doc(id));
    await batch.commit();

    // chapterCount 업데이트
    const guideId = chapterData.guideId as string;
    const remainingSnap = await db.collection("guide_chapters").where("guideId", "==", guideId).get();
    await db.collection("learning_guides").doc(guideId).update({
      chapterCount: Math.max(0, remainingSnap.size - 1),
      updatedAt: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[guide-chapters/[id] DELETE]", err);
    return Response.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}

