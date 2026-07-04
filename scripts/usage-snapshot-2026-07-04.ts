// 실사용 스냅샷 (2026-07-04) — 다음 사이클 제안서용 읽기 전용 집계.
// count() 집계 위주로 저비용. 어떤 데이터도 수정하지 않는다.
// 실행: set -a; source .env.local; set +a
//   npx tsc scripts/usage-snapshot-2026-07-04.ts --module commonjs --outDir .seed-tmp --esModuleInterop --skipLibCheck
//   node .seed-tmp/usage-snapshot-2026-07-04.js
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Query } from "firebase-admin/firestore";

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });

const now = Date.now();
const iso = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString();

async function cnt(q: Query): Promise<number> {
  try {
    return (await q.count().get()).data().count;
  } catch {
    return -1; // 인덱스/권한 문제 표시
  }
}
const col = (name: string) => db.collection(name);

async function main() {
  const out: Record<string, unknown> = {};

  // ── 회원·활성 ──
  out["users.approved"] = await cnt(col("users").where("approved", "==", true));
  out["users.pending"] = await cnt(col("users").where("approved", "==", false));
  out["users.active7d(lastVisitAt)"] = await cnt(col("users").where("lastVisitAt", ">", iso(7)));
  out["users.active30d(lastVisitAt)"] = await cnt(col("users").where("lastVisitAt", ">", iso(30)));

  // ── 연구 여정 문서 ──
  out["writing_papers.total"] = await cnt(col("writing_papers"));
  out["writing_papers.updated30d"] = await cnt(col("writing_papers").where("lastSavedAt", ">", iso(30)));
  out["research_reports.total"] = await cnt(col("research_reports"));
  out["research_reports.updated30d"] = await cnt(col("research_reports").where("lastSavedAt", ">", iso(30)));
  out["research_proposals.total"] = await cnt(col("research_proposals"));
  out["research_models.total"] = await cnt(col("research_models"));
  out["writing_paper_versions.total"] = await cnt(col("writing_paper_versions"));
  out["advisor_feedback_notes.total"] = await cnt(col("advisor_feedback_notes"));

  // ── 논문 읽기·매트릭스 ──
  out["research_papers.total"] = await cnt(col("research_papers"));
  out["research_papers.completedRead"] = await cnt(col("research_papers").where("readStatus", "==", "completed"));
  out["research_papers.matrix.methodology"] = await cnt(col("research_papers").where("methodology", ">", ""));
  out["research_papers.matrix.findings"] = await cnt(col("research_papers").where("findings", ">", ""));
  out["research_papers.matrix.sample"] = await cnt(col("research_papers").where("sample", ">", ""));
  out["paper_reading_logs.total"] = await cnt(col("paper_reading_logs"));
  out["paper_reading_logs.30d"] = await cnt(col("paper_reading_logs").where("createdAt", ">", iso(30)));

  // ── 습관·타이머 ──
  out["study_sessions.total"] = await cnt(col("study_sessions"));
  out["study_sessions.30d"] = await cnt(col("study_sessions").where("createdAt", ">", iso(30)));
  out["writing_paper_history.30d"] = await cnt(col("writing_paper_history").where("savedAt", ">", iso(30)));
  out["diagnostic_results.total"] = await cnt(col("diagnostic_results"));
  out["flashcards.total"] = await cnt(col("flashcards"));

  // ── streak_events 타입 분포 (기능 사용 신호) ──
  const evSnap = await col("streak_events").limit(5000).get();
  const evByType = new Map<string, number>();
  for (const d of evSnap.docs) {
    const t = (d.data() as { type?: string }).type ?? "?";
    evByType.set(t, (evByType.get(t) ?? 0) + 1);
  }
  out["streak_events.byType"] = Object.fromEntries(evByType);

  // ── 에디터 텔레메트리 (user_activity_logs) ──
  const logSnap = await col("user_activity_logs").orderBy("createdAt", "desc").limit(3000).get();
  const logByEvent = new Map<string, number>();
  let oldestLog = "";
  for (const d of logSnap.docs) {
    const x = d.data() as { event?: string; type?: string; createdAt?: string };
    const key = x.event ?? x.type ?? "?";
    logByEvent.set(key, (logByEvent.get(key) ?? 0) + 1);
    if (x.createdAt) oldestLog = x.createdAt;
  }
  out["activity_logs.byEvent(latest3000)"] = Object.fromEntries(
    Array.from(logByEvent.entries()).sort((a, b) => b[1] - a[1]),
  );
  out["activity_logs.windowOldest"] = oldestLog;

  // ── 커뮤니티·행사 ──
  out["posts.total"] = await cnt(col("posts"));
  out["posts.30d"] = await cnt(col("posts").where("createdAt", ">", iso(30)));
  out["comments.30d"] = await cnt(col("comments").where("createdAt", ">", iso(30)));
  out["seminar_attendees.checkedIn.total"] = await cnt(col("seminar_attendees").where("checkedIn", "==", true));
  out["networking_rsvps.total"] = await cnt(col("networking_rsvps"));
  out["networking_reviews.total"] = await cnt(col("networking_reviews"));
  out["direct_messages.total"] = await cnt(col("direct_messages"));
  out["profile_views.total"] = await cnt(col("profile_views"));
  out["design_documents.total"] = await cnt(col("design_documents"));
  out["collaborative_research.total"] = await cnt(col("collaborative_research"));

  // ── 알림 소비 ──
  out["notifications.total"] = await cnt(col("notifications"));
  out["notifications.unread"] = await cnt(col("notifications").where("read", "==", false));
  out["notifications.30d"] = await cnt(col("notifications").where("createdAt", ">", iso(30)));

  console.log(JSON.stringify(out, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
