// 사이클 60 — "사람의 무엇을 보고자 하는가" 변인 보강 (사용자 질문 기반)
//  · 갭: 기존 19변인 중 인지-사고(thinking) 계열 전무(성취도·인지부하 뿐) — 문제해결력·비판적 사고·
//    컴퓨팅 사고력·창의성·메타인지 등 학위논문 단골 종속변인 8종 시드
//  · 각 description 첫 문장에 구인 영역 프레임("사람의 무엇을 보는 변인인가") 명시 +
//    이름-측정 정렬 주의(자기보고로 재면 사고력이 아니라 효능감) 수록
//  · foundation_terms 에 "변인의 구인 영역" 용어 1종 — 교수님 단골 질문 자체를 지식화
//  · 멱등: 이름 존재 시 스킵. 실행: npx tsx scripts/seed-variable-domains.ts [--apply]
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

// 기존 개념 id (사이클 44 조회 결과 — 시드 시 실재 재확인)
const CONCEPT_IDS = {
  computationalThinking: "wGM73fJI29OtT94QMM8L",
  metacognition: "DVyadGcpTaJCMQfhkJLv",
  pbl: "ej6OkCuriOkwVWkuraMn",
};

const NEW_VARIABLES = [
  {
    name: "문제해결력",
    altNames: ["Problem Solving Ability", "문제해결 능력"],
    type: "cognitive",
    tags: ["인지-사고", "고차 사고"],
    description:
      "사람의 '사고(thinking)'를 보는 인지적 변인 — 비구조화된 문제 상황에서 해결 전략을 세우고 실행·평가하는 능력이다. 지식의 양이 아니라 지식을 사용하는 과정을 본다는 점에서 학업성취도(지식)와 구별된다. 측정은 수행과제+루브릭 채점이 원칙이며, 자기보고 설문으로 재면 실제로는 '문제해결 효능감(정의적)'을 측정한 것이 되므로 변인명과 도구를 정렬해야 한다. PBL·시뮬레이션 기반 수업의 대표 종속변인이다.",
    references: ["Jonassen, D. H. (2000). Toward a design theory of problem solving. ETR&D, 48(4), 63–85."],
    conceptIds: [CONCEPT_IDS.pbl],
  },
  {
    name: "비판적 사고",
    altNames: ["Critical Thinking", "비판적 사고력", "비판적 사고 성향"],
    type: "cognitive",
    tags: ["인지-사고", "고차 사고"],
    description:
      "사람의 '사고'를 보는 인지적 변인 — 정보와 주장의 타당성을 분석·평가·추론하는 능력이다. 능력(skill: 검사로 측정)과 성향(disposition: 자기보고로 측정)을 구분하는 것이 핵심으로, 연구 목적이 어느 쪽인지 먼저 정해야 도구(예: 능력은 수행검사, 성향은 리커트 척도)를 정당화할 수 있다. 토론·논증 중심 수업, AI 리터러시 교육의 종속변인으로 자주 쓰인다.",
    references: ["Facione, P. A. (1990). Critical Thinking: A Statement of Expert Consensus (The Delphi Report). California Academic Press."],
  },
  {
    name: "컴퓨팅 사고력(변인)",
    altNames: ["Computational Thinking", "CT 역량"],
    type: "cognitive",
    tags: ["인지-사고", "코딩교육"],
    description:
      "사람의 '사고'를 보는 인지적 변인 — 문제를 분해하고 패턴을 찾아 추상화·알고리즘으로 해결하는 사고 능력이다. 검사형(Bebras 문항, 수행 평가)과 자기보고형(CT 효능감 척도)이 혼용되는 영역이라, 측정 방식에 따라 보고하는 구인이 달라짐을 명시해야 한다. 소프트웨어·AI 교육 효과 연구의 표준 종속변인.",
    references: ["Wing, J. M. (2006). Computational thinking. Communications of the ACM, 49(3), 33–35."],
    conceptIds: [CONCEPT_IDS.computationalThinking],
  },
  {
    name: "창의성",
    altNames: ["Creativity", "창의적 사고", "창의적 문제해결"],
    type: "cognitive",
    tags: ["인지-사고", "고차 사고"],
    description:
      "사람의 '사고'를 보는 인지적 변인 — 새롭고 유용한 산출을 만들어내는 능력으로, 유창성·융통성·독창성·정교성 차원으로 분해해 측정하는 전통(TTCT 계열)이 있다. 산출물 평가(합의 평가 기법)와 검사, 자기보고가 모두 쓰이므로 어느 층위를 보는지 명시가 필요하다. 메이커 교육·생성형 AI 활용 수업 연구에서 수요가 늘고 있다.",
    references: ["Torrance, E. P. (1974). Torrance Tests of Creative Thinking. Scholastic Testing Service."],
  },
  {
    name: "메타인지(변인)",
    altNames: ["Metacognition", "메타인지 인식", "메타인지 전략"],
    type: "cognitive",
    tags: ["인지-사고", "자기조절"],
    description:
      "사람의 '사고에 대한 사고'를 보는 인지적 변인 — 자신의 인지 과정을 알고(메타인지적 지식) 점검·조절하는(메타인지적 조절) 능력이다. 자기보고 척도(MAI 등)가 흔하지만 사고구술·로그 기반 행동 지표로도 측정한다. 자기조절학습·스캐폴딩 연구의 핵심 종속변인이며, 아카이브의 '메타인지' 개념 문서와 연결된다.",
    references: ["Schraw, G., & Dennison, R. S. (1994). Assessing metacognitive awareness. Contemporary Educational Psychology, 19(4), 460–475."],
    conceptIds: [CONCEPT_IDS.metacognition],
  },
  {
    name: "지식 파지",
    altNames: ["Retention", "기억 파지", "지연 성취도"],
    type: "cognitive",
    tags: ["인지-지식"],
    description:
      "사람의 '아는 것(knowing)'을 보는 인지적 변인 — 학습 직후가 아니라 일정 시간이 지난 뒤에도 지식이 유지되는 정도다. 사후검사만 보는 성취도와 달리 지연검사(예: 2~4주 후)를 추가 설계해야 측정할 수 있다. 간격 반복·인출 연습 등 학습과학 처치의 효과를 보일 때 필수적인 변인이다.",
    references: ["Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. Psychological Science, 17(3), 249–255."],
  },
  {
    name: "학습 흥미",
    altNames: ["Interest", "상황적 흥미", "개인적 흥미"],
    type: "affective",
    tags: ["정의적", "동기"],
    description:
      "사람의 '마음가짐(태도)'을 보는 정의적 변인 — 특정 내용·활동에 끌리고 다시 찾게 되는 심리 상태다. 수업 장면에서 일시적으로 촉발되는 상황적 흥미와 안정적인 개인적 흥미를 구분하는 4단계 발달 모형(Hidi & Renninger)이 표준 틀이다. 게이미피케이션·멀티미디어 설계 연구에서 동기와 함께 자주 측정된다.",
    references: ["Hidi, S., & Renninger, K. A. (2006). The four-phase model of interest development. Educational Psychologist, 41(2), 111–127."],
  },
  {
    name: "학습 불안",
    altNames: ["Learning Anxiety", "시험 불안", "외국어 불안", "통계 불안"],
    type: "affective",
    tags: ["정의적", "부적 정서"],
    description:
      "사람의 '마음가짐(태도)'을 보는 정의적 변인 — 학습·평가 상황에서 느끼는 걱정과 긴장으로, 성취·참여를 저해하는 부적 정서다. 영역 특수성이 강해(시험 불안, 외국어 불안, 통계 불안, AI 사용 불안) 연구 맥락에 맞는 척도를 골라야 한다. 처치가 정서 장벽을 낮추는 효과를 주장할 때 종속변인으로 쓰인다.",
    references: ["Spielberger, C. D. (1980). Test Anxiety Inventory. Consulting Psychologists Press."],
  },
];

