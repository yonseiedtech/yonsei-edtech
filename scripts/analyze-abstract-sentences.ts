// 사이클 71 — 졸업생 초록 "문장 단위" 특징 분석 (사용자 질문: 문장 단위 특징 있어?)
//  · 문장 길이·시제(과거/현재)·태(능동/피동)·도입 문장·접속 표현·관용 동사구 집계
//  · 읽기 전용 분석 (Firestore 쓰기 없음). 실행: npx tsx scripts/analyze-abstract-sentences.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=다)\.\s+|(?<=[가-힣])\.\s+(?=[가-힣A-Z])/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s.length > 5);
}

async function main() {
  const snap = await db.collection("alumni_theses").get();
  const sentLens: number[] = []; // 문장 길이(자)
  let totalSent = 0;
  let past = 0; // 과거시제 종결
  let present = 0; // 현재/일반 종결
  let other = 0;
  let passive = 0; // 피동 표현 포함 문장
  let doublePassive = 0; // 이중피동(보여진다 등)
  let abstractsAnalyzed = 0;
  let openWithStudy = 0; // 첫 문장 "본 연구는"

  const connectives: Record<string, number> = {
    "이를 위해": 0, "그 결과": 0, "따라서": 0, "또한": 0,
    "한편": 0, "그러나": 0, "본 연구": 0, "이러한": 0,
  };
  const purposeVerbs: Record<string, number> = {
    "목적으로": 0, "검증하": 0, "규명하": 0, "알아보": 0, "탐색하": 0, "확인하": 0, "분석하고자": 0,
  };
  const resultVerbs: Record<string, number> = {
    "나타났다": 0, "유의한": 0, "차이": 0, "영향을 미치": 0, "상관": 0, "효과가": 0,
  };

  for (const d of snap.docs) {
    const ab = ((d.data() as { abstract?: string }).abstract ?? "").trim();
    if (ab.length < 80) continue;
    abstractsAnalyzed += 1;
    const ss = sentences(ab);
    if (ss.length === 0) continue;
    if (/^본\s*연구(는|에서는)/.test(ss[0])) openWithStudy += 1;

    for (const key of Object.keys(connectives)) if (ab.includes(key)) connectives[key] += 1;
    for (const key of Object.keys(purposeVerbs)) if (ab.includes(key)) purposeVerbs[key] += 1;
    for (const key of Object.keys(resultVerbs)) if (ab.includes(key)) resultVerbs[key] += 1;

    for (const s of ss) {
      totalSent += 1;
      sentLens.push(s.length);
      const tail = s.slice(-6);
      if (/(았|었|였)다$/.test(s) || /(하였|되었|었|았|였)다$/.test(tail)) past += 1;
      else if (/(이다|한다|ㄴ다|는다|된다|진다|win)$/.test(s) || /다$/.test(s)) present += 1;
      else other += 1;
      // 피동: 되었다/되어/이루어/여겨/받아 등
      if (/(되었|되어|이루어|여겨|보여|받아들여|제시되|수행되|진행되)/.test(s)) passive += 1;
      if (/(보여진|되어진|모여진|쓰여진|이루어진다)/.test(s)) doublePassive += 1;
    }
  }

  const pctSent = (n: number) => `${Math.round((n / totalSent) * 100)}%`;
  const pctAb = (n: number) => `${Math.round((n / abstractsAnalyzed) * 100)}%`;
  console.log(`=== 졸업생 초록 문장 단위 분석 (초록 ${abstractsAnalyzed}편 · 총 ${totalSent}문장) ===\n`);
  console.log(`■ 문장 길이(자): 최소 ${Math.min(...sentLens)} · 중앙값 ${median(sentLens)} · 평균 ${Math.round(sentLens.reduce((a, b) => a + b, 0) / sentLens.length)} · 최대 ${Math.max(...sentLens)}`);
  console.log(`   (한국어 학술문 권장 40~60자 대비 비교용)\n`);
  console.log(`■ 시제: 과거형 종결 ${past} (${pctSent(past)}) · 현재/일반 ${present} (${pctSent(present)}) · 기타 ${other}`);
  console.log(`■ 피동 표현 포함 문장: ${passive} (${pctSent(passive)}) · 이중피동(부적절): ${doublePassive}문장`);
  console.log(`■ 첫 문장 "본 연구는…" 시작: ${openWithStudy}편 (${pctAb(openWithStudy)})\n`);
  console.log("■ 접속·전환 표현 사용 초록 비율:");
  for (const [k, v] of Object.entries(connectives).sort((a, b) => b[1] - a[1])) console.log(`   "${k}": ${pctAb(v)}`);
  console.log("\n■ 목적 문장 관용구:");
  for (const [k, v] of Object.entries(purposeVerbs).sort((a, b) => b[1] - a[1])) console.log(`   "${k}": ${pctAb(v)}`);
  console.log("\n■ 결과 문장 관용구:");
  for (const [k, v] of Object.entries(resultVerbs).sort((a, b) => b[1] - a[1])) console.log(`   "${k}": ${pctAb(v)}`);
}
void main();
