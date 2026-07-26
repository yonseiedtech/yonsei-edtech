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

// ── GET /api/guide-progress?guideId=xxx | ?mine=true ─────────────────────────
export async function GET(req: NextRequest) {
  const guideId = req.nextUrl.searchParams.get("guideId");
  const mine = req.nextUrl.searchParams.get("mine");

  // 내 전체 진행 목록 — 마이페이지 "이어읽기" 위젯용 (복합 인덱스 회피: where 단일 필드 + 메모리 정렬)
  if (mine) {
    const user = await verifyAuth(req);
    if (!user) return Response.json({ data: [] });
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("learning_guide_progress")
        .where("userId", "==", user.uid)
        .get();
      const list = snap.docs
        .map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            guideId: (raw.guideId as string) ?? "",
            readPageIds: Array.isArray(raw.readPageIds) ? (raw.readPageIds as string[]) : [],
            lastPageId: (raw.lastPageId as string | undefined) ?? null,
            updatedAt: tsToIso(raw.updatedAt) || String(raw.updatedAt ?? ""),
          };
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return Response.json({ data: list });
    } catch (err) {
      console.error("[guide-progress GET mine]", err);
      return Response.json({ error: "조회에 실패했습니다." }, { status: 500 });
    }
  }

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