const DOMAIN_TERM = {
  term: "변인의 구인 영역 (인지·정의·행동)",
  englishName: "Construct Domains of Variables",
  category: "measurement-scale",
  summary:
    "\"이 연구에서 사람의 무엇을 보고자 하는가?\"라는 질문에 답하는 분류 틀이다. 종속변인은 통상 ① 인지적 영역 — 지식(무엇을 알게 되었나: 성취도·이해도·파지)과 사고(어떻게 생각하게 되었나: 문제해결력·비판적 사고·창의성·메타인지) ② 정의적 영역 — 마음가짐(무엇을 느끼게 되었나: 동기·자기효능감·몰입·흥미·태도·만족도) ③ 행동적 영역 — 행동(실제로 무엇을 하게 되었나: 참여도·지속의도·학습 로그)으로 나뉜다(Bloom의 교육목표 분류 전통). 점검 포인트는 정렬이다: 처치가 겨냥한 영역과 측정 변인의 영역이 일치하는가, 그리고 변인 이름과 측정 방식이 일치하는가 — '문제해결력'을 자기보고 설문으로 재면 실제로는 효능감(정의적)을 측정한 것이다.",
  accessibleSummary:
    "교수님이 \"그 연구는 사람의 무엇을 보는 거예요?\"라고 물으시면 — 아는 것(지식)·생각하는 힘(사고)·마음가짐(태도)·실제 행동 중 무엇인지 한 문장으로 답할 수 있어야 해요. 그리고 그 답과 측정 도구가 맞는지(사고력인데 설문으로 재고 있진 않은지)가 다음 점검입니다.",
  examples: [
    { id: randomUUID(), text: "본 연구는 AI 협업 수업이 학습자의 자기효능감(정의적)과 문제해결 수행(인지적-사고)에 미치는 효과를 검증한다." },
    { id: randomUUID(), text: "성취도(인지적-지식)는 지필검사로, 학습몰입(정의적)은 자기보고 척도로 측정해 변인과 도구를 정렬하였다." },
  ],
};

