// 사이클 54 — 교육공학 세미나 수업자료 기반 학습이론 개념 보강
//  · 출처: 주차별 강의 주제 구조(2~14주차)에서 다루는 이론 식별 → 내용은 전부 재서술(저작권 안전)
//    슬라이드 문장·강의자 설명은 복사하지 않고, 학계 통설과 검증된 원전 서지만 수록한다.
//  · 원전 DOI 6건 Crossref 제목 일치 검증 완료 (2026-06-13):
//    Watson 1913 · Ertmer&Newby 2013 · Jonassen&Rohrer-Murphy 1999 · Cobb et al. 2003
//    Wood,Bruner&Ross 1976 · Ouyang&Jiao 2021. 단행본은 서지만(url=null).
//  · 멱등: 이름이 이미 존재하는 개념/가이드는 건너뜀, AI 개념 보강은 keyScholars 없을 때만.
// 실행: npx tsx scripts/seed-learning-theories.ts          (드라이런)
//       npx tsx scripts/seed-learning-theories.ts --apply  (적용)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const doi = (d: string) => `https://doi.org/${d}`;
const now = () => new Date().toISOString();

interface SeminalWork {
  citation: string;
  url: string | null;
  openAccess: boolean;
}

interface NewConcept {
  name: string;
  altNames: string[];
  tags: string[];
  description: string;
  references: string[];
  keyScholars: string[];
  seminalWorks: SeminalWork[];
}

