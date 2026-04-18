/**
 * 졸업생 학위논문 134건 시드 import
 *
 * Usage:
 *   # 1) .env.local 에서 자격증명 로드
 *   #    SEED_ADMIN_EMAIL=admin@yonsei.ac.kr
 *   #    SEED_ADMIN_PASSWORD=<관리자 비밀번호>
 *   # 2) 실행
 *   node --env-file=.env.local scripts/import-alumni-theses.mjs --csv "<path>" [--dry-run]
 *
 * CSV 컬럼: 번호, 학위수여년월, 논문저자, 논문제목, 지도교수, 주제(키워드), 실제URI, 초록/요약, 목차
 *
 * 안전장치:
 *  - 같은 source 태그(csv_seed_2026_04)로 이미 적재된 docs가 있으면 중단 (중복 방지)
 *  - --dry-run 으로 파싱·정규화 결과 미리보기 가능
 *  - 자격증명은 환경변수에서만 읽음 (코드 하드코딩 금지)
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

const args = parseArgs(process.argv.slice(2));
const SOURCE_TAG = "csv_seed_2026_04";
const DRY = !!args["dry-run"];

if (!args.csv) {
  console.error("Usage: node --env-file=.env.local scripts/import-alumni-theses.mjs --csv <path> [--dry-run]");
  process.exit(1);
}
if (!DRY && (!ADMIN_EMAIL || !ADMIN_PASSWORD)) {
  console.error("✗ Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD env vars.");
  console.error("  Add them to .env.local and run with --env-file=.env.local, or pass --dry-run.");
  process.exit(1);
}
if (!DRY && !firebaseConfig.projectId) {
  console.error("✗ Missing NEXT_PUBLIC_FIREBASE_* env vars (load with --env-file=.env.local).");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

async function main() {
  console.log(`▶ csv: ${args.csv}`);
  console.log(`▶ dry-run: ${DRY}`);

  const rows = parseCsv(readFileSync(args.csv, "utf8"));
  console.log(`✔ parsed rows: ${rows.length}`);

  const records = rows.map(toRecord).filter(Boolean);
  console.log(`✔ valid records: ${records.length}`);

  if (DRY) {
    console.log("─── sample (first) ───");
    console.log(JSON.stringify(records[0], null, 2));
    console.log("─── sample (last) ───");
    console.log(JSON.stringify(records[records.length - 1], null, 2));
    console.log("─── stats ───");
    console.log(`  with advisor: ${records.filter((r) => r.advisorName).length}`);
    console.log(`  with keywords: ${records.filter((r) => r.keywords?.length).length}`);
    console.log(`  with abstract: ${records.filter((r) => r.abstract).length}`);
    return;
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log("▶ admin login…");
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);

  // 같은 source 태그로 이미 적재된 docs 가 있으면 중단
  const existing = await getDocs(
    query(collection(db, "alumni_theses"), where("source", "==", SOURCE_TAG))
  );
  if (!existing.empty) {
    console.warn(`⚠ already seeded (${existing.size} docs with source=${SOURCE_TAG}). Aborting.`);
    console.warn("   To re-import, delete existing docs or change SOURCE_TAG.");
    process.exit(2);
  }

  let success = 0;
  for (const rec of records) {
    try {
      await addDoc(collection(db, "alumni_theses"), {
        ...rec,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      success++;
      if (success % 20 === 0) console.log(`  … ${success}/${records.length}`);
    } catch (e) {
      console.error(`✗ failed: ${rec.title} — ${e.message}`);
    }
  }
  console.log(`✔ done: ${success}/${records.length} imported`);
}

// ─────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[k] = next;
      i++;
    } else {
      out[k] = true;
    }
  }
  return out;
}

/** RFC4180 호환 CSV 파서 (인용 필드 안의 ',', 줄바꿈, 이스케이프된 따옴표 처리) */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM 제거

  const rows = [];
  let cur = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.length > 1 && r.some((c) => c?.trim()))
    .map((r) => Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ""])));
}

/** "2000. 8" → "2000-08" */
function normalizeYearMonth(raw) {
  if (!raw) return "";
  const m = String(raw).trim().match(/(\d{4})\s*\.\s*(\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${String(m[2]).padStart(2, "0")}`;
}

/** "kw1, kw2/kw3" → ["kw1","kw2","kw3"] */
function splitKeywords(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[\/,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** "원제목 : English subtitle" → { title, titleEn } */
function splitTitle(raw) {
  const t = String(raw || "").trim();
  const m = t.match(/^(.*?)\s*:\s*(.*)$/);
  if (m && /[A-Za-z]/.test(m[2])) {
    return { title: m[1].trim(), titleEn: m[2].trim() };
  }
  return { title: t, titleEn: undefined };
}

function toRecord(row) {
  const title = String(row["논문제목"] || "").trim();
  const author = String(row["논문저자"] || "").trim();
  if (!title || !author) return null;

  const { title: titleKo, titleEn } = splitTitle(title);

  const rec = {
    graduationType: "thesis", // CSV는 모두 논문 졸업
    awardedYearMonth: normalizeYearMonth(row["학위수여년월"]),
    authorName: author,
    authorMappingStatus: "unmapped",
    title: titleKo,
    keywords: splitKeywords(row["주제(키워드)"]),
    keywordsRaw: row["주제(키워드)"]?.trim() || undefined,
    abstract: row["초록/요약"]?.trim() || undefined,
    toc: row["목차"]?.trim() || undefined,
    dcollectionUrl: row["실제URI"]?.trim() || undefined,
    source: SOURCE_TAG,
    hasReferenceList: false,
    hasEmbedding: false,
  };

  if (titleEn) rec.titleEn = titleEn;
  const advisor = String(row["지도교수"] || "").trim();
  if (advisor) rec.advisorName = advisor;

  for (const k of Object.keys(rec)) {
    if (rec[k] === undefined) delete rec[k];
  }
  return rec;
}
