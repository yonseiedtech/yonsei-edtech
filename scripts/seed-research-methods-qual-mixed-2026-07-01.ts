// 질적·혼합 연구방법 개념 추가 (2026-07-01, 사용자 요청)
//  · 배경: archive_research_methods 의 질적 계열은 얇고(근거이론·사례연구·액션리서치),
//    혼합(mixed)은 랜딩에 사실상 빈 섹션(DBR이 자유텍스트 kind 로 분류돼 미노출).
//  · UI 는 kind = quantitative|qualitative|mixed 만 섹션 렌더 → 새 항목은 enum 값으로 정확히 태깅.
//  · 추가: 질적 4(현상학·문화기술지·내러티브·질적 내용분석) + 혼합 4(혼합연구 개요·수렴병렬·설명적순차·탐색적순차).
//    혼합/일부는 statisticalMethodIds 로 통계방법과 연계.
//  · 게이트: published=false(초안). 멱등: 같은 name 또는 seedKey 존재 시 건너뜀.
// 실행: npx tsx scripts/seed-research-methods-qual-mixed-2026-07-01.ts          (드라이런)
//       npx tsx scripts/seed-research-methods-qual-mixed-2026-07-01.ts --apply  (적용)
//  ※ WSL: tsx 가 멈추면 CJS 컴파일 후 node 실행. preferRest 강제.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const PUBLISHED = false; // 초안. true 로 바꾸면 즉시 공개.
const CREATED_BY = "system:research-methods-qual-mixed-2026-07-01";
const COLLECTION = "archive_research_methods";

const sa = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"),
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });
const now = () => new Date().toISOString();
const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// 연계용 통계방법 ID (2026 운영 DB 기준)
const SM = {
  tTest: "AN0J5MCTXrnYnecZFpCG",
  anova: "fFMTfoMqj1TORoIYx4WW",
  multiReg: "NfpC7q3OXVQyaudBwAzu",
  correlation: "L0VZKbiGtGzWfoxpo4U0",
  efa: "IUuQ9O8OZ5MQLc8Um47s",
  cfa: "lEue6VnjF9SOyyU8O7f6",
};

interface Entry {
  slug: string;
  name: string;
  purifiedName?: string;
  kind: "qualitative" | "mixed";
  summary: string;
  accessibleSummary: string;
  description: string;
  educationalTechExamples: string[];
  procedures: string[]; // step 텍스트 배열 → {id,step} 로 변환
  strengths: string[];
  limitations: string[];
  statisticalMethodIds?: string[];
}

