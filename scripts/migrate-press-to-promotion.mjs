/**
 * board-community-v2: press → promotion 카테고리 통합 마이그레이션
 *
 * Usage:
 *   node scripts/migrate-press-to-promotion.mjs            # dry-run (기본)
 *   node scripts/migrate-press-to-promotion.mjs --apply    # 실제 적용
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";

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
const BATCH_SIZE = 450; // Firestore 배치 한도 500, 여유 확보
const PRESS_TAG = "보도자료";

async function run() {
  console.log(`[migrate-press-to-promotion] mode=${APPLY ? "APPLY" : "DRY-RUN"}`);

  const q = query(collection(db, "posts"), where("category", "==", "press"));
  const snap = await getDocs(q);

  console.log(`대상 문서: ${snap.size}건`);
  if (snap.size === 0) {
    console.log("변경할 문서가 없습니다.");
    process.exit(0);
  }

  // 샘플 로그
  snap.docs.slice(0, 5).forEach((d) => {
    const data = d.data();
    console.log(`  - [${d.id}] ${data.title?.slice(0, 40)} | tags=${JSON.stringify(data.tags ?? [])}`);
  });

  if (!APPLY) {
    console.log("\n[DRY-RUN] --apply 플래그 없이 실행되었습니다. 실제 변경은 수행하지 않았습니다.");
    process.exit(0);
  }

  let processed = 0;
  let failed = 0;
  const docs = snap.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const d of chunk) {
      const data = d.data();
      const existingTags = Array.isArray(data.tags) ? data.tags : [];
      const newTags = existingTags.includes(PRESS_TAG) ? existingTags : [...existingTags, PRESS_TAG];
      batch.update(doc(db, "posts", d.id), {
        category: "promotion",
        _legacyCategory: "press",
        tags: newTags,
      });
    }

    try {
      await batch.commit();
      processed += chunk.length;
      console.log(`배치 커밋 완료: ${processed}/${docs.length}`);
    } catch (err) {
      failed += chunk.length;
      console.error(`배치 실패 (${i}..${i + chunk.length - 1}):`, err.message);
    }
  }

  console.log(`\n완료: 성공 ${processed}건, 실패 ${failed}건`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(2);
});
