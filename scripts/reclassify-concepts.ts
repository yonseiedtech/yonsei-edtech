// 사이클 42 — 아카이브 개념 재분류: 방법론성 개념 13종을 가이드 컬렉션으로 이관
//  · concepts 에 있던 통계/연구방법은 기존 가이드(statistical/research_methods)가 더 풍부 → 중복 제거
//  · 가이드에 없는 항목만 신규 생성 (부심 강의 일반화 콘텐츠, 검수형 스키마 준수)
// 실행: npx tsx scripts/reclassify-concepts.ts          (드라이런)
//       npx tsx scripts/reclassify-concepts.ts --apply  (적용)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const now = () => new Date().toISOString();
const BY = "system:orchestra-reclassify";

/** concepts 에서 제거할 13종 (가이드 컬렉션이 정위치) */
const REMOVE_FROM_CONCEPTS = [
  "공분산분석(ANCOVA)",
  "카이제곱 검정",
  "구조방정식모형(SEM)",
  "요인분석과 구성타당도",
  "상관분석과 회귀분석",
  "메타분석",
  "중심극한정리와 정규성",
  "준실험설계",
  "델파이 기법",
  "내적 타당도",
  "외적 타당도",
  "인과관계 추론",
  "연구보고서 작성 5원칙",
];

/** 신규 통계방법 가이드 (기존: ANCOVA·t·ANOVA·MANOVA·MANCOVA·회귀·로지스틱·EFA·CFA·SEM) */
const NEW_STATISTICAL = [
  {
    name: "상관분석",
    category: "관계 분석",
    summary: "두 연속 변인의 선형 관계 강도와 방향을 상관계수(r)로 파악한다.",
    description:
      "Pearson 상관은 두 변인 간 선형 관계를 -1~+1의 r 로 요약한다. |r| ≥ .7이면 강한 상관으로 해석하는 것이 관례다. 상관은 인과관계를 의미하지 않으며, 집단 비교가 아닌 관계 탐색이 목적일 때 사용한다. 정규성을 충족하지 않거나 서열 변수면 Spearman ρ 를 사용한다.",
    whenToUse: "변인 간 관련성 탐색, 회귀·SEM 전 단계의 기초 분석, 측정도구 수렴 증거 확인.",
    assumptions: ["두 변인의 정규성 (Pearson)", "선형 관계 — 산점도로 먼저 확인", "이상치 점검"],
    interpretationKeys: ["r 의 방향(+/-)과 크기", "유의확률 p", "상관 ≠ 인과 — '관련이 있다' 수위로 기술"],
  },
  {
    name: "카이제곱 검정 (χ²)",
    category: "범주형 분석",
    summary: "범주형 변인 간 관련성(독립성)과 분포 차이를 검증한다.",
    description:
      "교차표의 관측빈도와 기대빈도의 차이를 χ² 통계량으로 검정한다. 성별·계급·학년 같은 범주형 배경변수의 집단 간 동질성 검증에 정석이며, 준실험 설계에서 선발 위협을 방어하는 근거가 된다.",
    whenToUse: "범주형 × 범주형 관련성 검증, 실험·통제집단의 배경변수 동질성 확인.",
    assumptions: ["기대빈도 5 미만 셀이 전체의 20% 이하", "관측치 독립성 (한 응답자는 한 셀에만)", "2×2 표는 연속성 수정 또는 Fisher 정확검정 검토"],
    interpretationKeys: ["χ², df, p 보고", "기대빈도 가정 충족 여부를 함께 기술"],
  },
  {
    name: "중심극한정리와 정규성",
    category: "기초 개념",
    summary: "표본이 충분히 크면(n≥30) 표본평균의 분포는 정규에 근사한다 — 정규성 위배 방어의 핵심 논리.",
    description:
      "모집단이 정규분포가 아니어도 표본 크기가 충분하면 표본평균의 분포가 정규분포에 근사한다는 정리다. 정규성 검정이 기각되더라도 집단별 n≥30이면 모수 검정(t·ANOVA)을 정당화하는 표준 근거가 되며, 학위논문 심사에서 정규성 위협을 방어하는 한 문장이 된다.",
    whenToUse: "Shapiro-Wilk 등 정규성 검정이 기각됐지만 표본이 충분할 때 모수 검정의 정당화 근거로.",
    assumptions: ["집단별 표본 크기 n ≥ 30 (관례적 기준)", "극단적 이상치가 없는지 확인"],
    interpretationKeys: ["'정규성이 기각되었으나 n≥30으로 중심극한정리에 따라 모수 검정을 적용하였다' 형태로 보고"],
  },
];

