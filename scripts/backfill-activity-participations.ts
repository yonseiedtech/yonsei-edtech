// 과거 참석·활동 참여 백필 (2026-07-07)
//  · 자동 적재(recordAuto) 도입 이전의 세미나 체크인·활동 참여자를 activity_participations 로 소급 적재.
//  · 멱등: 결정적 id(userId__seminar__id / userId__activity__id) — 이미 있으면(수동 검증·자동적재분) 건너뜀.
//  · 게스트(guest_ userId)는 제외(회원 포트폴리오 대상 아님).
//  · 실행: set -a; source .env.local; set +a
//    npx tsc scripts/backfill-activity-participations.ts --module commonjs --outDir .seed-tmp --esModuleInterop --skipLibCheck
//    node .seed-tmp/scripts/backfill-activity-participations.js [--apply]
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true, ignoreUndefinedProperties: true });

const isMember = (uid?: string | null): uid is string => !!uid && !uid.startsWith("guest_");

interface PlannedDoc {
  id: string;
  userId: string;
  seminarId?: string;
  activityId?: string;
  role: string;
  verified: boolean;
  startedAt: string;
}

async function main() {
  const planned: PlannedDoc[] = [];
  const seen = new Set<string>();

  // ── 1) 세미나 체크인 → verified 참여 ──
  const attSnap = await db.collection("seminar_attendees").where("checkedIn", "==", true).get();
  let attCandidates = 0;
  for (const d of attSnap.docs) {
    const a = d.data() as { userId?: string; seminarId?: string; checkedInAt?: string | null };
    if (!isMember(a.userId) || !a.seminarId) continue;
    attCandidates++;
    const id = `${a.userId}__seminar__${a.seminarId}`;
    if (seen.has(id)) continue;
    seen.add(id);
    planned.push({
      id, userId: a.userId, seminarId: a.seminarId,
      role: "participant", verified: true,
      startedAt: a.checkedInAt || new Date().toISOString(),
    });
  }

  // ── 2) 활동 참여자(participants) → 미검증 참여 ──
  const actSnap = await db.collection("activities").get();
  let actCandidates = 0;
  for (const d of actSnap.docs) {
    const act = d.data() as { participants?: string[]; leaderId?: string; startDate?: string; createdAt?: string };
    for (const uid of act.participants ?? []) {
      if (!isMember(uid)) continue;
      actCandidates++;
      const id = `${uid}__activity__${d.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      planned.push({
        id, userId: uid, activityId: d.id,
        role: act.leaderId === uid ? "leader" : "participant",
        verified: false,
        startedAt: act.startDate || act.createdAt || new Date().toISOString(),
      });
    }
  }

  // ── 3) 기존 문서와 대조해 신규만 (멱등) ──
  const toCreate: PlannedDoc[] = [];
  for (let i = 0; i < planned.length; i += 300) {
    const chunk = planned.slice(i, i + 300);
    const refs = chunk.map((p) => db.collection("activity_participations").doc(p.id));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap, j) => { if (!snap.exists) toCreate.push(chunk[j]); });
  }

  console.log(`세미나 체크인 후보 ${attCandidates} · 활동 참여 후보 ${actCandidates}`);
  console.log(`중복 제거 계획 ${planned.length} · 기존 존재 제외 후 신규 ${toCreate.length}`);
  const bySem = toCreate.filter((p) => p.seminarId).length;
  console.log(`  신규 세미나 ${bySem} · 신규 활동 ${toCreate.length - bySem}`);

  if (!APPLY) {
    console.log("\n(드라이런 — --apply 로 실제 적재)");
    toCreate.slice(0, 8).forEach((p) => console.log(`  would create ${p.id} (verified=${p.verified})`));
    return;
  }

  let created = 0;
  for (let i = 0; i < toCreate.length; i += 400) {
    const batch = db.batch();
    for (const p of toCreate.slice(i, i + 400)) {
      const ref = db.collection("activity_participations").doc(p.id);
      batch.set(ref, {
        id: p.id, userId: p.userId, seminarId: p.seminarId, activityId: p.activityId,
        role: p.role, outputs: [], verified: p.verified, startedAt: p.startedAt,
        source: "auto", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    created += Math.min(400, toCreate.length - i);
  }
  console.log(`\n백필 완료: ${created}건 적재`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