const ENTRIES: Entry[] = [
  // ── 질적 ──
  {
    slug: "phenomenology",
    name: "현상학적 연구",
    purifiedName: "현상학적 연구(Phenomenology)",
    kind: "qualitative",
    summary:
      "특정 현상에 대한 사람들의 체험(lived experience)의 본질과 의미를 심층적으로 기술·해석하는 질적 연구방법이다.",
    accessibleSummary:
      "그 일을 직접 겪은 사람들에게 '그게 어떤 경험이었는지'를 깊이 듣고, 공통된 본질을 길어 올리는 방법입니다.",
    description:
      "참여자의 1인칭 체험을 심층면담·기술로 수집하고, 판단중지(epoché)와 현상학적 환원을 거쳐 경험의 본질적 구조를 도출한다. Giorgi·Colaizzi·van Manen 등 분석 절차가 알려져 있다.",
    educationalTechExamples: [
      "원격수업에서 학습자가 느끼는 고립감의 본질 탐구",
      "신임교사의 에듀테크 도입 체험과 의미",
    ],
    procedures: [
      "연구문제·탐구할 현상 설정",
      "의도적 표집 후 심층면담",
      "의미단위 추출·코딩",
      "주제·본질적 구조 도출",
      "타당성 확보(멤버체킹·동료검토)",
    ],
    strengths: ["체험의 깊은 의미 포착", "양적 지표로 드러나지 않는 주관적 경험 조명"],
    limitations: ["통계적 일반화 제한", "연구자 해석 개입", "표집·분석에 시간 소요"],
  },
  {
    slug: "ethnography",
    name: "문화기술지",
    purifiedName: "문화기술지(민족지, Ethnography)",
    kind: "qualitative",
    summary:
      "특정 집단·공동체의 문화와 상호작용을 장기간 현장 참여관찰로 기술·해석하는 질적 연구방법이다.",
    accessibleSummary:
      "한 집단 속에 오래 들어가 함께 지내며 '그들의 문화가 어떻게 돌아가는지'를 안에서 그려내는 방법입니다.",
    description:
      "참여관찰·현장노트·면담·문서를 결합해 내부자(emic) 관점에서 문화적 패턴을 두껍게 기술(thick description)한다. 교육 현장의 문화·규범 연구에 적합하다.",
    educationalTechExamples: [
      "한 학교의 디지털 기기 사용 문화",
      "온라인 학습 커뮤니티의 규범과 상호작용",
    ],
    procedures: [
      "현장 진입·라포 형성",
      "장기 참여관찰·현장노트 작성",
      "면담·문서 등 다원 자료 수집",
      "문화적 주제 분석",
      "두꺼운 기술로 종합",
    ],
    strengths: ["맥락·문화의 총체적 이해", "자연스러운 현장 행동 포착"],
    limitations: ["장기간·노동집약적", "연구자 존재의 영향", "일반화 제한"],
  },
  {
    slug: "narrative-inquiry",
    name: "내러티브 연구",
    purifiedName: "내러티브 연구(Narrative inquiry)",
    kind: "qualitative",
    summary:
      "개인이 자신의 경험을 이야기(narrative)로 구성하는 방식을 수집·분석해 의미를 해석하는 질적 연구방법이다.",
    accessibleSummary:
      "한 사람이 살아온 이야기를 듣고, 그 흐름과 전환점에서 의미를 읽어내는 방법입니다.",
    description:
      "생애사·경험담을 시간적 흐름과 맥락 속에서 재구성(restorying)한다. Clandinin & Connelly의 3차원 탐구공간(상호작용·연속성·상황)이 자주 활용된다.",
    educationalTechExamples: [
      "베테랑 교사의 교직 생애와 에듀테크 적응 서사",
      "학습자의 진로 형성 이야기",
    ],
    procedures: [
      "참여자 선정·생애 이야기 수집",
      "시간·맥락에 따른 재구성(restorying)",
      "전환점·주제 분석",
      "참여자와 의미 공동구성·확인",
    ],
    strengths: ["개인 경험의 시간적·맥락적 깊이", "정체성·전환 과정 이해"],
    limitations: ["소수 사례 중심", "해석의 주관성", "일반화 제한"],
  },
  {
    slug: "qualitative-content-analysis",
    name: "질적 내용분석",
    purifiedName: "질적 내용분석(Qualitative content analysis)",
    kind: "qualitative",
    summary:
      "텍스트·면담·문서 등 질적 자료를 체계적 코딩으로 범주화해 의미·주제를 도출하는 분석방법이다.",
    accessibleSummary:
      "많은 글·인터뷰를 반복해 읽으며 비슷한 내용을 묶어 '핵심 주제'로 정리하는 방법입니다.",
    description:
      "귀납적(자료기반)·연역적(이론기반) 코딩으로 의미단위를 범주화한다. 빈도보다 의미 맥락에 초점을 두며, 코더 간 신뢰도·감사 추적으로 신뢰성을 확보한다(빈도 중심의 양적 내용분석과 구분).",
    educationalTechExamples: [
      "수업 성찰일지의 주제 분석",
      "학습자 개방형 설문 응답의 범주화",
    ],
    procedures: [
      "자료 친숙화(반복 통독)",
      "의미단위·코드 생성",
      "범주·주제로 묶기",
      "코더 간 신뢰도·검토",
    ],
    strengths: ["대량 텍스트의 체계적 처리", "귀납·연역 유연 적용"],
    limitations: ["맥락 손실 위험", "코딩의 주관성", "신뢰도 확보 부담"],
  },
  // ── 혼합 ──
  {
    slug: "mixed-methods-overview",
    name: "혼합연구방법",
    purifiedName: "혼합연구방법(Mixed methods)",
    kind: "mixed",
    summary:
      "양적·질적 자료와 분석을 한 연구에서 통합해, 단일 방법의 한계를 보완하고 연구문제를 더 풍부하게 답하는 연구방법이다.",
    accessibleSummary:
      "숫자(양적)와 이야기(질적)를 함께 써서, 한쪽만으로는 안 보이는 그림을 맞추는 방법입니다.",
    description:
      "Creswell & Plano Clark의 핵심 설계(수렴 병렬·설명적 순차·탐색적 순차)가 대표적이다. 통합(integration)의 시점·방식(수렴·연결·내재)이 설계의 핵심이며, 한 연구에 여러 방법이 함께 쓰일 수 있음을 전제한다.",
    educationalTechExamples: [
      "에듀테크 효과를 성취도(양적)+사용경험 면담(질적)으로 검증",
      "설문 결과를 면담으로 심층 해석",
    ],
    procedures: [
      "연구문제·통합 목적 설정",
      "설계 유형 선택(수렴/설명적순차/탐색적순차)",
      "양적·질적 자료 수집",
      "통합(integration) 분석·해석",
    ],
    strengths: ["상호 보완·삼각검증", "복잡한 문제에 풍부한 답"],
    limitations: ["시간·역량 부담", "통합 설계·해석의 난도", "두 패러다임 균형 필요"],
    statisticalMethodIds: [SM.tTest, SM.anova, SM.multiReg, SM.correlation],
  },
  {
    slug: "convergent-parallel",
    name: "수렴적 병렬 설계",
    purifiedName: "수렴적 병렬 설계(Convergent parallel)",
    kind: "mixed",
    summary:
      "양적·질적 자료를 동시에 수집·분석한 뒤 결과를 비교·통합하는 혼합연구 설계이다.",
    accessibleSummary:
      "숫자와 이야기를 같은 시기에 모아, 둘이 같은 말을 하는지 맞춰보는 방법입니다.",
    description:
      "두 자료를 독립적으로 분석한 뒤 수렴·불일치 지점을 함께 해석한다. 삼각검증(triangulation)에 강하다.",
    educationalTechExamples: [
      "학습성과 점수와 학습경험 면담을 동시에 수집해 대조",
    ],
    procedures: [
      "양적·질적 자료 동시 수집",
      "각각 독립 분석",
      "결과 비교·수렴/불일치 해석",
      "통합 결론 도출",
    ],
    strengths: ["효율적 동시 수집", "강한 삼각검증"],
    limitations: ["두 결과 불일치 시 해석 난도", "동시 진행 부담"],
    statisticalMethodIds: [SM.tTest, SM.correlation],
  },
  {
    slug: "explanatory-sequential",
    name: "설명적 순차 설계",
    purifiedName: "설명적 순차 설계(Explanatory sequential)",
    kind: "mixed",
    summary:
      "먼저 양적 연구로 결과를 얻고, 이어 질적 연구로 그 결과를 심층 설명하는 2단계 혼합 설계이다.",
    accessibleSummary:
      "먼저 숫자로 '무엇이 일어났나'를 보고, 그다음 인터뷰로 '왜 그런가'를 파고드는 방법입니다.",
    description:
      "양적 결과의 의외점·패턴을 후속 질적 자료로 해석한다. 양적 단계가 우선하며 질적 단계가 보완한다.",
    educationalTechExamples: [
      "설문으로 효과 차이를 확인한 뒤, 차이가 큰 집단을 면담으로 설명",
    ],
    procedures: [
      "1단계: 양적 자료 수집·분석",
      "후속 질적 대상·질문 도출",
      "2단계: 질적 자료로 심층 설명",
      "양적+질적 통합 해석",
    ],
    strengths: ["양적 결과의 '왜'를 설명", "단계가 명확해 수행 용이"],
    limitations: ["전체 기간 길어짐", "양적 표본에서 질적 대상 선정 부담"],
    statisticalMethodIds: [SM.anova, SM.tTest, SM.multiReg],
  },
  {
    slug: "exploratory-sequential",
    name: "탐색적 순차 설계",
    purifiedName: "탐색적 순차 설계(Exploratory sequential)",
    kind: "mixed",
    summary:
      "먼저 질적 탐색으로 개념·도구를 구성하고, 이어 양적 연구로 검증·일반화하는 2단계 혼합 설계이다.",
    accessibleSummary:
      "먼저 인터뷰로 핵심 요소를 찾아 설문·척도를 만들고, 그다음 숫자로 검증하는 방법입니다.",
    description:
      "질적 결과로 척도·가설을 개발한 뒤 양적으로 검증한다. 척도(측정도구) 개발 연구와 잘 연결된다.",
    educationalTechExamples: [
      "면담으로 새 구인을 도출해 척도를 만들고, 대규모 설문으로 타당화",
    ],
    procedures: [
      "1단계: 질적 탐색(개념·요인 도출)",
      "도구/문항·가설 개발",
      "2단계: 양적 자료로 검증(타당화)",
      "통합 해석·일반화 판단",
    ],
    strengths: ["맥락에 맞는 도구 개발", "질적 발견의 양적 검증"],
    limitations: ["가장 긴 기간", "두 단계 모두 역량 요구"],
    statisticalMethodIds: [SM.efa, SM.cfa, SM.correlation],
  },
];