/** 신규 연구방법 가이드 (기존: 실험·준실험·설문조사·사례·근거이론·액션리서치·메타분석·SEM) */
const NEW_RESEARCH = [
  {
    name: "델파이 기법",
    kind: "합의 도출",
    summary: "전문가 패널에게 반복 설문과 피드백을 제공해 의견을 수렴·합의를 도출한다.",
    description:
      "전문가 집단을 대상으로 2~4라운드의 반복 설문을 실시하고, 라운드마다 전체 응답 분포를 피드백해 의견을 수렴시키는 방법이다. 교육 프로그램 구성요소 도출, 평가 준거 합의, 미래 예측 등에 쓰인다.",
    procedures: ["전문가 패널 구성 (통상 10~20인, 전문성 근거 명시)", "1라운드 개방형/구조화 설문", "응답 분포(평균·사분위) 피드백과 함께 2라운드 재설문", "합의 기준(CVR, 수렴도·합의도) 충족 시 종료"],
    strengths: ["대면 회의의 동조 압력 없이 익명 합의 도출", "지리적 제약 없음"],
    limitations: ["전문가의 관심 부족·중도 탈락 위험", "라운드 반복으로 시간 소요", "패널 선정 편향 가능성"],
    educationalTechExamples: ["교육프로그램 핵심 역량 요소 도출", "이러닝 콘텐츠 평가 준거 개발"],
  },
  {
    name: "내적 타당도",
    kind: "설계 품질",
    summary: "처치가 결과의 원인이라고 확신할 수 있는 정도 — 경쟁 가설을 얼마나 배제했는가.",
    description:
      "내적 타당도는 관찰된 효과가 처치 때문임을 확신할 수 있는 정도다. 핵심은 '그럴듯한 경쟁 가설'의 배제이며, 8대 저해 요인(역사, 성숙, 검사 경험, 측정도구 변화, 통계적 회귀, 피험자 선발, 탈락, 선발-성숙 상호작용)을 설계와 논의에서 통제·해명해야 한다. 학위논문 한계 절을 이 프레임으로 구조화하면 심사 방어가 강해진다.",
    procedures: ["설계 단계: 통제집단·무선화·동질성 검증으로 위협 차단", "분석 단계: 사전 차이는 ANCOVA 로 통제", "논의 단계: 남은 위협 요인을 명시적으로 호명하고 해명"],
    strengths: ["인과 주장의 정당성 확보", "심사 질문 예측 가능"],
    limitations: ["현장 연구에서는 완전한 통제가 불가능 — 남은 위협의 솔직한 보고가 오히려 신뢰를 만든다"],
    educationalTechExamples: ["비동등 통제집단 설계에서 성숙·호손효과를 한계에 명시", "사전점수 차이를 ANCOVA 로 통제"],
  },
  {
    name: "외적 타당도",
    kind: "설계 품질",
    summary: "연구 결과를 다른 대상·상황·시점으로 일반화할 수 있는 정도.",
    description:
      "외적 타당도는 표본에서 얻은 결과가 모집단과 다른 맥락에 일반화되는 정도다. 저해 요인으로 사전검사×처치 상호작용, 선발×처치 상호작용, 호손효과(관찰받는다는 인식의 효과), 중다처치 간섭이 있다. 특수 표본(특정 학교·군 부대 등)을 쓴 연구는 일반화 한계를 명시해야 한다.",
    procedures: ["표집 방법과 표본 특성을 투명하게 기술", "맥락(현장 조건)을 구체적으로 보고해 독자가 전이 가능성을 판단하게 함", "한계 절에서 일반화 범위를 명시"],
    strengths: ["적용 범위에 대한 정직한 소통"],
    limitations: ["내적 타당도와 상충 관계 — 통제를 강화할수록 자연 상황과 멀어짐"],
    educationalTechExamples: ["단일 학교 표본 연구의 '선발×처치 상호작용' 한계 명시", "기업 1개사 교육 프로그램 효과의 일반화 범위 한정"],
  },
  {
    name: "인과관계 추론",
    kind: "설계 논리",
    summary: "인과 주장의 3요건 — 시간적 선행, 공변(관련성), 경쟁 가설 배제.",
    description:
      "원인이 결과에 선행하고(시간 선행), 둘이 함께 변하며(공변), 다른 설명이 배제될 때(경쟁 가설 배제) 인과를 주장할 수 있다. 통계 분석은 공변만 보여줄 뿐이며, 인과는 설계(통제집단·무선화)로 확보된다. '차이가 있다(비교)'와 '효과를 미친다(인과)'의 표현 수위를 구분하는 근거가 된다.",
    procedures: ["설계 단계에서 3요건 충족 계획 수립", "결과 장은 '차이' 수위로, 논의에서 설계 근거와 함께 인과 해석", "Mill 의 공변법 논리로 ANCOVA 등 분석 전략 정당화"],
    strengths: ["심사에서 가장 자주 나오는 '인과 주장 가능한가' 질문에 구조적으로 답할 수 있음"],
    limitations: ["비실험 설계에서는 3요건 충족이 어려워 인과 주장 불가"],
    educationalTechExamples: ["이질 통제집단 설계 + ANCOVA 조합의 인과 논증", "조사연구에서 '관련' 수위 유지"],
  },
];