const NEW_CONCEPTS: NewConcept[] = [
  {
    name: "행동주의",
    altNames: ["Behaviorism"],
    tags: ["학습이론", "기초이론"],
    description:
      "학습을 관찰 가능한 행동의 변화로 정의하는 학습이론이다. 자극과 반응의 연합, 그리고 강화와 처벌에 의한 행동 형성을 핵심 기제로 본다. Thorndike의 효과의 법칙, Pavlov의 고전적 조건형성, Skinner의 조작적 조건형성이 대표적 갈래다. 교육공학에서는 행동목표 진술, 프로그램 학습(CAI), 완전학습, 즉각적 피드백 설계의 이론적 뿌리가 되었으며, 오늘날 게이미피케이션의 보상 설계나 적응형 드릴 시스템에도 그 원리가 남아 있다.",
    references: [
      "Watson, J. B. (1913). Psychology as the behaviorist views it. Psychological Review, 20(2), 158–177.",
      "Skinner, B. F. (1938). The Behavior of Organisms. Appleton-Century.",
      "Ertmer, P. A., & Newby, T. J. (2013). Behaviorism, cognitivism, constructivism: Comparing critical features from an instructional design perspective. Performance Improvement Quarterly, 26(2), 43–71.",
    ],
    keyScholars: ["B. F. Skinner", "John B. Watson", "Edward L. Thorndike", "Ivan Pavlov"],
    seminalWorks: [
      {
        citation: "Watson, J. B. (1913). Psychology as the behaviorist views it. Psychological Review, 20(2), 158–177.",
        url: doi("10.1037/h0074428"),
        openAccess: false,
      },
      {
        citation: "Skinner, B. F. (1938). The Behavior of Organisms: An Experimental Analysis. Appleton-Century. (단행본)",
        url: null,
        openAccess: false,
      },
    ],
  },
  {
    name: "인지주의",
    altNames: ["Cognitivism", "정보처리이론"],
    tags: ["학습이론", "기초이론"],
    description:
      "학습을 외적 행동이 아니라 지식의 내적 표상과 정신 과정(주의·부호화·저장·인출)의 변화로 설명하는 학습이론이다. 감각기억–작업기억–장기기억으로 이어지는 정보처리 모형과 스키마 이론이 골격을 이룬다. 교수설계에서는 선행조직자, 청킹, 정교화, 인지부하 관리 같은 전략의 근거가 되며, 행동주의에서 구성주의로 넘어가는 가교 역할을 했다. 멀티미디어 학습 인지이론(CTML)과 인지부하 이론은 이 전통의 교육공학적 발전형이다.",
    references: [
      "Ertmer, P. A., & Newby, T. J. (2013). Behaviorism, cognitivism, constructivism: Comparing critical features from an instructional design perspective. Performance Improvement Quarterly, 26(2), 43–71.",
      "Driscoll, M. P. (2005). Psychology of Learning for Instruction (3rd ed.). Pearson.",
    ],
    keyScholars: ["Richard C. Atkinson", "Richard M. Shiffrin", "David Ausubel"],
    seminalWorks: [
      {
        citation: "Ertmer, P. A., & Newby, T. J. (2013). Behaviorism, cognitivism, constructivism: Comparing critical features from an instructional design perspective. Performance Improvement Quarterly, 26(2), 43–71. (3대 학습이론 비교의 고전)",
        url: doi("10.1002/piq.21143"),
        openAccess: false,
      },
      {
        citation: "Driscoll, M. P. (2005). Psychology of Learning for Instruction (3rd ed.). Pearson. (단행본)",
        url: null,
        openAccess: false,
      },
    ],
  },
  {
    name: "구성주의",
    altNames: ["Constructivism", "인지적 구성주의"],
    tags: ["학습이론", "기초이론"],
    description:
      "지식은 외부에서 전달되는 것이 아니라 학습자가 능동적으로 구성한다고 보는 학습이론이다. Piaget는 학습자가 새로운 경험을 기존 스키마에 동화(assimilation)하거나 스키마 자체를 조절(accommodation)하며 평형화를 이루는 과정으로 인지발달을 설명했고, 감각운동기–전조작기–구체적 조작기–형식적 조작기의 발달 단계를 제시했다. 교육공학에서는 학습자 중심 환경 설계, 문제기반학습, 발견학습, 풍부한 맥락을 제공하는 테크놀로지 활용의 이론적 토대다.",
    references: [
      "Piaget, J. (1954). The Construction of Reality in the Child. Basic Books.",
      "Ertmer, P. A., & Newby, T. J. (2013). Behaviorism, cognitivism, constructivism: Comparing critical features from an instructional design perspective. Performance Improvement Quarterly, 26(2), 43–71.",
    ],
    keyScholars: ["Jean Piaget"],
    seminalWorks: [
      {
        citation: "Piaget, J. (1954). The Construction of Reality in the Child. Basic Books. (단행본)",
        url: null,
        openAccess: false,
      },
      {
        citation: "Ertmer, P. A., & Newby, T. J. (2013). Behaviorism, cognitivism, constructivism. Performance Improvement Quarterly, 26(2), 43–71.",
        url: doi("10.1002/piq.21143"),
        openAccess: false,
      },
    ],
  },
  {
    name: "사회적 구성주의",
    altNames: ["Social Constructivism", "사회문화이론"],
    tags: ["학습이론", "기초이론"],
    description:
      "지식 구성이 개인 내부가 아니라 사회적 상호작용과 문화적 맥락 속에서 일어난다고 보는 학습이론이다. Vygotsky는 학습자가 혼자 해낼 수 있는 수준과 더 유능한 타인의 도움으로 해낼 수 있는 수준 사이의 근접발달영역(ZPD)을 제안했고, 언어를 비롯한 문화적 도구가 사고 발달을 매개한다고 보았다. 협력학습, 스캐폴딩, 학습공동체, 온라인 토론 설계 등 교육공학의 사회적 학습 설계 전반에 깊은 영향을 주었다.",
    references: [
      "Vygotsky, L. S. (1978). Mind in Society: The Development of Higher Psychological Processes. Harvard University Press.",
    ],
    keyScholars: ["Lev S. Vygotsky"],
    seminalWorks: [
      {
        citation: "Vygotsky, L. S. (1978). Mind in Society: The Development of Higher Psychological Processes. Harvard University Press. (단행본)",
        url: null,
        openAccess: false,
      },
    ],
  },
  {
    name: "구성주의적 구축주의",
    altNames: ["Constructionism", "구축주의"],
    tags: ["학습이론", "코딩교육"],
    description:
      "Papert가 Piaget의 구성주의를 확장해 제안한 이론으로, 학습자가 의미 있는 산출물(공유 가능한 인공물)을 직접 만들 때 지식 구성이 가장 효과적으로 일어난다고 본다. 아동이 거북이 그래픽을 프로그래밍하며 수학적 사고를 체득하는 Logo 언어가 대표 사례다. '만들며 배우기(learning by making)'라는 정신은 오늘날 코딩 교육, 메이커 교육, 피지컬 컴퓨팅, 블록형 프로그래밍 환경(Scratch 등)의 직접적 뿌리이며, 컴퓨팅 사고력 교육 논의의 출발점이기도 하다.",
    references: [
      "Papert, S., & Harel, I. (1991). Situating constructionism. In I. Harel & S. Papert (Eds.), Constructionism (pp. 1–11). Ablex.",
      "Papert, S. (1980). Mindstorms: Children, Computers, and Powerful Ideas. Basic Books.",
      "Ackermann, E. (2001). Piaget's constructivism, Papert's constructionism: What's the difference? Future of Learning Group Publication, 5(3), 438.",
    ],
    keyScholars: ["Seymour Papert"],
    seminalWorks: [
      {
        citation: "Papert, S. (1980). Mindstorms: Children, Computers, and Powerful Ideas. Basic Books. (단행본)",
        url: null,
        openAccess: false,
      },
      {
        citation: "Papert, S., & Harel, I. (1991). Situating constructionism. In Constructionism (pp. 1–11). Ablex. (책 챕터)",
        url: null,
        openAccess: false,
      },
    ],
  },
  {
    name: "활동이론",
    altNames: ["Activity Theory", "CHAT", "문화역사적 활동이론"],
    tags: ["학습이론", "분석 프레임워크"],
    description:
      "인간의 활동을 개인–도구–대상의 매개 관계(1세대, Vygotsky)에서 출발해, 규칙·공동체·분업까지 포함한 활동체계(2세대, Leont'ev·Engeström), 나아가 복수 활동체계 간 상호작용과 모순(3세대, Engeström)으로 확장해 분석하는 프레임워크다. 학습을 고립된 개인의 인지가 아니라 역사적·문화적으로 형성된 활동체계 속에서 파악한다. 교육공학에서는 테크놀로지 도입이 일으키는 수업 체계의 모순 분석, 구성주의 학습환경 설계, HCI 연구의 분석틀로 널리 쓰인다.",
    references: [
      "Jonassen, D. H., & Rohrer-Murphy, L. (1999). Activity theory as a framework for designing constructivist learning environments. Educational Technology Research and Development, 47(1), 61–79.",
      "Engeström, Y. (1987). Learning by Expanding: An Activity-Theoretical Approach to Developmental Research. Orienta-Konsultit.",
    ],
    keyScholars: ["Yrjö Engeström", "Aleksei N. Leont'ev", "David H. Jonassen"],
    seminalWorks: [
      {
        citation: "Jonassen, D. H., & Rohrer-Murphy, L. (1999). Activity theory as a framework for designing constructivist learning environments. ETR&D, 47(1), 61–79.",
        url: doi("10.1007/BF02299477"),
        openAccess: false,
      },
      {
        citation: "Engeström, Y. (1987). Learning by Expanding. Orienta-Konsultit. (단행본)",
        url: null,
        openAccess: false,
      },
    ],
  },
  {
    name: "상황학습",
    altNames: ["Situated Learning", "상황인지"],
    tags: ["학습이론"],
    description:
      "지식은 그것이 사용되는 실제 맥락(상황)과 분리될 수 없으며, 학습은 실천공동체에 참여하는 과정 그 자체라고 보는 이론이다. Lave와 Wenger는 신참이 공동체 주변부의 정당한 활동부터 점차 핵심 실천으로 옮겨가는 합법적 주변 참여(LPP)를 학습의 본질로 제시했다. 교육공학에서는 실제적 과제(authentic task) 설계, 인지적 도제, 사례기반학습, 시뮬레이션·VR 기반 몰입 학습환경의 이론적 근거가 된다. 학습공동체(CoP) 개념과 직접 연결된다.",
    references: [
      "Lave, J., & Wenger, E. (1991). Situated Learning: Legitimate Peripheral Participation. Cambridge University Press.",
      "Brown, J. S., Collins, A., & Duguid, P. (1989). Situated cognition and the culture of learning. Educational Researcher, 18(1), 32–42.",
    ],
    keyScholars: ["Jean Lave", "Etienne Wenger"],
    seminalWorks: [
      {
        citation: "Lave, J., & Wenger, E. (1991). Situated Learning: Legitimate Peripheral Participation. Cambridge University Press. (단행본)",
        url: null,
        openAccess: false,
      },
    ],
  },
  {
    name: "스캐폴딩",
    altNames: ["Scaffolding", "비계설정"],
    tags: ["교수전략", "학습지원"],
    description:
      "학습자가 혼자서는 해결하기 어려운 과제를 수행하도록 더 유능한 조력자(교사·동료·시스템)가 제공하는 한시적 지원을 말한다. Wood, Bruner, Ross가 튜터링 연구에서 처음 개념화했고, Vygotsky의 근접발달영역(ZPD)과 결합하며 교수 이론의 핵심 개념이 되었다. 지원은 학습자 수준에 맞춰 조절되고 숙달에 따라 점진적으로 제거(fading)되는 것이 본질이다. 교육공학에서는 지능형 튜터링 시스템의 힌트 설계, 온라인 탐구학습의 절차적·메타인지적 지원, 프롬프트 기반 글쓰기 지원 등으로 구현된다.",
    references: [
      "Wood, D., Bruner, J. S., & Ross, G. (1976). The role of tutoring in problem solving. Journal of Child Psychology and Psychiatry, 17(2), 89–100.",
      "Vygotsky, L. S. (1978). Mind in Society. Harvard University Press.",
    ],
    keyScholars: ["David Wood", "Jerome S. Bruner", "Gail Ross"],
    seminalWorks: [
      {
        citation: "Wood, D., Bruner, J. S., & Ross, G. (1976). The role of tutoring in problem solving. Journal of Child Psychology and Psychiatry, 17(2), 89–100.",
        url: doi("10.1111/j.1469-7610.1976.tb00381.x"),
        openAccess: false,
      },
    ],
  },
];

