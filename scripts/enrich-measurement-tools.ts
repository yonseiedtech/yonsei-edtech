// 사이클 59 — 측정도구 신뢰도·구조·대표 문항 웹 검증 보강 (사용자 요청)
//  · 2026-06-13 WebSearch 전수 검증 출처:
//    - Ragu-Nathan 2008: ISR 19(4) 417-433 · 스페인어 타당화(Psicothema) 하위 α .82~.91
//    - Holton/Bates/Ruona 2000: HRDQ 11, 333-360 · N=1,616 EFA 16요인 (요인별 α 원전 명시 없음 → 재산출 권장 서술)
//    - Ng 2012: 17문항 4하위(태도7·기술6·인지2·사회2) · 터키어 타당화 전체 α .93, 하위 .70~.89
//    - NASA-TLX: 6차원 가중 평정 · 재검사 ICC .71~.81 (PMC 타당화 연구)
//    - UWES-S(Schaufeli 2002): 3요인 α .80~.90 (원저·공식 매뉴얼 공개 PDF)
//    - AGQ(Elliot & McGregor 2001): JPSP 80, 501-519 · 12문항 4요인 · 타당화 α .75~.90+
//    - FSS(Jackson & Marsh 1996): JSEP 18(1) 17-35 · 36문항 9요인 · 원저 평균 α .83 (N=394)
//    - Paas 1992: 9점 단일 문항 · 신뢰도·민감도는 Paas, Van Merriënboer & Adam (1994) 검증
//  · 저작권: 상업 배포 척도(FSS=Mind Garden, LTSI=라이선스)는 문항 미수록 — 요인 구조만.
//    공개 척도(UWES 매뉴얼 공개·AGQ 논문 수록·CoI OA)만 대표 문항을 번안 재서술로 1개씩.
//  · 멱등: 각 필드가 비어 있을 때만 채움 (기존 값·운영진 수정 보존)
// 실행: npx tsx scripts/enrich-measurement-tools.ts [--apply]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

interface Enrich {
  match: string; // name.includes 매칭 키
  reliability?: string;
  scaleType?: string;
  structureNote?: string; // description 말미에 1회 append (마커 존재 시 스킵)
  sampleItems?: string[];
}

