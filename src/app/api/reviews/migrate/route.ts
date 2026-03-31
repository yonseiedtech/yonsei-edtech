import { getAdminDb } from "@/lib/firebase-admin";

// 기존 후기 중 staff+ 사용자의 후기를 자동 분류하는 마이그레이션
// GET /api/reviews/migrate?run=true 로 실행
export async function GET(req: Request) {
  const run = new URL(req.url).searchParams.get("run");
  if (run !== "true") {
    return Response.json({ message: "?run=true 파라미터를 추가하세요." });
  }

  const db = getAdminDb();

  // staff 이상 사용자 목록 가져오기 (ID 및 이름 매핑)
  const usersSnapshot = await db.collection("users").get();
  const staffById = new Map<string, string>();
  const staffByName = new Map<string, string>();
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    const role = data.role as string;
    if (["staff", "president", "admin"].includes(role)) {
      staffById.set(doc.id, role);
      if (data.name) staffByName.set(data.name as string, role);
    }
  }

  // attendee 타입 후기 중 staff+ 사용자 후기 찾기
  const reviewsSnapshot = await db.collection("seminar_reviews")
    .where("type", "==", "attendee")
    .get();

  const updates: { id: string; authorName: string; oldType: string; newRole: string; matchedBy: string }[] = [];

  for (const doc of reviewsSnapshot.docs) {
    const data = doc.data();
    const authorId = data.authorId as string;
    const authorName = data.authorName as string;

    // 1차: authorId 매칭
    if (authorId && staffById.has(authorId)) {
      const role = staffById.get(authorId)!;
      await doc.ref.update({ type: "staff", authorRole: role });
      updates.push({ id: doc.id, authorName, oldType: "attendee", newRole: role, matchedBy: "userId" });
      continue;
    }

    // 2차: 이름 매칭 (guest_ 계정 포함)
    if (authorName && staffByName.has(authorName)) {
      const role = staffByName.get(authorName)!;
      await doc.ref.update({ type: "staff", authorRole: role });
      updates.push({ id: doc.id, authorName, oldType: "attendee", newRole: role, matchedBy: "name" });
    }
  }

  return Response.json({
    message: `${updates.length}건의 후기가 운영진으로 재분류되었습니다.`,
    updates,
  });
}
