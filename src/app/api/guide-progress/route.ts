import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth, verifyAuth } from "@/lib/api-auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

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

// ── GET /api/guide-progress?guideId=xxx ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const guideId = req.nextUrl.searchParams.get("guideId");
  if (!guideId) return Response.json({ error: "guideId가 필요합니다." }, { status: 400 });

  const user = await verifyAuth(req);
  if (!user) return Response.json({ data: null });

  try {
    const db = getAdminDb();
    const docId = `${user.uid}_${guideId}`;
    const doc = await db.collection("learning_guide_progress").doc(docId).get();
    if (!doc.exists) return Response.json({ data: null });

    const raw = doc.data() as Record<string, unknown>;
    return Response.json({
      data: {
        ...raw,
        updatedAt: tsToIso(raw.updatedAt) || raw.updatedAt,
      },
    });
  } catch (err) {
    console.error("[guide-progress GET]", err);
    return Response.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// ── POST /api/guide-progress ──────────────────────────────────────────────────
// body: { guideId, pageId? (markRead), lastPageId? (updateLastPage) }
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json() as { guideId?: string; pageId?: string; lastPageId?: string };
    const { guideId, pageId, lastPageId } = body;
    if (!guideId) return Response.json({ error: "guideId가 필요합니다." }, { status: 400 });

    const db = getAdminDb();
    const docId = `${authResult.uid}_${guideId}`;
    const now = new Date().toISOString();
    const docRef = db.collection("learning_guide_progress").doc(docId);

    const update: Record<string, unknown> = {
      userId: authResult.uid,
      guideId,
      updatedAt: now,
    };

    if (pageId) {
      update.readPageIds = FieldValue.arrayUnion(pageId);
    }
    if (lastPageId) {
      update.lastPageId = lastPageId;
    }

    await docRef.set(update, { merge: true });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[guide-progress POST]", err);
    return Response.json({ error: "진행 저장에 실패했습니다." }, { status: 500 });
  }
}
