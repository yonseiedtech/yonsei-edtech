/**
 * 졸업생 학위논문 134건 시드 import — Admin SDK 버전
 *
 * Usage:
 *   node --env-file=.env.local scripts/import-alumni-theses-admin.mjs --csv "<path>" [--dry-run]
 *
 * 클라이언트 SDK 대신 Admin SDK(FIREBASE_SERVICE_ACCOUNT_KEY) 사용 →
 * SEED_ADMIN_* 자격증명 불필요, Firestore rules 우회.
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const args = parseArgs(process.argv.slice(2));
const SOURCE_TAG = "csv_seed_2026_04";
const DRY = !!args["dry-run"];

if (!args.csv) {
  console.error("Usage: node --env-file=.env.local scripts/import-alumni-theses-admin.mjs --csv <path> [--dry-run]");
  process.exit(1);
}

const SVC = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!DRY && !SVC) {
  console.error("✗ FIREBASE_SERVICE_ACCOUNT_KEY is missing.");
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

  if (!getApps().length) {
    const trimmed = SVC.trim();
    const json = trimmed.startsWith("{")
      ? trimmed
      : Buffer.from(trimmed, "base64").toString("utf8");
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
  const db = getFirestore();

  const existing = await db
    .collection("alumni_theses")
    .where("source", "==", SOURCE_TAG)
    .limit(1)
    .get();
  if (!existing.empty) {
    console.warn(`⚠ already seeded with source=${SOURCE_TAG}. Aborting.`);
    process.exit(2);
  }

  let success = 0;
  const batchSize = 400;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = db.batch();
    const slice = records.slice(i, i + batchSize);
    for (const rec of slice) {
      const ref = db.collection("alumni_theses").doc();
      batch.set(ref, {
        ...rec,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    success += slice.length;
    console.log(`  … ${success}/${records.length}`);
  }
  console.log(`✔ done: ${success}/${records.length} imported`);
  process.exit(0);
}

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

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
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

function normalizeYearMonth(raw) {
  if (!raw) return "";
  const m = String(raw).trim().match(/(\d{4})\s*\.\s*(\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${String(m[2]).padStart(2, "0")}`;
}

function splitKeywords(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[\/,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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
    graduationType: "thesis",
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
