import { getAdminDb } from "@/lib/firebase-admin";

// 기존 후기 중 staff+ 사용자의 후기를 자동 분류하는 마이그레이션
// GET /api/reviews/migrate?run=true 로 실행
export async function GET(req: Request) {
  const run = new URL(req.url).searchParams.get("run");
  if (run !== "true") {
    return Response.json({ message: "?run=true 파라미터를 추가하세요." });
  }

  const db = getAdminDb();

  // staff 이상 사용자 목록 가져오기
  const usersSnapshot = await db.collection("users").get();
  const staffUsers = new Map<string, string>();
  for (const doc of usersSnapshot.docs) {
    const role = doc.data().role as string;
    if (["staff", "president", "admin"].includes(role)) {
      staffUsers.set(doc.id, role);
    }
  }

  // attendee 타입 후기 중 staff+ 사용자 후기 찾기
  const reviewsSnapshot = await db.collection("seminar_reviews")
    .where("type", "==", "attendee")
    .get();

  const updates: { id: string; authorName: string; oldType: string; newRole: string }[] = [];

  for (const doc of reviewsSnapshot.docs) {
    const data = doc.data();
    const authorId = data.authorId as string;
    if (authorId && staffUsers.has(authorId)) {
      const role = staffUsers.get(authorId)!;
      await doc.ref.update({
        type: "staff",
        authorRole: role,
      });
      updates.push({
        id: doc.id,
        authorName: data.authorName,
        oldType: "attendee",
        newRole: role,
      });
    }
  }

  return Response.json({
    message: `${updates.length}건의 후기가 운영진으로 재분류되었습니다.`,
    updates,
  });
}
