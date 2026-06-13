// 사이클 75 — 기초 용어 "비슷하지만 다른 용어"(confusedWith) 보강
//  · 학생이 가장 헷갈리는 측정·통계 용어 페어 — 명확한 구분 설명 (자신 있게 작성 가능, 저위험)
//  · 멱등: 해당 term 에 confusedWith 없을 때만 추가 (기존 보존)
// 실행: npx tsx scripts/seed-confused-with.ts [--apply]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const cw = (label: string, distinction: string) => ({ id: randomUUID(), confusedTermLabel: label, distinction });

// term 이름 → confusedWith 항목들
const MAP: Record<string, { confusedTermLabel: string; distinction: string }[]> = {
  "모수 통계": [cw("비모수 통계", "모수 통계는 정규분포 등 분포 가정 위에서 평균·분산을 검정한다(t·ANOVA·회귀). 비모수 통계는 분포 가정 없이 순위로 검정한다(Mann-Whitney·Kruskal-Wallis). 가정이 충족되면 모수가 검정력이 높고, 표본이 작거나 서열 자료면 비모수를 쓴다.")],
  "비모수 통계": [cw("모수 통계", "비모수는 분포 가정 없이 순위로 검정(소표본·서열·정규성 위반 시). 모수는 정규분포 가정 위에서 평균을 검정(가정 충족 시 검정력 우위). '안전하니 무조건 비모수'는 검정력 손해.")],
  "p값 (유의확률)": [cw("효과크기", "p값은 '효과가 있는가'(통계적 유의성)를, 효과크기는 '얼마나 큰가'(실질적 크기)를 답한다. 표본이 크면 미미한 차이도 p<.001이 되므로 둘을 함께 보고해야 한다.")],
  "효과크기": [cw("p값 (유의확률)", "효과크기는 '효과의 크기'(d·η²·r)를, p값은 '효과의 유무'(유의성)를 나타낸다. p값은 표본 크기에 민감하지만 효과크기는 비교적 독립적이다.")],
  "명목척도": [cw("서열척도", "명목은 구분만(성별·전공 — 순서 없음), 서열은 구분+순서(석차·만족도 상중하 — 간격은 불균등). 명목은 빈도·최빈값, 서열은 중앙값까지.")],
  "서열척도": [cw("등간척도", "서열은 순서만 알고 간격이 불균등(1·2등 차이≠2·3등 차이), 등간은 간격이 동일해 평균·표준편차 가능(리커트 합산·표준점수). 서열은 비모수, 등간은 모수.")],
  "등간척도": [cw("비율척도", "등간은 절대영점이 없어 비율 해석 불가(섭씨 20도≠10도의 2배), 비율은 절대영점이 있어 '2배' 가능(학습시간·횟수). 통계 가능 범위는 동일하나 비율만 기하평균·변동계수 가능.")],
  "비율척도": [cw("등간척도", "비율은 0이 '진짜 없음'이라 비율 해석 가능(60분=30분의 2배), 등간은 0이 임의 기준이라 비율 불가(IQ·온도). 둘 다 평균·t·ANOVA 가능.")],
  "표본": [cw("표집", "표본(sample)은 '뽑힌 대상의 집합'(명사·결과), 표집(sampling)은 '뽑는 과정·방법'(동사·절차). '표본 300명을 확률 표집으로 선정'처럼 함께 쓴다.")],
  "표집": [cw("표본", "표집은 모집단에서 표본을 뽑는 '방법'(확률/비확률), 표본은 그 결과로 얻은 '대상 집합'. 표집 방법이 표본의 대표성을 결정한다.")],
  "신뢰구간 (CI)": [cw("신뢰도", "이름이 비슷하지만 전혀 다르다. 신뢰구간(CI)은 '모수가 있을 법한 범위'(추정의 정밀도), 신뢰도(reliability)는 '측정도구의 일관성'(Cronbach α 등). CI는 추론통계, 신뢰도는 측정이론 개념.")],
  "Cohen's d": [cw("부분에타제곱 (partial η²)", "둘 다 효과크기지만 분석이 다르다. Cohen's d는 두 집단 평균 차(t-test 짝, 0.2/0.5/0.8), partial η²는 분산 설명 비율(ANOVA 짝, .01/.06/.14).")],
  "검정통계량 (t·F·χ²)": [cw("p값 (유의확률)", "검정통계량(t·F·χ²)은 '귀무가설에서 얼마나 떨어졌나'(표준화 거리), p값은 그 통계량에서 계산되는 '우연일 확률'. 검정통계량이 클수록 p값이 작다.")],
  "질적 척도와 양적 척도": [cw("질적 연구 vs 양적 연구", "'질적 척도'(명목·서열)는 양적 연구 안에서 변수의 측정 수준을 가리키는 말이고, '질적 연구'는 면담·관찰을 해석하는 연구 패러다임이다. 성별(질적 척도)을 묻는 설문 연구도 양적 연구다.")],
};

async function main() {
  const ft = await db.collection("archive_foundation_terms").get();
  let updated = 0;
  const missing: string[] = [];
  for (const [term, items] of Object.entries(MAP)) {
    const doc = ft.docs.find((d) => (d.data() as { term?: string }).term === term);
    if (!doc) { missing.push(term); continue; }
    const x = doc.data() as { confusedWith?: unknown[] };
    if (Array.isArray(x.confusedWith) && x.confusedWith.length > 0) { console.log(`skip(보유): ${term}`); continue; }
    updated++;
    console.log(`+ ${term} ← ${items.map((i) => i.confusedTermLabel).join(", ")}`);
    if (APPLY) await db.collection("archive_foundation_terms").doc(doc.id).update({
      confusedWith: items.map((i) => ({ id: randomUUID(), confusedTermLabel: i.confusedTermLabel, distinction: i.distinction })),
      updatedAt: new Date().toISOString(),
    });
  }
  console.log(`\n갱신 ${updated} · 미발견 ${missing.length}${missing.length ? " (" + missing.join(", ") + ")" : ""}`);
  console.log(APPLY ? "=== 적용 ===" : "=== 드라이런 ===");
}
void main();