/** 신규 글쓰기 팁 — 5원칙 종합 (개별 원칙 팁들은 이미 존재, 종합판 추가) */
const NEW_TIP = {
  title: "연구보고서 작성 5원칙 (종합)",
  category: "원칙",
  accessibleSummary: "논문 전체를 관통하는 다섯 가지 기준 — 논리성·객관성·정확성·일관성·가독성.",
  explanation:
    "① 논리성: 주장마다 근거(선행연구·데이터)가 따라야 한다. ② 객관성: 주관·감정을 지양하고 1인칭 대신 '연구자는' 또는 무주어로 쓴다. ③ 정확성: '매우·크게' 같은 모호한 정도 표현 대신 구체적 수치를 쓴다. ④ 일관성: 동일 개념은 처음 명명한 용어로 끝까지 통일한다. ⑤ 가독성: 어려운 용어 남발 없이 쉽게 쓴다. 시제는 방법·결과=과거, 정의·목적=현재가 원칙이다.",
  correctExample: "실험집단의 사후 점수가 통제집단보다 3.2점 높았다(t = 2.41, p = .018).",
  wrongExample: "나는 실험집단의 점수가 매우 크게 향상되었다고 생각한다.",
  tags: ["작성 원칙", "객관성", "정확성", "일관성"],
};

async function main() {
  const [conceptsSnap, statSnap, resSnap, tipsSnap, thesesSnap] = await Promise.all([
    db.collection("archive_concepts").get(),
    db.collection("archive_statistical_methods").get(),
    db.collection("archive_research_methods").get(),
    db.collection("archive_writing_tips").get(),
    db.collection("alumni_theses").get(),
  ]);
  const concepts = conceptsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as { name?: string; variableIds?: string[] }) }));
  const statNames = new Set(statSnap.docs.map((d) => (d.data() as { name?: string }).name));
  const resNames = new Set(resSnap.docs.map((d) => (d.data() as { name?: string }).name));

  console.log("=== writing_tips 기존 제목 (5원칙 중복 확인용) ===");
  tipsSnap.docs.forEach((d) => console.log("-", (d.data() as { title?: string }).title));

  // 신규 통계 가이드
  for (const m of NEW_STATISTICAL) {
    if ([...statNames].some((n) => n && (n.includes(m.name.split(" ")[0]) || m.name.includes(String(n).split(" ")[0])))) {
      console.log(`[통계 SKIP-유사존재] ${m.name}`);
      continue;
    }
    console.log(`[통계 신규] ${m.name}`);
    if (APPLY) {
      await db.collection("archive_statistical_methods").add({ ...m, published: true, curatedBy: "부심 강의 일반화", createdBy: BY, createdAt: now(), updatedAt: now() });
    }
  }

  // 신규 연구방법 가이드
  for (const m of NEW_RESEARCH) {
    if (resNames.has(m.name)) {
      console.log(`[연구 SKIP-존재] ${m.name}`);
      continue;
    }
    console.log(`[연구 신규] ${m.name}`);
    if (APPLY) {
      await db.collection("archive_research_methods").add({ ...m, published: true, createdBy: BY, createdAt: now(), updatedAt: now() });
    }
  }

  // 신규 글쓰기 팁 (제목 가드)
  const tipTitles = new Set(tipsSnap.docs.map((d) => (d.data() as { title?: string }).title));
  if (!tipTitles.has(NEW_TIP.title)) {
    console.log(`[팁 신규] ${NEW_TIP.title}`);
    if (APPLY) {
      await db.collection("archive_writing_tips").add({ ...NEW_TIP, published: true, createdBy: BY, createdAt: now(), updatedAt: now() });
    }
  } else {
    console.log(`[팁 SKIP-존재] ${NEW_TIP.title}`);
  }

  // concepts 제거 (참조 안전성 확인 포함)
  for (const name of REMOVE_FROM_CONCEPTS) {
    const c = concepts.find((x) => x.name === name);
    if (!c) {
      console.log(`[제거 SKIP-없음] ${name}`);
      continue;
    }
    const refThesis = thesesSnap.docs.filter((d) => ((d.data() as { conceptIds?: string[] }).conceptIds ?? []).includes(c.id)).length;
    const refVars = (c.variableIds ?? []).length;
    console.log(`[제거] ${name} (논문 참조 ${refThesis} · 변인 연결 ${refVars})`);
    if (APPLY) {
      // 논문 참조가 있으면 conceptIds 에서도 제거 (고아 방지)
      if (refThesis > 0) {
        for (const d of thesesSnap.docs) {
          const ids = (d.data() as { conceptIds?: string[] }).conceptIds ?? [];
          if (ids.includes(c.id)) {
            await db.collection("alumni_theses").doc(d.id).update({ conceptIds: ids.filter((x) => x !== c.id), updatedAt: now() });
          }
        }
      }
      await db.collection("archive_concepts").doc(c.id).delete();
    }
  }

  console.log(`\n=== ${APPLY ? "적용 완료" : "드라이런"} ===`);
  console.log("⚠ 적용 후 필수: archive-seed.ts SEED_CONCEPTS 에서 13종 제거 (cron 재생성 방지) + 코드 딥링크 전환");
}

void main();
