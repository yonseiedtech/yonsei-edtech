// 아카이브 미검수 기초용어 10건 — 한줄 요약·정의 작성 + 분류 교정 (2026-07-24)
//  · 웹 검색 근거 기반 원저작 정의(외부 문장 비복제)
//  · 8건 발행(approved/published), 2건 보류(held·사유) — 큐레이션 판단
//  · 실행: node scripts/seed-archive-foundation-defs-2026-07-24.js [--apply]
require("dotenv").config({ path: ".env.local" });
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });

const COL = "archive_foundation_terms";
const REVIEWER = "연세교육공학회 운영팀";
const REVIEWER_UID = "seed-archive-def";

// status: "approved"(발행) | "held"(보류)
const ITEMS = [
  {
    id: "AEgukiyMOIbEiqQFrUKp",
    term: "교육프로그램개발 모형",
    englishName: "Educational Program Development Model",
    category: "instructional-design",
    status: "approved",
    summary: "교육 프로그램을 체계적으로 기획·설계·개발하기 위한 절차적 틀.",
    definition:
      "학습 요구를 분석하여 목표를 설정하고 교수전략과 자료를 설계·개발한 뒤 실행·평가하는 단계를 규정한 모형이다. 교수체제설계(ISD) 전통에 기반하며, 분석–설계–개발–실행–평가로 이루어진 ADDIE가 대표적이다. 단계는 선형적으로도 순환적으로도 운용되며 프로그램의 지속적 개선을 지향한다.",
  },
  {
    id: "EmMKSHBblzDrI448QoZI",
    term: "기업교육공학",
    englishName: "Corporate Educational Technology (HRD)",
    category: "instructional-design",
    status: "approved",
    summary: "교육공학 원리를 기업·인적자원개발(HRD) 맥락에 적용하는 응용 분야.",
    definition:
      "조직 구성원의 역량을 기르기 위해 요구·과제·학습자·환경을 분석하고 교수학습이론과 테크놀로지를 활용해 교육 프로그램을 설계·개발·운영하는 분야이다. 개인·팀·조직을 분석 단위로 삼으며, 학습을 조직의 성과와 연결하는 전략적 성격을 지닌다.",
  },
  {
    id: "G3hDl7e3SxzzYJeaQwAo",
    term: "영향요인",
    englishName: "Influencing Factors",
    category: "variables",
    status: "held",
    reviewNote:
      "단독 개념이라기보다 변인들의 포괄적 표현 — 구체 변인(동기·자기효능감·환경 등)으로 분해하거나 태그로 두는 편이 적절. 분류·발행 여부 검토 요망.",
    summary: "특정 현상이나 성과에 영향을 미치는 변인들을 통칭하는 표현.",
    definition:
      "관심 결과(학습 성과·기술 수용·지속 등)에 작용하는 독립·매개·조절 변인을 포괄적으로 이르는 말이다. 연구에서는 구체적 변인으로 조작적으로 정의하여 측정하며, ‘무엇이 결과를 좌우하는가’를 규명할 때 분석 대상이 된다.",
  },
  {
    id: "UpZIkNCxCGERr5A3xxUI",
    term: "실제문제기반 교수학습환경",
    englishName: "Authentic Problem-Based Learning Environment",
    category: "instructional-design",
    status: "approved",
    summary: "현실의 비구조화된 문제를 중심으로 학습을 조직하는 구성주의 기반 학습환경.",
    definition:
      "학습자가 실제적이고 복잡한(비구조화된) 문제를 협력적으로 해결하며 스스로 지식을 구성하도록 설계된 학습환경이다. 교수자는 촉진자로서 자기주도학습·팀워크·비판적 사고를 지원한다. 문제중심학습(PBL)의 원리를 환경 설계 차원으로 구체화한 형태다.",
  },
  {
    id: "VVTxZ0PO0w9FmzmnV3OC",
    term: "초등 수학교육",
    englishName: "Elementary Mathematics Education",
    category: "learning-theory",
    status: "held",
    reviewNote:
      "기초 용어라기보다 연구·실천 도메인 — 용어 사전 항목보다 주제 태그/분류로 두는 편이 적절. 발행 여부 검토 요망.",
    summary: "초등학교 단계의 수학 교수·학습을 다루는 교육 연구·실천 영역.",
    definition:
      "초등학생을 대상으로 수 개념·연산·도형·측정 등 수학적 사고를 길러 주는 교수학습을 연구하고 실천하는 영역이다. 교육공학에서는 이 영역을 대상으로 매체·설계·평가 등을 적용한 연구가 이루어진다.",
  },
  {
    id: "ZnCz1xVrHQKvMS1koirb",
    term: "competency-based learning environment",
    englishName: "Competency-Based Learning Environment",
    category: "instructional-design",
    status: "approved",
    summary: "학습자가 역량(수행 능력)의 실제 달성을 중심으로 학습을 진행하는 학습환경.",
    definition:
      "진도나 이수 시간이 아니라 명시된 역량의 실제 달성 여부를 기준으로 학습을 조직·평가하는 환경이다. 학습자는 자신의 속도로 진행하고 수행 기반 평가로 숙달을 증명한다. 우리말로는 ‘역량기반/능력기반 학습환경’에 해당한다.",
  },
  {
    id: "hFKXd2LZc2rvxlZoa5w7",
    term: "Problem-based learning environment",
    englishName: "Problem-Based Learning Environment",
    category: "instructional-design",
    status: "approved",
    summary: "문제중심학습(PBL)을 구현하도록 설계된 구성주의 학습환경.",
    definition:
      "비구조화된 실제 문제를 출발점으로 삼아 학습자가 협력적으로 탐구·해결하며 지식을 구성하도록 설계된 학습환경이다. 교수자는 지식 전달자가 아니라 촉진자 역할을 한다. 우리말 ‘실제문제기반 교수학습환경’과 상통한다.",
  },
  {
    id: "k3qLiNuxSNS8P4QkhRyt",
    term: "교수학습환경",
    englishName: "Teaching-Learning Environment",
    category: "instructional-design",
    status: "approved",
    summary: "교수와 학습이 일어나는 물리적·사회적·기술적 맥락 전체.",
    definition:
      "학습이 이루어지는 물리적 공간, 상호작용 방식, 도구·자원, 지도 철학을 아우르는 총체적 맥락이다. 구성주의 관점에서는 학습자가 다양한 관점에서 정보를 해석하고 실제적 과제를 다루도록 풍부한 사례와 문제 상황을 제공하는 환경 설계가 강조된다.",
  },
  {
    id: "qMH9KWwwjoZH88IywLfi",
    term: "능력기반 교수학습",
    englishName: "Competency-Based Teaching and Learning",
    category: "instructional-design",
    status: "approved",
    summary: "정해진 역량의 실제 숙달을 기준으로 학습을 조직·평가하는 교수학습 접근.",
    definition:
      "이수 시간이나 진도가 아니라 학습자가 목표 역량을 실제로 수행할 수 있는지를 기준으로 학습을 진행하고 평가하는 접근이다. 수행 기반 평가와 개별화된 학습 경로를 특징으로 하며, 학습 결과에 대한 책무성을 강조한다.",
  },
  {
    id: "zTRzWbyzaYvBCKSiuZVY",
    term: "개발연구방법론",
    englishName: "Design and Development Research",
    category: "research-design",
    status: "approved",
    summary: "교수설계·개발의 산출물과 과정을 연구해 지식을 만들고 실천을 검증하는 연구방법.",
    definition:
      "교육공학 고유의 탐구 방식으로, 새로운 지식의 창출과 기존 실천의 타당화를 목적으로 한다. 크게 (1) 산출물·도구에 대한 연구와 (2) 설계·개발 모형에 대한 연구로 구분된다(Richey & Klein). 실제 설계·개발 실천에서 지식을 도출하는 데 초점을 둔다.",
  },
];

