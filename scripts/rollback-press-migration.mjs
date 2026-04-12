/**
 * board-community-v2: press 마이그레이션 롤백
 * _legacyCategory == "press" 문서를 다시 category: "press"로 복원
 *
 * Usage:
 *   node scripts/rollback-press-migration.mjs --apply
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch, doc, deleteField } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2Vuo9mN2DVCtBqmVQZaUGabG07RCHoUs",
  authDomain: "yonsei-edtech.firebaseapp.com",
  projectId: "yonsei-edtech",
  storageBucket: "yonsei-edtech.firebasestorage.app",
  messagingSenderId: "442267096511",
  appId: "1:442267096511:web:2cf9787d3994a8dce3fd0a",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const APPLY = process.argv.includes("--apply");
const BATCH_SIZE = 450;

async function run() {
  console.log(`[rollback-press-migration] mode=${APPLY ? "APPLY" : "DRY-RUN"}`);

  const q = query(collection(db, "posts"), where("_legacyCategory", "==", "press"));
  const snap = await getDocs(q);

  console.log(`롤백 대상: ${snap.size}건`);
  if (snap.size === 0) process.exit(0);

  if (!APPLY) {
    snap.docs.slice(0, 5).forEach((d) => console.log(`  - [${d.id}] ${d.data().title?.slice(0, 40)}`));
    console.log("--apply 없이 실행. 실제 롤백 안함.");
    process.exit(0);
  }

  const docs = snap.docs;
  let processed = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.update(doc(db, "posts", d.id), {
        category: "press",
        _legacyCategory: deleteField(),
      });
    }
    await batch.commit();
    processed += chunk.length;
    console.log(`롤백 진행: ${processed}/${docs.length}`);
  }
  console.log("롤백 완료.");
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(2); });