const ENRICHES: Enrich[] = [
  {
    match: "테크노스트레스",
    reliability:
      "원도구는 5요인(테크노 과부하·침해·복잡성·불안정성·불확실성) 구조. 타 언어 타당화 연구에서 하위요인 Cronbach α = .82~.91 보고 (스페인어판 검증 기준)",
    scaleType: "5점 Likert",
    structureNote: "5개 하위요인 × 23문항 내외로 구성되며, 조직·교사 ICT 스트레스 연구에서 하위요인별 점수를 활용한다.",
  },
  {
    match: "LTSI",
    reliability:
      "원전(N=1,616)은 탐색적 요인분석으로 16개 전이체계 요인 구조를 검증 (2차 요인: 풍토·직무효용·보상). 요인별 α는 연구마다 달라 — 본인 자료로 신뢰도 재산출 후 보고 권장",
    structureNote: "16요인(전이 동기·전이 설계·상사 지원·동료 지원·변화 저항 등)이며 상업 라이선스 도구이므로 문항 사용 전 라이선스 확인이 필요하다.",
  },
  {
    match: "디지털 리터러시",
    reliability: "터키어 타당화에서 전체 Cronbach α = .93, 하위요인(태도·기술·인지·사회) α = .70~.89 보고",
    scaleType: "5점 Likert (17문항)",
    structureNote: "17문항 4하위요인(태도 7·기술 6·인지 2·사회 2) — 원저는 기술·인지·사회정서 3차원 프레임워크를 제안한다.",
  },
  {
    match: "NASA-TLX",
    reliability:
      "차원별 단일 평정 + 가중 합산 구조라 Cronbach α 산출이 부적합 — 재검사 신뢰도로 평가하며 타당화 연구에서 ICC = .71~.81 보고",
    structureNote: "6차원(정신적 요구·신체적 요구·시간 압박·수행·노력·좌절)을 0~100으로 평정하고, 쌍대비교 가중치로 종합 작업부하 점수를 산출한다. NASA가 공개 배포하는 도구다.",
  },
  {
    match: "UWES-S",
    reliability: "활력·헌신·몰두 3요인의 Cronbach α = .80~.90 (원저 및 공식 매뉴얼)",
    sampleItems: ["공부를 하면 힘이 솟는 느낌이 든다 (활력)", "내 전공 공부는 나에게 의미가 있다 (헌신)"],
    structureNote: "17문항 원판과 9문항 단축판(UWES-9S)이 있으며 공식 매뉴얼이 무료 공개되어 있다.",
  },
  {
    match: "AGQ",
    reliability: "12문항 4요인(숙달접근·숙달회피·수행접근·수행회피, 요인당 3문항). 원저와 후속 타당화에서 요인별 α 대체로 .75~.90+",
    sampleItems: ["나의 목표는 이 수업의 내용을 가능한 한 완전히 이해하는 것이다 (숙달접근)"],
  },
  {
    match: "Flow State Scale",
    reliability: "36문항 9요인(요인당 4문항), 원저 평균 Cronbach α = .83 (운동선수 N=394)",
    structureNote:
      "9요인: 도전-기술 균형, 행위-인식 통합, 명확한 목표, 모호하지 않은 피드백, 과제 집중, 통제감, 자의식 상실, 시간 변형, 자기목적적 경험. 상업 배포(Mind Garden) 도구이므로 문항 사용 전 라이선스 확인 필요. 개정판 FSS-2(Jackson & Eklund, 2002)가 통용된다.",
  },
  {
    match: "Paas",
    reliability:
      "단일 문항이므로 Cronbach α 산출 불가 — 신뢰도·민감도는 Paas, Van Merriënboer & Adam (1994)에서 검증 보고. 반복 측정(과제마다 평정) 설계로 사용",
    structureNote: "'매우 매우 낮은 노력(1) ~ 매우 매우 높은 노력(9)'의 9점 대칭 평정 단일 문항으로, 인지부하 연구의 표준 주관 측정치다.",
  },
  {
    match: "CoI 설문",
    sampleItems: ["교수자는 중요한 수업 주제를 명확하게 안내해 주었다 (교수실재감)"],
    structureNote: "34문항 3실재감(교수·사회·인지) 구조이며 원 문항이 오픈액세스로 공개되어 있다.",
  },
];

async function main() {
  const snap = await db.collection("archive_measurements").get();
  let updated = 0;
  for (const e of ENRICHES) {
    const doc = snap.docs.find((d) => ((d.data() as { name?: string }).name ?? "").includes(e.match));
    if (!doc) {
      console.log(`?? 미발견: ${e.match}`);
      continue;
    }
    const x = doc.data() as { reliability?: string; scaleType?: string; description?: string; sampleItems?: { id: string; text: string }[] };
    const patch: Record<string, unknown> = {};
    if (e.reliability && !x.reliability?.trim()) patch.reliability = e.reliability;
    if (e.scaleType && !x.scaleType?.trim()) patch.scaleType = e.scaleType;
    if (e.sampleItems?.length && !(x.sampleItems?.length)) {
      patch.sampleItems = e.sampleItems.map((t) => ({ id: randomUUID(), text: t }));
    }
    if (e.structureNote && !(x.description ?? "").includes(e.structureNote.slice(0, 14))) {
      patch.description = `${(x.description ?? "").trim()}\n\n${e.structureNote}`.trim();
    }
    if (Object.keys(patch).length === 0) {
      console.log(`skip (보유): ${e.match}`);
      continue;
    }
    updated += 1;
    console.log(`~ ${e.match}: ${Object.keys(patch).join(", ")}`);
    if (APPLY) {
      await db.collection("archive_measurements").doc(doc.id).update({ ...patch, updatedAt: new Date().toISOString() });
    }
  }
  console.log(`\n갱신 ${updated} · ${APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ==="}`);
}
void main();
