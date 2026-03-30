import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";

// 활동 목록 조회 (공개)
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const id = req.nextUrl.searchParams.get("id");

  try {
    const db = getAdminDb();

    if (id) {
      const doc = await db.collection("activities").doc(id).get();
      if (!doc.exists) return Response.json({ error: "활동을 찾을 수 없습니다." }, { status: 404 });
      return Response.json({ data: { id: doc.id, ...doc.data() } });
    }

    let query = db.collection("activities").orderBy("createdAt", "desc");
    if (type) query = query.where("type", "==", type) as typeof query;
    const snap = await query.get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return Response.json({ data });
  } catch (err) {
    console.error("[activities GET]", err);
    return Response.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// 활동 생성 (staff+)
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const db = getAdminDb();
    const now = new Date().toISOString();
    const ref = await db.collection("activities").add({
      ...body,
      participants: body.participants ?? [],
      applicants: body.applicants ?? [],
      createdAt: now,
      updatedAt: now,
    });
    const doc = await ref.get();
    return Response.json({ data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error("[activities POST]", err);
    return Response.json({ error: "생성에 실패했습니다." }, { status: 500 });
  }
}

// 활동 수정 (staff+)
export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return Response.json({ error: "ID가 필요합니다." }, { status: 400 });

    const db = getAdminDb();
    await db.collection("activities").doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[activities PATCH]", err);
    return Response.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

// 활동 삭제 (staff+)
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return Response.json({ error: "ID가 필요합니다." }, { status: 400 });

    const db = getAdminDb();
    await db.collection("activities").doc(id).delete();
    return Response.json({ success: true });
  } catch (err) {
    console.error("[activities DELETE]", err);
    return Response.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
