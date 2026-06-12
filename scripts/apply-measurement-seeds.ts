// 측정도구 시드 즉시 적용 (멱등: 이름 가드 + undefined strip) — cron 버그로 미생성된 10종 보정
// 실행: npx tsx scripts/apply-measurement-seeds.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { SEED_MEASUREMENTS } from "../src/lib/archive-seed";

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
const snap = await db.collection("archive_measurements").get();
const existing = new Set(snap.docs.map((d) => (d.data() as { name?: string }).name).filter(Boolean));
console.log(`기존 ${existing.size}건`);

let created = 0;
for (const s of SEED_MEASUREMENTS) {
  if (existing.has(s.name)) {
    console.log(`SKIP (존재): ${s.name}`);
    continue;
  }
  const now = new Date().toISOString();
  const payload = Object.fromEntries(
    Object.entries({
      name: s.name,
      description: s.description,
      originalName: s.originalName,
      author: s.author,
      itemCount: s.itemCount,
      sampleItems: s.sampleItems ?? [],
      scaleType: s.scaleType,
      reliability: s.reliability,
      validity: s.validity,
      resourceUrl: s.resourceUrl,
      altNames: s.altNames ?? [],
      tags: s.tags ?? [],
      references: s.references ?? [],
      seedKey: s.seedKey,
      createdAt: now,
      updatedAt: now,
      createdBy: "system:orchestra-track2",
    }).filter(([, v]) => v !== undefined),
  );
  const ref = await db.collection("archive_measurements").add(payload);
  created += 1;
  console.log(`ADDED: ${s.name} → ${ref.id}`);
}
console.log(`\n생성 ${created}건 — 최종 ${existing.size + created}건`);
}

void main();
