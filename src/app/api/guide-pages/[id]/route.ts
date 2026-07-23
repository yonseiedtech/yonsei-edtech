import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import { Timestamp } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";

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

// ── GET /api/guide-pages/[id] ─────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getAdminDb();
    const doc = await db.collection("guide_pages").doc(id).get();
    if (!doc.exists) return Response.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ data: { id: doc.id, ...normalizeDoc(doc.data() as Record<string, unknown>) } });
  } catch (err) {
    console.error("[guide-pages/[id] GET]", err);
    return Response.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// ── PATCH /api/guide-pages/[id] ───────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json() as Record<string, unknown>;
    const db = getAdminDb();

    const pageDoc = await db.collection("guide_pages").doc(id).get();
    if (!pageDoc.exists) return Response.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
    const pageData = pageDoc.data() as Record<string, unknown>;

    const authError = await assertGuideOwner(db, pageData.guideId as string, authResult.uid, authResult.role);
    if (authError) return authError;

    await db.collection("guide_pages").doc(id).update({
      ...body,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[guide-pages/[id] PATCH]", err);
    return Response.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

// ── DELETE /api/guide-pages/[id] ──────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  try {
    const db = getAdminDb();

    const pageDoc = await db.collection("guide_pages").doc(id).get();
    if (!pageDoc.exists) return Response.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
    const pageData = pageDoc.data() as Record<string, unknown>;

    const authError = await assertGuideOwner(db, pageData.guideId as string, authResult.uid, authResult.role);
    if (authError) return authError;

    await db.collection("guide_pages").doc(id).delete();
    return Response.json({ success: true });
  } catch (err) {
    console.error("[guide-pages/[id] DELETE]", err);
    return Response.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