async function main() {
  // 개념 id 실재 확인 (잘못된 연결 방지)
  for (const [k, id] of Object.entries(CONCEPT_IDS)) {
    const d = await db.collection("archive_concepts").doc(id).get();
    if (!d.exists) console.log(`⚠ 개념 id 미존재 — ${k} 연결 제외 필요: ${id}`);
  }

  const vars = await db.collection("archive_variables").get();
  const existing = new Set(vars.docs.map((d) => (d.data() as { name?: string }).name ?? ""));
  let added = 0;
  for (const v of NEW_VARIABLES) {
    if (existing.has(v.name)) {
      console.log(`skip (존재): ${v.name}`);
      continue;
    }
    added += 1;
    console.log(`+ 변인: ${v.name} [${v.type}] ${v.conceptIds ? "← 개념 연결" : ""}`);
    if (APPLY) {
      await db.collection("archive_variables").add({
        ...v,
        measurementIds: [],
        conceptIds: v.conceptIds ?? [],
        published: true,
        createdBy: "system:orchestra-cycle60",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  const ft = await db.collection("archive_foundation_terms").get();
  const ftNames = new Set(ft.docs.map((d) => (d.data() as { term?: string }).term ?? ""));
  if (!ftNames.has(DOMAIN_TERM.term)) {
    console.log(`+ 기초 용어: ${DOMAIN_TERM.term}`);
    if (APPLY) {
      await db.collection("archive_foundation_terms").add({
        ...DOMAIN_TERM,
        published: true,
        createdBy: "system:orchestra-cycle60",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  } else {
    console.log(`skip (존재): ${DOMAIN_TERM.term}`);
  }

  console.log(`\n신규 변인 ${added} · ${APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ==="}`);
}
void main();
