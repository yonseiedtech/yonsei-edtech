// 사이클 68 — t값·F값 기초 용어 추가 (사용자 요청: p·t·f 값 개념 추가)
//  · p값(유의확률)은 사이클 63에 이미 존재 → 멱등 스킵. 검정통계량(t·F·χ²) 묶음 항목과 별개로
//    t·F 를 각각 독립 항목으로 분리(브라우즈·검색 발견성). 본문에서 상호 참조.
//  · 통계 용어는 archive_concepts(교육공학 이론)가 아니라 foundation_terms 에 — 사이클 44b 원칙
//  · category 는 FoundationTermCategory 유니온 값 "measurement" (사이클 63 카테고리 버그 교훈)
//  · 멱등: term 존재 시 스킵. 실행: npx tsx scripts/seed-tf-values.ts [--apply]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const now = () => new Date().toISOString();
const ex = (text: string) => ({ id: randomUUID(), text });

const TERMS = [
  {
    term: "t값 (t 통계량)",
    englishName: "t-statistic",
    category: "measurement",
    summary:
      "두 평균의 차이를 그 차이의 표준오차로 나눈 표준화 값으로, t-검정(독립·대응표본)과 회귀계수 유의성 검정에서 나온다. 't = 차이 ÷ 차이의 불확실성'이므로 절대값이 클수록 귀무가설(차이 없음)에서 멀고, 이 값과 자유도(df)에서 p값이 결정된다. 보고는 항상 자유도와 함께 t(58) = 2.31 처럼 쓰며, 효과크기 Cohen's d 와 짝을 이룬다. 표본이 작을수록 t분포의 꼬리가 두꺼워져 같은 t값이라도 유의성 판정이 보수적이 된다. 참고로 두 집단 비교에서는 F = t² 의 관계가 성립한다.",
    accessibleSummary:
      "'두 집단 평균 차이가 그 오차에 비해 몇 배인가'를 나타내는 점수예요. 클수록 우연한 차이로 보기 어렵고, 괄호 안 자유도(t(58))와 효과크기 d 와 함께 읽으면 됩니다.",
    examples: [
      ex("실험집단의 성취도가 통제집단보다 유의하게 높았다, t(58) = 2.31, p = .025, d = 0.60."),
      ex("회귀계수의 유의성은 각 예측변인의 t값과 p값으로 판단하였다."),
    ],
  },
  {
    term: "F값 (F 통계량)",
    englishName: "F-statistic",
    category: "measurement",
    summary:
      "두 분산의 비율로, '집단 간 변동이 집단 내 변동(오차)보다 몇 배 큰가'를 나타낸다. 분산분석(ANOVA·ANCOVA·MANOVA)과 회귀모형 전체의 유의성 검정에서 나온다. 비율이므로 항상 0 이상이고, 1에 가까우면 집단 차이가 오차 수준이라는 뜻이다. 분자·분모 두 개의 자유도와 함께 F(2, 87) = 5.41 처럼 보고하며, 앞 숫자(집단 수−1)와 뒤 숫자(사례 수−집단 수)에서 연구 규모를 역산할 수 있다. 효과크기 partial η² 와 짝을 이루고, 사후검정으로 어느 집단 쌍에서 차이가 났는지 확인한다. 집단이 둘뿐이면 F = t² 이 되어 t-검정과 동치다.",
    accessibleSummary:
      "'집단 사이의 차이가 집단 안의 흔들림보다 몇 배 큰가'를 나타내는 비율이에요. 셋 이상 집단을 한 번에 비교할 때(ANOVA) 나오고, F(2, 87)의 두 숫자로 몇 집단·몇 명인지까지 읽힙니다.",
    examples: [
      ex("수업 유형에 따른 성취도 차이는 유의하였다, F(2, 87) = 5.41, p = .006, partial η² = .11."),
      ex("F값이 유의하여 Tukey 사후검정으로 집단 간 차이를 추가 확인하였다."),
    ],
  },
];

async function main() {
  const ft = await db.collection("archive_foundation_terms").get();
  const existing = new Set(ft.docs.map((d) => (d.data() as { term?: string }).term ?? ""));
  // p값 존재 안내 (이미 있으면 추가 안 함)
  const pExists = [...existing].some((t) => t.startsWith("p값"));
  console.log(`p값 항목 ${pExists ? "이미 존재 (사이클 63) — 추가 안 함" : "없음"}`);

  let added = 0;
  for (const t of TERMS) {
    if (existing.has(t.term)) {
      console.log(`skip (존재): ${t.term}`);
      continue;
    }
    added += 1;
    console.log(`+ ${t.term}`);
    if (APPLY) {
      await db.collection("archive_foundation_terms").add({
        ...t,
        published: true,
        createdBy: "system:orchestra-cycle68",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }
  console.log(`\n신규 ${added} · ${APPLY ? "=== 적용 완료 ===" : "=== 드라이런 ==="}`);
}
void main();
