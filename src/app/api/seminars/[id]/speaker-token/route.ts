import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { randomBytes } from "crypto";

// 연사 후기 토큰 조회
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getAdminDb();
  const doc = await db.collection("seminars").doc(id).get();

  if (!doc.exists) {
    return Response.json({ error: "세미나를 찾을 수 없습니다." }, { status: 404 });
  }

  const token = doc.data()?.speakerReviewToken ?? null;
  return Response.json({ token });
}

// 연사 후기 토큰 생성 (운영진 전용 — 클라이언트에서 권한 체크)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getAdminDb();
  const ref = db.collection("seminars").doc(id);
  const doc = await ref.get();

  if (!doc.exists) {
    return Response.json({ error: "세미나를 찾을 수 없습니다." }, { status: 404 });
  }

  // 기존 토큰이 있으면 그대로 반환
  const existing = doc.data()?.speakerReviewToken;
  if (existing) {
    return Response.json({ token: existing });
  }

  // 새 토큰 생성
  const token = randomBytes(16).toString("hex");
  await ref.update({ speakerReviewToken: token });

  return Response.json({ token });
}
