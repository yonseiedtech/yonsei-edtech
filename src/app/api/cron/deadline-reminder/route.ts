import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers } from "@/lib/push-admin";

/**
 * 인터뷰·설문 마감 D-1 리마인더 크론 (신뢰성 배치, 2026-07-04) — 매일 1회.
 *
 * 배경: 인터뷰(post.interview.deadline)·설문(post.poll.deadline)에 마감 필드가 있지만
 * 리마인더 크론이 없어 미응답자는 접속하지 않으면 마감을 놓쳤다 (리텐션 재감사 Med).
 * 내일(KST) 마감되는 인터뷰/설문마다 "아직 응답하지 않은 승인 회원"에게 인앱+웹푸시.
 * refId(`deadline_{postId}`) 멱등 가드 — 크론 재실행에도 1회만.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const today = kstNow.toISOString().split("T")[0];
    const tomorrow = new Date(kstNow.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const db = getAdminDb();

    // 승인 회원 전체 (분모)
    const usersSnap = await db.collection("users").where("approved", "==", true).limit(1000).get();
    const allMembers = usersSnap.docs.map((d) => d.id);

    // 게시글 중 인터뷰/설문 보유 후보 — 최근 500건에서 마감일 검사 (deadline 은 중첩 필드라 서버 필터 불가)
    const postsSnap = await db.collection("posts").orderBy("createdAt", "desc").limit(500).get();
    const results: unknown[] = [];

    for (const doc of postsSnap.docs) {
      const post = doc.data() as {
        title?: string;
        interview?: { deadline?: string };
        poll?: { deadline?: string; question?: string };
      };
      const kind = post.interview?.deadline ? "interview" : post.poll?.deadline ? "poll" : null;
      if (!kind) continue;
      const deadlineYmd = (kind === "interview" ? post.interview!.deadline! : post.poll!.deadline!).slice(0, 10);
      if (deadlineYmd !== tomorrow) continue;

      const refId = `deadline_${doc.id}`;
      // 멱등 가드
      const existing = await db
        .collection("notifications")
        .where("type", "==", "activity_reminder")
        .where("refId", "==", refId)
        .limit(1)
        .get();
      if (!existing.empty) {
        results.push({ postId: doc.id, skipped: "already sent" });
        continue;
      }

      // 응답자 제외
      const responded = new Set<string>();
      if (kind === "interview") {
        const respSnap = await db
          .collection("interview_responses")
          .where("postId", "==", doc.id)
          .limit(1000)
          .get();
        for (const r of respSnap.docs) {
          const uid = (r.data() as { authorId?: string }).authorId;
          if (uid) responded.add(uid);
        }
      } else {
        const votesSnap = await db.collection("posts").doc(doc.id).collection("votes").get();
        for (const v of votesSnap.docs) responded.add(v.id);
      }
      const targets = allMembers.filter((id) => !responded.has(id));
      if (targets.length === 0) continue;

      const label = kind === "interview" ? "릴레이 인터뷰" : "설문";
      const title = `${label} 마감 D-1`;
      const message = `"${(post.title ?? post.poll?.question ?? "").slice(0, 40)}" ${label}이 내일 마감됩니다 — 아직 응답하지 않으셨어요.`;
      const link = `/board/${doc.id}`;

      const nowIso = new Date().toISOString();
      for (let i = 0; i < targets.length; i += 400) {
        const batch = db.batch();
        for (const userId of targets.slice(i, i + 400)) {
          const ref = db.collection("notifications").doc();
          batch.set(ref, {
            userId,
            type: "activity_reminder",
            title,
            message,
            link,
            refId,
            read: false,
            createdAt: nowIso,
          });
        }
        await batch.commit();
      }
      let pushResult: unknown = null;
      try {
        pushResult = await sendPushToUsers(targets, { title, body: message, link, tag: refId });
      } catch (e) {
        console.error("[deadline-reminder] push failed", e);
      }
      results.push({ postId: doc.id, kind, notifCount: targets.length, pushResult });
    }

    return Response.json({ ok: true, date: today, results });
  } catch (err) {
    console.error("[cron/deadline-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
