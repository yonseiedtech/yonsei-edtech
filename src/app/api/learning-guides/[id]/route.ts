import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import { checkAuthorEligibility } from "../route";
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

// ── GET /api/learning-guides/[id] ────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getAdminDb();
    const doc = await db.collection("learning_guides").doc(id).get();
    if (!doc.exists) return Response.json({ error: "가이드를 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ data: { id: doc.id, ...normalizeDoc(doc.data() as Record<string, unknown>) } });
  } catch (err) {
    console.error("[learning-guides/[id] GET]", err);
    return Response.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// ── PATCH /api/learning-guides/[id] ──────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  const eligible = await checkAuthorEligibility(authResult.uid, authResult.role);
  if (!eligible) {
    return Response.json({ error: "권한이 부족합니다." }, { status: 403 });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const db = getAdminDb();

    // 본인 또는 staff+인지 확인
    const existing = await db.collection("learning_guides").doc(id).get();
    if (!existing.exists) return Response.json({ error: "가이드를 찾을 수 없습니다." }, { status: 404 });
    const data = existing.data() as Record<string, unknown>;
    const isStaff = ROLE_HIERARCHY[authResult.role as keyof typeof ROLE_HIERARCHY] >= ROLE_HIERARCHY.staff;
    if (data.authorId !== authResult.uid && !isStaff) {
      return Response.json({ error: "본인 가이드만 수정할 수 있습니다." }, { status: 403 });
    }

    // slug 중복 체크 (slug 변경 시)
    if (body.slug && body.slug !== data.slug) {
      const slugSnap = await db.collection("learning_guides").where("slug", "==", body.slug).limit(1).get();
      if (!slugSnap.empty && slugSnap.docs[0].id !== id) {
        return Response.json({ error: "이미 사용 중인 slug입니다." }, { status: 409 });
      }
    }

    await db.collection("learning_guides").doc(id).update({
      ...body,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[learning-guides/[id] PATCH]", err);
    return Response.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

// ── DELETE /api/learning-guides/[id] ─────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  try {
    const db = getAdminDb();
    const existing = await db.collection("learning_guides").doc(id).get();
    if (!existing.exists) return Response.json({ error: "가이드를 찾을 수 없습니다." }, { status: 404 });
    const data = existing.data() as Record<string, unknown>;
    const isStaff = ROLE_HIERARCHY[authResult.role as keyof typeof ROLE_HIERARCHY] >= ROLE_HIERARCHY.staff;
    if (data.authorId !== authResult.uid && !isStaff) {
      return Response.json({ error: "본인 가이드만 삭제할 수 있습니다." }, { status: 403 });
    }

    await db.collection("learning_guides").doc(id).delete();
    return Response.json({ success: true });
  } catch (err) {
    console.error("[learning-guides/[id] DELETE]", err);
    return Response.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
