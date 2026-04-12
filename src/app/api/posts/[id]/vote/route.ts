import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";

// POST /api/posts/[id]/vote  body: { optionIds: string[] }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const { id } = await ctx.params;
  let body: { optionIds?: string[] } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const optionIds = Array.isArray(body.optionIds) ? body.optionIds.filter((x) => typeof x === "string") : [];
  if (optionIds.length === 0) return NextResponse.json({ error: "선택 항목이 없습니다." }, { status: 400 });

  try {
    const db = getAdminDb();
    const postRef = db.collection("posts").doc(id);
    const voteRef = postRef.collection("votes").doc(auth.uid);

    await db.runTransaction(async (tx) => {
      const [postSnap, voteSnap] = await Promise.all([tx.get(postRef), tx.get(voteRef)]);
      if (!postSnap.exists) throw new Error("게시글 없음");
      if (voteSnap.exists) throw new Error("이미 투표함");
      const post = postSnap.data() as { poll?: { options: Array<{ id: string; voteCount?: number }>; totalVotes?: number; multi?: boolean; deadline?: string } };
      if (!post.poll) throw new Error("투표 없음");
      if (post.poll.deadline && new Date() >= new Date(post.poll.deadline)) throw new Error("마감됨");
      const valid = new Set(post.poll.options.map((o) => o.id));
      const picks = optionIds.filter((x) => valid.has(x));
      if (picks.length === 0) throw new Error("유효 옵션 없음");
      if (!post.poll.multi && picks.length > 1) throw new Error("단일 선택");

      const newOptions = post.poll.options.map((o) =>
        picks.includes(o.id) ? { ...o, voteCount: (o.voteCount ?? 0) + 1 } : o,
      );
      tx.update(postRef, {
        "poll.options": newOptions,
        "poll.totalVotes": (post.poll.totalVotes ?? 0) + picks.length,
      });
      tx.set(voteRef, {
        uid: auth.uid,
        optionIds: picks,
        createdAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "투표 실패";
    console.error("[posts vote]", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// GET /api/posts/[id]/vote  → 내 투표 내역
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  try {
    const db = getAdminDb();
    const snap = await db.collection("posts").doc(id).collection("votes").doc(auth.uid).get();
    if (!snap.exists) return NextResponse.json({ data: null });
    return NextResponse.json({ data: snap.data() });
  } catch (err) {
    console.error("[posts vote GET]", err);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
