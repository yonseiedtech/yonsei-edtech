// 순화어 병기 — 노션 용어사전집(docs/plans/notion-purified-terms.json)의 53개 매칭후보를
// 아카이브 4개 컬렉션(archive_concepts / archive_research_methods /
// archive_statistical_methods / archive_foundation_terms)의 용어명과 매칭해 purifiedName 을 세팅한다.
//
//  · 매칭 키: original(기존용어) 또는 english(영어명) ↔ 용어명(name/altNames/term/englishName/abbreviation)
//  · 정규화(소문자·공백/구두점 제거) 후 "정확 일치"만 인정 — 억지 매칭 금지
//  · 멱등: 이미 purifiedName 이 있는 문서는 보존(운영진 수동 보정 존중)
//  · 노션 원본 순화어 그대로 반영(검수 없이) — 운영진이 폼에서 수정 가능
//
// 실행: npx tsx scripts/seed-purified-names.ts          (드라이런 — 매칭 결과만 출력)
//       npx tsx scripts/seed-purified-names.ts --apply  (적용)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"),
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

interface PurifiedTerm {
  original: string;
  purified: string;
  english: string;
  course: string;
}

/** 정규화: 소문자 + 공백·구두점 제거 → 표기 흔들림(띄어쓰기·괄호·하이픈)에도 정확 일치 */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-_·,.()[\]:;'"]/g, "")
    .trim();
}

const terms: PurifiedTerm[] = JSON.parse(
  readFileSync(resolve(process.cwd(), "docs/plans/notion-purified-terms.json"), "utf8"),
);

// 매칭 후보 인덱스: 정규화 키 → 순화어. original 과 english 양쪽을 키로 등록.
// purified 가 비어 있는 항목은 매칭 대상에서 제외(병기할 순화어가 없음).
const index = new Map<string, { purified: string; sourceLabel: string }>();
for (const t of terms) {
  const purified = (t.purified ?? "").trim();
  if (!purified) continue;
  const label = `${t.original || t.english}`;
  for (const key of [t.original, t.english]) {
    const k = (key ?? "").trim();
    if (!k) continue;
    const nk = norm(k);
    if (!nk) continue;
    if (!index.has(nk)) index.set(nk, { purified, sourceLabel: label });
  }
}

type Collection = {
  name: string;
  /** 문서에서 매칭에 쓸 후보 문자열들 추출 */
  candidates: (data: Record<string, unknown>) => string[];
  /** 표시용 라벨 */
  display: (data: Record<string, unknown>) => string;
};

const COLLECTIONS: Collection[] = [
  {
    name: "archive_concepts",
    candidates: (d) => [
      ...(typeof d.name === "string" ? [d.name] : []),
      ...(Array.isArray(d.altNames) ? (d.altNames as string[]) : []),
    ],
    display: (d) => String(d.name ?? "(이름없음)"),
  },
  {
    name: "archive_research_methods",
    candidates: (d) => (typeof d.name === "string" ? [d.name] : []),
    display: (d) => String(d.name ?? "(이름없음)"),
  },
  {
    name: "archive_statistical_methods",
    candidates: (d) => (typeof d.name === "string" ? [d.name] : []),
    display: (d) => String(d.name ?? "(이름없음)"),
  },
  {
    name: "archive_foundation_terms",
    candidates: (d) => [
      ...(typeof d.term === "string" ? [d.term] : []),
      ...(typeof d.englishName === "string" ? [d.englishName] : []),
      ...(typeof d.abbreviation === "string" ? [d.abbreviation] : []),
    ],
    display: (d) => String(d.term ?? "(이름없음)"),
  },
];

async function main() {
  console.log(
    `노션 순화어 후보 ${terms.length}건 (순화어 보유 매칭키 ${index.size}개)\n`,
  );

  let totalMatched = 0;
  let totalSkipped = 0;
  const matchedSourceLabels = new Set<string>();

  for (const col of COLLECTIONS) {
    const snap = await db.collection(col.name).get();
    let matched = 0;
    let skipped = 0;
    const lines: string[] = [];

    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      // 후보 중 하나라도 인덱스에 정확 일치하면 매칭
      let hit: { purified: string; sourceLabel: string } | undefined;
      for (const c of col.candidates(data)) {
        const nk = norm(c);
        if (nk && index.has(nk)) {
          hit = index.get(nk);
          break;
        }
      }
      if (!hit) continue;

      matchedSourceLabels.add(hit.sourceLabel);

      // 멱등: 이미 purifiedName 있으면 보존
      const existing = (data.purifiedName as string | undefined)?.trim();
      if (existing) {
        skipped += 1;
        continue;
      }

      matched += 1;
      lines.push(`  ■ ${col.display(data)}  →  순화어: ${hit.purified}  (노션: ${hit.sourceLabel})`);
      if (APPLY) {
        await db
          .collection(col.name)
          .doc(doc.id)
          .update({ purifiedName: hit.purified, updatedAt: new Date().toISOString() });
      }
    }

    totalMatched += matched;
    totalSkipped += skipped;
    console.log(`[${col.name}] 문서 ${snap.size}개 · 신규매칭 ${matched} · 기존보존 ${skipped}`);
    if (lines.length) console.log(lines.join("\n"));
    console.log("");
  }

  // 매칭되지 않은 노션 항목(순화어 보유분 기준)
  const unmatched = terms
    .filter((t) => (t.purified ?? "").trim())
    .filter((t) => {
      const label = `${t.original || t.english}`;
      return !matchedSourceLabels.has(label);
    });

  console.log(`=== 요약 ===`);
  console.log(`신규 매칭(병기 적용): ${totalMatched}건`);
  console.log(`기존 purifiedName 보존(멱등): ${totalSkipped}건`);
  console.log(`미매칭 노션 항목: ${unmatched.length}건`);
  if (unmatched.length) {
    console.log(
      unmatched
        .map((t) => `  - ${t.original || "(원어없음)"}${t.english ? ` / ${t.english}` : ""}  →  ${t.purified}`)
        .join("\n"),
    );
  }
  console.log(APPLY ? "\n=== 적용 완료 ===" : "\n=== 드라이런 — --apply 로 저장 ===");
}

void main().then(() => process.exit(0));
