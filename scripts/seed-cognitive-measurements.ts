// 사이클 76 — 인지·정의 변인 측정도구 신설 (WebSearch 검증 2026-06-13)
//  · MAI(메타인지, Schraw&Dennison 1994 지식α.82/조절α.90)
//  · CCTDI(비판적 사고 성향, Facione 전체α.83~.90·7요인) — 상업 라이선스, 문항 미수록
//  · TAI(시험불안→학습불안, Spielberger 1980 전체α.96·걱정/정서성) — 상업, 문항 미수록
//  · 변인↔측정도구 양방향 링크. 멱등(이름 존재 시 스킵). 실행: npx tsx ... [--apply]
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
const ex = (t: string) => ({ id: randomUUID(), text: t });

// 변인 이름 → 측정도구
const TOOLS: { varName: string; tool: Record<string, unknown> }[] = [
  {
    varName: "메타인지(변인)",
    tool: {
      name: "메타인지 인식 검사 (MAI)",
      originalName: "Metacognitive Awareness Inventory (MAI)",
      author: "Schraw & Dennison (1994)",
      scaleType: "5점 Likert (52문항)",
      reliability: "인지에 대한 지식 차원 Cronbach α=.82, 인지 조절 차원 α=.90 (원판). 다수 언어판에서 양호한 신뢰도·구인타당도 보고",
      description:
        "52문항 2차원 구조 — 인지에 대한 지식(선언적·절차적·조건적 지식, 17문항)과 인지의 조절(계획·정보관리·점검·디버깅·평가, 35문항). 자기조절학습·메타인지 스캐폴딩 연구의 표준 자기보고 도구다. 사고구술·로그 기반 행동지표와 병행해 측정 방식을 명시하는 것이 좋다.",
      sampleItems: [ex("나는 과제를 시작하기 전에 목표를 정한다. (계획)"), ex("나는 이해가 안 될 때 학습 속도를 조절한다. (점검·조절)")],
      references: ["Schraw, G., & Dennison, R. S. (1994). Assessing metacognitive awareness. Contemporary Educational Psychology, 19(4), 460–475."],
      tags: ["메타인지", "자기조절학습", "자기보고"],
    },
  },
  {
    varName: "비판적 사고",
    tool: {
      name: "비판적 사고 성향 검사 (CCTDI)",
      originalName: "California Critical Thinking Disposition Inventory (CCTDI)",
      author: "Facione, Facione, & Giancarlo (1992)",
      scaleType: "6점 Likert (75문항)",
      reliability: "전체 Cronbach α=.90(원판)·.83(신뢰도 일반화 메타분석), 하위 7요인 α=.60~.80",
      description:
        "비판적 사고의 '능력'이 아니라 '성향(disposition)'을 7요인(진리탐구·개방성·분석성·체계성·탐구심·자신감·성숙)으로 측정한다. 능력을 보려면 수행검사(CCTST 등)를 별도로 써야 하며, 연구 목적이 능력인지 성향인지 먼저 정해 도구를 정당화해야 한다. 상업 라이선스 도구이므로 사용 전 라이선스 확인이 필요하다.",
      references: ["Facione, P. A., Facione, N. C., & Giancarlo, C. A. (1992). The California Critical Thinking Disposition Inventory. California Academic Press."],
      tags: ["비판적 사고", "성향", "고차 사고"],
    },
  },
  {
    varName: "학습 불안",
    tool: {
      name: "시험 불안 검사 (TAI)",
      originalName: "Test Anxiety Inventory (TAI)",
      author: "Spielberger (1980)",
      scaleType: "4점 Likert (20문항)",
      reliability: "전체 Cronbach α=.96, 걱정(worry) α=.91, 정서성(emotionality) α=.91 (원판)",
      description:
        "20문항 2요인(인지적 걱정·생리적 정서성)으로 시험·평가 상황의 불안을 측정하는 고전적 도구다. 학습 불안은 영역 특수성이 강해(시험·외국어·통계·AI 사용 불안 등) 연구 맥락에 맞는 척도를 골라야 한다. 상업 라이선스 도구로 사용 전 확인이 필요하다.",
      references: ["Spielberger, C. D. (1980). Test Anxiety Inventory: Preliminary Professional Manual. Consulting Psychologists Press."],
      tags: ["학습 불안", "시험 불안", "부적 정서"],
    },
  },
];

async function main() {
  const [vars, meas] = await Promise.all([
    db.collection("archive_variables").get(),
    db.collection("archive_measurements").get(),
  ]);
  const varByName = new Map(vars.docs.map((d) => [(d.data() as { name?: string }).name ?? "", d.id]));
  const existingTool = new Set(meas.docs.map((d) => (d.data() as { name?: string }).name ?? ""));

  let added = 0;
  for (const { varName, tool } of TOOLS) {
    const varId = varByName.get(varName);
    if (!varId) { console.log(`⚠ 변인 미발견: ${varName}`); continue; }
    if (existingTool.has(tool.name as string)) { console.log(`skip(존재): ${tool.name}`); continue; }
    added++;
    console.log(`+ ${tool.name} → 변인 ${varName}`);
    if (APPLY) {
      const ref = await db.collection("archive_measurements").add({
        ...tool, variableIds: [varId], published: true,
        createdBy: "system:orchestra-cycle76", createdAt: now(), updatedAt: now(),
      });
      // 역링크: 변인.measurementIds 에 추가
      const vDoc = vars.docs.find((d) => d.id === varId)!;
      const cur = ((vDoc.data() as { measurementIds?: string[] }).measurementIds ?? []);
      await db.collection("archive_variables").doc(varId).update({ measurementIds: [...cur, ref.id], updatedAt: now() });
    }
  }
  console.log(`\n신규 측정도구 ${added} · ${APPLY ? "=== 적용 ===" : "=== 드라이런 ==="}`);
}
void main();