/** 기존 "교육에서의 인공지능" 개념 보강 — 3 패러다임 원전 (keyScholars 비어 있을 때만) */
const AI_ENRICH = {
  name: "교육에서의 인공지능",
  keyScholars: ["Fan Ouyang"],
  seminalWorks: [
    {
      citation:
        "Ouyang, F., & Jiao, P. (2021). Artificial intelligence in education: The three paradigms. Computers and Education: Artificial Intelligence, 2, 100020. (AI-directed·AI-supported·AI-empowered 3 패러다임)",
      url: doi("10.1016/j.caeai.2021.100020"),
      openAccess: true,
    },
  ] as SeminalWork[],
};

/** 신규 연구방법 가이드 — 설계기반연구(DBR) */
const DBR_GUIDE = {
  name: "설계기반연구(DBR)",
  kind: "혼합/현장 연구",
  summary: "실제 교육 현장에서 설계–실행–분석–재설계를 반복하며 이론과 실천적 해결책을 함께 발전시키는 연구방법",
  description:
    "설계기반연구(Design-Based Research)는 통제된 실험실이 아닌 실제 수업 맥락에서 교육적 개입(프로그램·도구·환경)을 설계하고, 실행 결과를 분석해 설계 원리를 수정하는 반복(iteration) 과정을 통해 '쓸모 있는 이론'과 '작동하는 해결책'을 동시에 추구한다. 연구자와 현장 교사가 협력 파트너로 참여하며, 각 반복 주기의 설계 결정과 수정 근거를 투명하게 기록하는 것이 타당성의 핵심이다. 산출물 완성이 목적인 ADDIE 같은 교수설계 모형과 달리, DBR의 일차 목적은 맥락 속에서 검증된 설계 원리(이론)의 도출이다.",
  procedures: [
    "1. 문제 분석 — 현장 실천가와 협력해 실제 교육 문제와 맥락을 정의",
    "2. 해결안 설계 — 기존 설계 원리·이론·테크놀로지를 토대로 개입 설계",
    "3. 실행과 반복 — 현장 적용 후 자료 수집·분석, 설계 수정을 수차례 반복",
    "4. 성찰과 일반화 — 반복 전체를 회고해 설계 원리를 정련하고 이론으로 보고",
  ],
  strengths: [
    "실험실 연구의 생태학적 타당성 한계를 보완 — 실제 맥락에서 작동 여부를 검증",
    "이론 산출과 실천 개선을 동시에 달성",
    "반복 설계로 개입이 점진적으로 정교해짐",
  ],
  limitations: [
    "맥락 의존성이 높아 결과의 일반화에 신중해야 함",
    "장기간·다회 반복로 연구 기간과 자료량 부담이 큼",
    "연구자가 설계자를 겸해 객관성 확보 장치(공동 코딩·감사 추적)가 필요",
  ],
  educationalTechExamples: [
    "탐구학습 지원 스캐폴딩 도구를 학기 단위로 반복 개선하며 설계 원리 도출",
    "AI 튜터 프로토타입을 교실에 투입해 교사 피드백으로 상호작용 설계를 정련",
    "플립러닝 환경의 사전학습 모듈을 3주기 반복 설계로 최적화",
  ],
  references: [
    "Cobb, P., Confrey, J., diSessa, A., Lehrer, R., & Schauble, L. (2003). Design experiments in educational research. Educational Researcher, 32(1), 9–13.",
    "The Design-Based Research Collective. (2003). Design-based research: An emerging paradigm for educational inquiry. Educational Researcher, 32(1), 5–8.",
  ],
};

