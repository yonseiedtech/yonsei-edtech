// 트랙 2 — 졸업생 논문 × 아카이브 직조 (2026-06-13)
//  ① 기존 개념 별칭 보강(협동학습) ② 신규 개념 6종 생성(영문 정전 인용만 — 멱등)
//  ③ 개념명/별칭 제목 매칭 → AlumniThesis.conceptIds ④ 변인명 매칭 → variableIds
// 실행: npx tsx scripts/link-theses-concepts.ts          (드라이런)
//       npx tsx scripts/link-theses-concepts.ts --apply  (적용)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

/** 신규 개념 — 검증 가능한 영문 정전 인용만 (한국어 KCI 인용 금지 원칙) */
const NEW_CONCEPTS = [
  {
    name: "문제기반학습",
    altNames: ["Problem-Based Learning", "PBL", "문제중심학습", "실제문제기반"],
    description:
      "실제적이고 비구조화된 문제를 학습의 출발점으로 삼아, 학습자가 소그룹 협력과 자기주도적 탐구를 통해 지식을 구성하는 학습자 중심 교수·학습 모형이다. 의과교육에서 출발해 교육공학 전반으로 확산되었으며, 문제 해결 과정에서 내용 지식과 문제해결 역량을 함께 기르는 것을 목표로 한다.",
    tags: ["교수학습모형", "학습자중심", "구성주의"],
    references: [
      "Barrows, H. S., & Tamblyn, R. M. (1980). Problem-Based Learning: An Approach to Medical Education. Springer.",
      "Hmelo-Silver, C. E. (2004). Problem-based learning: What and how do students learn? Educational Psychology Review, 16(3), 235-266.",
    ],
    matchKeywords: ["문제기반학습", "문제중심학습", "실제문제기반", "PBL"],
    variableNames: ["학업성취도", "학습몰입"],
  },
  {
    name: "자기주도학습",
    altNames: ["Self-Directed Learning", "SDL", "자기주도적 학습"],
    description:
      "학습자가 타인의 도움 여부와 관계없이 스스로 학습 요구를 진단하고 목표를 설정하며, 학습 자원을 선택하고 전략을 실행·평가하는 과정을 주도하는 학습 형태이다. 성인학습(andragogy) 전통에서 발전했으며, 자기조절학습이 과제 수행 중의 인지·동기 조절에 초점을 둔다면 자기주도학습은 학습 기획 전반의 주도권에 초점을 둔다.",
    tags: ["성인학습", "학습자중심", "평생교육"],
    references: [
      "Knowles, M. S. (1975). Self-Directed Learning: A Guide for Learners and Teachers. Association Press.",
      "Garrison, D. R. (1997). Self-directed learning: Toward a comprehensive model. Adult Education Quarterly, 48(1), 18-33.",
    ],
    matchKeywords: ["자기주도학습", "자기주도적"],
    variableNames: ["학업성취도"],
  },
  {
    name: "이러닝",
    altNames: ["e-Learning", "온라인 학습", "웹기반 학습", "사이버 교육"],
    description:
      "디지털 기기와 네트워크를 통해 전달되는 교수·학습으로, 시공간 제약을 줄이고 멀티미디어·상호작용 요소를 활용해 학습을 지원한다. 효과적인 이러닝 설계는 매체 자체가 아니라 멀티미디어 학습 원리(인지부하 관리, 근접성, 일관성 등)에 기반한 교수설계에 달려 있다.",
    tags: ["온라인교육", "원격교육", "매체활용"],
    references: [
      "Clark, R. C., & Mayer, R. E. (2016). e-Learning and the Science of Instruction (4th ed.). Wiley.",
    ],
    matchKeywords: ["이러닝", "e-러닝", "온라인", "웹기반", "사이버", "인터넷"],
    variableNames: ["학습 만족도", "학업성취도"],
  },
  {
    name: "인적자원개발",
    altNames: ["Human Resource Development", "HRD", "기업교육"],
    description:
      "조직 구성원의 역량과 성과를 높이기 위해 훈련·개발(TD), 조직개발(OD), 경력개발(CD)을 통합적으로 설계·운영하는 분야이다. 기업교육 맥락의 교육공학 실천 영역으로, 교육훈련의 성과가 현업 수행으로 이어지는 학습전이가 핵심 과제다.",
    tags: ["기업교육", "성인학습", "조직개발"],
    references: [
      "Swanson, R. A., & Holton, E. F. (2001). Foundations of Human Resource Development. Berrett-Koehler.",
    ],
    matchKeywords: ["기업교육", "사내강사", "인적자원개발", "교육훈련", "HRD"],
    variableNames: [],
  },
  {
    name: "원격교육 상호작용",
    altNames: ["Three Types of Interaction", "학습자 상호작용"],
    description:
      "원격·온라인 학습에서 상호작용을 학습자-내용, 학습자-교수자, 학습자-학습자의 세 유형으로 구분한 고전적 틀이다. 각 유형의 상호작용을 의도적으로 설계하는 것이 원격교육의 질을 결정하며, 이후 학습자-인터페이스 상호작용 등으로 확장되었다.",
    tags: ["원격교육", "온라인교육", "상호작용설계"],
    references: [
      "Moore, M. G. (1989). Editorial: Three types of interaction. The American Journal of Distance Education, 3(2), 1-7.",
    ],
    matchKeywords: ["상호작용"],
    variableNames: ["학습 만족도"],
  },
  {
    name: "교육에서의 인공지능",
    altNames: ["AI in Education", "AIED", "인공지능 교육 활용"],
    description:
      "지능형 튜터링, 적응형 피드백, 학습 분석 등 인공지능 기술을 교수·학습 과정에 적용하는 분야이다. 자동화 자체보다 학습자 데이터 기반의 개인화와 교사 보조에 초점이 있으며, 윤리·편향·프라이버시 검토가 설계의 필수 요소로 강조된다.",
    tags: ["인공지능", "적응학습", "에듀테크"],
    references: [
      "Holmes, W., Bialik, M., & Fadel, C. (2019). Artificial Intelligence in Education: Promises and Implications for Teaching and Learning. Center for Curriculum Redesign.",
    ],
    matchKeywords: ["인공지능", "AI 활용", "챗봇"],
    variableNames: [],
  },
];

