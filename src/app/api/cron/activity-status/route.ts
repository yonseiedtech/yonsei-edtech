import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 활동 상태 자동 전환 Cron (매일 09:00 KST 실행)
 *
 * 1. upcoming → ongoing: 시작일(date) 도래
 * 2. ongoing → completed: 종료일(endDate) 경과
 * 3. recruiting → closed: 시작일 도래 또는 정원 도달
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = kstNow.toISOString().split("T")[0];

    const snapshot = await db
      .collection("activities")
      .where("status", "in", ["upcoming", "ongoing"])
      .get();

    let updated = 0;

    for (const docSnap of snapshot.docs) {
      const activity = docSnap.data();
      const startDate = activity.date;
      const endDate = activity.endDate;
      const recruitmentStatus = activity.recruitmentStatus;
      const participants = activity.participants ?? [];
      const maxParticipants = activity.maxParticipants;

      const updates: Record<string, unknown> = {};

      // 상태 전환
      if (activity.status === "upcoming" && startDate && startDate <= today) {
        updates.status = "ongoing";
      }
      if (activity.status === "ongoing" && endDate && endDate < today) {
        updates.status = "completed";
      }

      // 모집 상태 자동 전환
      if (recruitmentStatus === "recruiting") {
        if (startDate && startDate <= today) {
          updates.recruitmentStatus = "closed";
        } else if (maxParticipants && participants.length >= maxParticipants) {
          updates.recruitmentStatus = "closed";
        }
      }

      // 활동 완료 시 모집도 완료
      if (updates.status === "completed" && recruitmentStatus !== "completed") {
        updates.recruitmentStatus = "completed";
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await db.collection("activities").doc(docSnap.id).update(updates);
        updated++;
      }
    }

    return Response.json({ ok: true, date: today, updated });
  } catch (err) {
    console.error("[cron/activity-status]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