async function main() {
  const concepts = await db.collection("archive_concepts").get();
  const existingNames = new Set(concepts.docs.map((d) => (d.data() as { name?: string }).name ?? ""));

  let added = 0;
  for (const c of NEW_CONCEPTS) {
    if (existingNames.has(c.name)) {
      console.log(`skip (존재): ${c.name}`);
      continue;
    }
    added += 1;
    console.log(`+ 개념: ${c.name} ← ${c.keyScholars.join(", ")}`);
    if (APPLY) {
      await db.collection("archive_concepts").add({
        ...c,
        published: true,
        createdBy: "system:orchestra-cycle54",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  // AI 개념 보강
  const aiDoc = concepts.docs.find((d) => (d.data() as { name?: string }).name === AI_ENRICH.name);
  if (aiDoc) {
    const x = aiDoc.data() as { keyScholars?: string[] };
    if (!x.keyScholars?.length) {
      console.log(`~ 보강: ${AI_ENRICH.name} (keyScholars+seminalWorks)`);
      if (APPLY) {
        await db.collection("archive_concepts").doc(aiDoc.id).update({
          keyScholars: AI_ENRICH.keyScholars,
          seminalWorks: AI_ENRICH.seminalWorks,
          updatedAt: now(),
        });
      }
    } else {
      console.log(`skip (보유): ${AI_ENRICH.name}`);
    }
  }

  // DBR 가이드
  const rm = await db.collection("archive_research_methods").get();
  const rmNames = new Set(rm.docs.map((d) => (d.data() as { name?: string }).name ?? ""));
  if (!rmNames.has(DBR_GUIDE.name)) {
    console.log(`+ 연구방법 가이드: ${DBR_GUIDE.name}`);
    if (APPLY) {
      await db.collection("archive_research_methods").add({
        ...DBR_GUIDE,
        published: true,
        curatedBy: "system:orchestra-cycle54",
        createdBy: "system:orchestra-cycle54",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  } else {
    console.log(`skip (존재): ${DBR_GUIDE.name}`);
  }

  console.log(`\n신규 개념 ${added} · ${APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ==="}`);
}

void main();