/** 기존 개념 별칭 보강 — 제목 매칭 정확도를 위해 */
const ALT_NAME_PATCH: Record<string, string[]> = {
  협력학습: ["협동학습"],
};

async function main() {
  const [thesesSnap, conceptsSnap, variablesSnap] = await Promise.all([
    db.collection("alumni_theses").get(),
    db.collection("archive_concepts").get(),
    db.collection("archive_variables").get(),
  ]);
  type Doc = { id: string; [k: string]: unknown };
  const theses = thesesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Doc[];
  const concepts = conceptsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Doc[];
  const variables = variablesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Doc[];

  // ① 별칭 보강
  for (const [name, adds] of Object.entries(ALT_NAME_PATCH)) {
    const c = concepts.find((x) => x.name === name);
    if (!c) continue;
    const cur = (c.altNames as string[]) ?? [];
    const missing = adds.filter((a) => !cur.includes(a));
    if (missing.length === 0) continue;
    console.log(`[별칭] ${name} += ${missing.join(", ")}`);
    if (APPLY) {
      await db.collection("archive_concepts").doc(c.id).update({
        altNames: [...cur, ...missing],
        updatedAt: new Date().toISOString(),
      });
    }
    c.altNames = [...cur, ...missing];
  }

  // ② 신규 개념 생성 (이름 가드 멱등)
  const varByName = new Map(variables.map((v) => [v.name as string, v]));
  for (const nc of NEW_CONCEPTS) {
    if (concepts.some((c) => c.name === nc.name)) {
      console.log(`[개념 SKIP] ${nc.name} (존재)`);
      continue;
    }
    const variableIds = nc.variableNames
      .map((vn) => varByName.get(vn)?.id)
      .filter((x): x is string => !!x);
    console.log(`[개념 생성] ${nc.name} — 변인 ${variableIds.length}개 연결, 인용 ${nc.references.length}건`);
    if (APPLY) {
      const now = new Date().toISOString();
      const ref = await db.collection("archive_concepts").add({
        name: nc.name,
        altNames: nc.altNames,
        description: nc.description,
        tags: nc.tags,
        references: nc.references,
        variableIds,
        createdAt: now,
        updatedAt: now,
        createdBy: "system:orchestra-track2",
      });
      concepts.push({ id: ref.id, name: nc.name, altNames: nc.altNames, matchKeywords: nc.matchKeywords } as unknown as Doc);
      // 역방향: variable.conceptIds 에도 추가 (양방향 일관성)
      for (const vid of variableIds) {
        await db.collection("archive_variables").doc(vid).update({
          conceptIds: FieldValue.arrayUnion(ref.id),
          updatedAt: now,
        });
      }
    } else {
      concepts.push({ id: `(new:${nc.name})`, name: nc.name, altNames: nc.altNames } as unknown as Doc);
    }
  }

  // 매칭 키워드: 신규 개념은 matchKeywords, 기존 개념은 이름+별칭(3자 이상)
  const kwByConceptId = new Map<string, string[]>();
  for (const c of concepts) {
    const nc = NEW_CONCEPTS.find((x) => x.name === c.name);
    const kws = nc
      ? nc.matchKeywords
      : [c.name as string, ...(((c.altNames as string[]) ?? []))].filter((k) => k && k.length >= 3 && /[가-힣]/.test(k));
    kwByConceptId.set(c.id, kws);
  }

  // ③ 논문 제목 → 개념 연결
  let conceptLinks = 0;
  for (const t of theses) {
    const title = String(t.title ?? "");
    const cur = new Set(((t.conceptIds as string[]) ?? []));
    const adds: string[] = [];
    for (const c of concepts) {
      if (cur.has(c.id)) continue;
      const kws = kwByConceptId.get(c.id) ?? [];
      if (kws.some((k) => title.includes(k))) adds.push(c.id);
    }
    if (adds.length === 0) continue;
    conceptLinks += adds.length;
    const names = adds.map((id) => concepts.find((c) => c.id === id)?.name).join(", ");
    console.log(`[논문→개념] ${title.slice(0, 40)}… += ${names}`);
    if (APPLY) {
      await db.collection("alumni_theses").doc(t.id).update({
        conceptIds: FieldValue.arrayUnion(...adds),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // ④ 논문 제목 → 변인 연결 (변인명/별칭 3자+)
  let varLinks = 0;
  for (const t of theses) {
    const title = String(t.title ?? "");
    const cur = new Set(((t.variableIds as string[]) ?? []));
    const adds: string[] = [];
    for (const v of variables) {
      if (cur.has(v.id)) continue;
      const kws = [v.name as string, ...(((v.altNames as string[]) ?? []))].filter(
        (k) => k && k.length >= 3 && /[가-힣]/.test(k),
      );
      if (kws.some((k) => title.includes(k))) adds.push(v.id);
    }
    if (adds.length === 0) continue;
    varLinks += adds.length;
    const names = adds.map((id) => variables.find((v) => v.id === id)?.name).join(", ");
    console.log(`[논문→변인] ${title.slice(0, 40)}… += ${names}`);
    if (APPLY) {
      await db.collection("alumni_theses").doc(t.id).update({
        variableIds: FieldValue.arrayUnion(...adds),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  console.log(`\n=== ${APPLY ? "적용 완료" : "드라이런"} — 개념 연결 +${conceptLinks} · 변인 연결 +${varLinks} ===`);
}

void main();