(async () => {
  const now = new Date().toISOString();
  const approve = ITEMS.filter((x) => x.status === "approved");
  const hold = ITEMS.filter((x) => x.status === "held");
  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — 총 ${ITEMS.length}건 (발행 ${approve.length} · 보류 ${hold.length})`);
  for (const it of ITEMS) {
    console.log(`  [${it.status === "approved" ? "발행" : "보류"}] ${it.term} → ${it.category} | 요약 ${it.summary.length}자 · 정의 ${it.definition.length}자`);
  }
  if (!APPLY) {
    console.log("\n(dry-run) 실제 반영하려면 --apply");
    process.exit(0);
  }

  for (const it of ITEMS) {
    const base = {
      summary: it.summary,
      definition: it.definition,
      category: it.category,
      englishName: it.englishName,
      reviewedBy: REVIEWER,
      reviewedByUid: REVIEWER_UID,
      reviewedAt: now,
      updatedAt: now,
    };
    const patch =
      it.status === "approved"
        ? { ...base, reviewStatus: "approved", published: true, reviewNote: "", lastReviewedAt: now }
        : { ...base, reviewStatus: "held", published: false, reviewNote: it.reviewNote };
    await db.collection(COL).doc(it.id).set(patch, { merge: true });
    console.log(`  ✅ ${it.term} (${it.status})`);
  }
  console.log(`\n🎉 완료 — 발행 ${approve.length}건 공개, 보류 ${hold.length}건은 검수 큐 보류 탭.`);
  process.exit(0);
})().catch((e) => { console.error("❌", e); process.exit(1); });