async function main() {
  const snap = await db.collection(COLLECTION).get();
  const names = new Set<string>();
  const seedKeys = new Set<string>();
  for (const d of snap.docs) {
    const x = d.data() as { name?: string; seedKey?: string };
    if (x.name) names.add(norm(x.name));
    if (x.seedKey) seedKeys.add(x.seedKey);
  }

  let created = 0;
  let skipped = 0;
  const byKind: Record<string, number> = {};

  for (const e of ENTRIES) {
    const seedKey = `research-method:${e.slug}`;
    if (names.has(norm(e.name)) || seedKeys.has(seedKey)) {
      console.log(`· 건너뜀(이미 존재): [${e.kind}] ${e.name}`);
      skipped++;
      continue;
    }
    console.log(`+ 신규: [${e.kind}] ${e.name}`);
    byKind[e.kind] = (byKind[e.kind] || 0) + 1;
    created++;

    if (APPLY) {
      const { slug, procedures, ...rest } = e;
      void slug;
      await db.collection(COLLECTION).add({
        ...rest,
        procedures: procedures.map((step) => ({ id: randomUUID(), step })),
        published: PUBLISHED,
        seedKey,
        createdBy: CREATED_BY,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  const catStr = Object.entries(byKind)
    .map(([k, n]) => `${k} ${n}`)
    .join(" · ");
  console.log(
    `\n신규 ${created} (${catStr}) · 건너뜀 ${skipped}  published=${PUBLISHED}  ${
      APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ==="
    }`,
  );
}

main().then(() => process.exit(0));
