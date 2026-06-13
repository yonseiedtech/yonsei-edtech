// 사이클 78 — 인지-사고 변인 측정도구 2종 (WebSearch 검증 2026-06-13)
//  · 창의성→TTCT(Torrance 1974, A·B형 상관.88) · 컴퓨팅사고력→CTt(Román-González, α.78, 문제해결 r.67)
//  · 둘 다 수행검사(자기보고 아님). TTCT 상업 라이선스. 변인↔측정도구 양방향. 멱등.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const now = () => new Date().toISOString();

const TOOLS: { varName: string; tool: Record<string, unknown> }[] = [
  {
    varName: "창의성",
    tool: {
      name: "창의적 사고력 검사 (TTCT)",
      originalName: "Torrance Tests of Creative Thinking (TTCT)",
      author: "Torrance (1974)",
      scaleType: "수행 검사 (언어형·도형형, 동형 A/B)",
      reliability: "동형검사 A·B형 평균 상관 .88, 양호한 신뢰도·예측타당도(Torrance, 1990)",
      description:
        "확산적 사고를 산출물 채점으로 측정한다. 언어형은 유창성·융통성·독창성을, 도형형은 유창성·독창성·정교성·제목의 추상성·성급한 종결에 대한 저항을 본다. 채점자 훈련·합의가 중요하며, 자기보고형 창의적 자신감 척도와는 측정 층위가 다르다. 상업 라이선스 도구(Scholastic Testing Service)다.",
      references: ["Torrance, E. P. (1974). Torrance Tests of Creative Thinking: Norms-Technical Manual. Scholastic Testing Service."],
      tags: ["창의성", "확산적 사고", "수행검사"],
    },
  },
  {
    varName: "컴퓨팅 사고력(변인)",
    tool: {
      name: "컴퓨팅 사고력 검사 (CTt)",
      originalName: "Computational Thinking Test (CTt)",
      author: "Román-González (2015)",
      scaleType: "선다형 28문항 (온라인, ~45분)",
      reliability: "Cronbach α=.78. 준거타당도 — 문제해결력 r=.67, 추론·공간능력 r=.44 (스페인 초5~고1 N=1,251)",
      description:
        "기본 시퀀스·반복·조건·함수·변수 등 프로그래밍 논리 개념으로 문제를 형식화하고 해결하는 능력을 수행으로 측정한다. 자기보고형 'CT 효능감' 척도와 달리 실제 수행을 평가하므로, 연구 목적이 역량인지 효능감인지에 맞춰 선택해야 한다.",
      references: ["Román-González, M., Pérez-González, J.-C., & Jiménez-Fernández, C. (2017). Which cognitive abilities underlie computational thinking? Computers in Human Behavior, 72, 678–691."],
      tags: ["컴퓨팅 사고력", "수행검사", "코딩교육"],
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
    console.log(`+ ${tool.name} → ${varName}`);
    if (APPLY) {
      const ref = await db.collection("archive_measurements").add({
        ...tool, variableIds: [varId], published: true,
        createdBy: "system:orchestra-cycle78", createdAt: now(), updatedAt: now(),
      });
      const vDoc = vars.docs.find((d) => d.id === varId)!;
      const cur = (vDoc.data() as { measurementIds?: string[] }).measurementIds ?? [];
      await db.collection("archive_variables").doc(varId).update({ measurementIds: [...cur, ref.id], updatedAt: now() });
    }
  }
  console.log(`\n신규 ${added} · ${APPLY ? "=== 적용 ===" : "=== 드라이런 ==="}`);
}
void main();
