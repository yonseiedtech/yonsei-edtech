// 사이클 62 — 문항·척도 개발 및 타당도 검증 가이드 (사용자 요청·평가 승인)
//  · 연구방법 가이드 2종: 척도(측정도구) 개발 연구 / 교육 프로그램 개발과 타당화
//  · 기초 용어 1종: 타당도 증거의 종류 — 기존 "타당도"(한 줄 정의)를 체계로 보완
//  · 기존 아카이브 자산(CVI·EFA·CFA·신뢰도·개발연구)을 절차 단계에서 명시 참조 — 점→선 연결
//  · 원전: DeVellis 척도개발(단행본) · Messick 1995 (Crossref 검증 2026-06-13) · Richey & Klein(단행본)
//  · 멱등: 이름/term 존재 시 스킵. 실행: npx tsx scripts/seed-scale-development.ts [--apply]
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

const METHOD_GUIDES = [
  {
    name: "척도(측정도구) 개발 연구",
    kind: "도구 개발·타당화",
    summary: "새 구인을 측정하는 문항·척도를 개발하고 내용·구인·준거 타당도와 신뢰도 증거를 단계적으로 수집하는 연구",
    description:
      "기존 도구가 없거나 맥락에 맞지 않을 때 측정도구를 직접 개발하고 그 타당성을 입증하는 연구다. 핵심은 '문항을 만들었다'가 아니라 '이 점수가 의도한 구인을 측정한다는 증거를 어떤 순서로 쌓았는가'이며, 통상 구인 정의부터 준거 타당도까지의 단계를 거친다(DeVellis의 척도 개발 절차 전통). 각 단계는 아카이브의 기존 가이드와 연결된다 — 내용타당도는 '내용타당도지수(CVI)' 가이드, 요인구조 탐색·확인은 'EFA'·'CFA' 가이드, 표본 권고는 각 가이드의 최소 표본 참고를 따른다. 번안(adaptation) 연구라면 번역-역번역과 문화적 등가성 검토 단계가 추가된다.",
    procedures: [
      "1. 구인 정의 — 이론에 근거해 측정할 개념의 정의·하위요인을 확정 (선행 척도 부재/부적합 근거 제시)",
      "2. 문항 풀 생성 — 하위요인별로 최종 목표의 2~3배 문항 작성 (문헌·면담·개방 설문 활용)",
      "3. 내용타당도 — 전문가 패널 평정으로 I-CVI/S-CVI 산출 (아카이브 '내용타당도지수(CVI)' 가이드 절차)",
      "4. 예비검사(pilot) — 소표본에 실시해 문항 이해도·응답 분포·소요 시간 점검",
      "5. 본검사 1차와 문항분석 — 문항-총점 상관·변별도 확인, 부적합 문항 제거",
      "6. 탐색적 요인분석(EFA) — 요인 수·구조 탐색 (문항당 5~10명 표본 권고, 'EFA' 가이드 참고)",
      "7. 확인적 요인분석(CFA) — 별도 표본으로 구조 확인·적합도 보고 ('CFA' 가이드 참고; EFA와 동일 표본 재사용 금지)",
      "8. 신뢰도·준거 타당도 — Cronbach α(하위요인별)와 기존 관련 척도와의 상관(수렴·판별) 보고",
    ],
    strengths: [
      "맥락에 맞는 도구를 확보하고 학술적 기여(도구 자체)가 명확",
      "타당화 단계마다 증거가 누적되어 논문 구조가 명료",
    ],
    limitations: [
      "EFA·CFA에 별도 표본이 필요해 표본 부담이 큼 (합쳐서 수백 명 단위)",
      "한 학기 내 완결이 어려워 단계 축소 시 타당화 수준을 명시해야 함",
      "구인 정의가 부실하면 이후 모든 단계가 흔들림 — 1단계가 가장 중요",
    ],
    educationalTechExamples: [
      "AI 리터러시 척도 개발 — 구인 정의 후 CVI·EFA·CFA로 4요인 구조 확정",
      "이러닝 학습실재감 척도 한국형 번안 — 번역-역번역 후 CFA로 원 구조 확인",
      "메이커 교육 창의적 자신감 척도 개발과 타당화",
    ],
    references: [
      "DeVellis, R. F. (2016). Scale Development: Theory and Applications (4th ed.). SAGE.",
      "Messick, S. (1995). Validity of psychological assessment. American Psychologist, 50(9), 741–749.",
    ],
  },
  {
    name: "교육 프로그램 개발과 타당화",
    kind: "도구 개발·타당화",
    summary: "교육 프로그램(수업·연수·콘텐츠)을 체계적으로 개발하고 전문가 검토·사용성 평가·현장 적용으로 타당성을 입증하는 연구",
    description:
      "측정도구 타당화와 자주 혼동되지만 절차가 다르다 — 도구 타당화가 '점수가 구인을 재는가'를 묻는다면, 프로그램 타당화는 '이 프로그램의 구성과 내용이 목표 달성에 적절한가'를 묻는다. 통상 3겹의 증거를 쌓는다: ① 내적 타당화 — 전문가 패널의 구성요소 검토(CVI 활용 가능) ② 사용성·실행가능성 — 예비 적용에서 학습자·교수자 반응과 운영 장애 확인 ③ 외적 타당화 — 현장 적용 후 효과 검증(사전·사후 설계 등). 개발연구(Type 1: 특정 프로그램, Type 2: 일반 모형)의 틀 안에서 수행되는 경우가 많고, 반복 개선이 강조되면 설계기반연구(DBR)와 결합된다.",
    procedures: [
      "1. 요구 분석 — 대상·맥락의 요구와 기존 프로그램의 한계 규명",
      "2. 설계 원리 도출 — 이론·선행연구에서 프로그램 구성 원리 도출 (아카이브 개념 문서 활용)",
      "3. 프로그램 시안 개발 — 차시·활동·자료의 구체화",
      "4. 내적 타당화 — 전문가 검토: 구성요소 적절성 평정(CVI)·개선 의견 반영 ('내용타당도지수(CVI)' 가이드)",
      "5. 사용성 평가·예비 적용 — 소규모 파일럿으로 실행가능성·소요시간·이해도 점검 후 수정",
      "6. 외적 타당화 — 현장 본적용과 효과 검증 (사전·사후, 준실험 등 — '준실험연구' 가이드)",
      "7. 최종 프로그램·개발 원리 보고 — 수정 이력과 근거를 투명하게 제시",
    ],
    strengths: [
      "현장 기여가 직접적이고 산출물(프로그램)이 명확",
      "타당화 증거가 단계적이라 심사 방어가 용이",
    ],
    limitations: [
      "효과 검증까지 가면 도구 선정·표본 설계가 별도로 필요 (변인·측정도구 아카이브 활용)",
      "전문가 검토만으로 '타당화 완료'를 주장하면 외적 증거 부족 지적을 받기 쉬움",
      "개발과 검증을 한 사람이 수행해 객관성 확보 장치(외부 검토·공동 평정) 필요",
    ],
    educationalTechExamples: [
      "초등 AI 윤리교육 프로그램 개발 — 전문가 CVI 검토 2회 + 준실험 효과 검증",
      "성인 학습자 디지털 리터러시 연수 프로그램 개발과 사용성 평가",
      "플립러닝 기반 교사 연수 모형 개발 (Type 2) — 델파이로 구성요소 합의",
    ],
    references: [
      "Richey, R. C., & Klein, J. D. (2007). Design and Development Research: Methods, Strategies, and Issues. Routledge.",
    ],
  },
];

const VALIDITY_TERM = {
  term: "타당도 증거의 종류 (내용·구인·준거)",
  englishName: "Sources of Validity Evidence",
  category: "measurement-scale",
  summary:
    "타당도는 '도구가 타당하다/아니다'의 속성이 아니라 점수 해석을 지지하는 증거의 축적이다(Messick, 1995; AERA·APA·NCME 기준의 관점). 전통적 3분류로 ① 내용 타당도 — 문항이 구인의 내용 영역을 대표하는가 (전문가 평정·CVI로 수집) ② 구인 타당도 — 점수가 이론적 구인 구조와 일치하는가 (EFA/CFA의 요인구조, 관련 구인과의 수렴 상관·무관 구인과의 판별 상관) ③ 준거 타당도 — 점수가 외부 준거를 예측·동시 반영하는가 (공인: 같은 시점 준거와 상관 / 예측: 미래 준거와 상관). 연구 보고에는 '어떤 증거를 어떤 절차로 수집했는지'를 명시해야 하며, 새 척도 개발이면 내용→구인→준거 순으로, 기존 척도 사용이면 본 표본에서의 신뢰도와 CFA 적합도를 재보고하는 것이 관례다.",
  accessibleSummary:
    "타당도는 합격 도장이 아니라 증거 모으기예요. '내용을 빠짐없이 담았다(전문가 검토)', '이론대로 묶인다(요인분석)', '관련 결과를 예측한다(준거 상관)' — 세 종류의 증거 중 내 연구에 필요한 것을 골라 절차와 함께 보고하면 됩니다.",
  examples: [
    { id: randomUUID(), text: "개발한 척도의 내용 타당도는 전문가 7인의 I-CVI(≥.78)로, 구인 타당도는 CFA 적합도(CFI=.95, RMSEA=.06)로 확인하였다." },
    { id: randomUUID(), text: "준거 타당도 확인을 위해 학업성취도와의 공인 상관(r=.42, p<.01)을 제시하였다." },
  ],
};

async function main() {
  const rm = await db.collection("archive_research_methods").get();
  const rmNames = new Set(rm.docs.map((d) => (d.data() as { name?: string }).name ?? ""));
  let added = 0;
  for (const g of METHOD_GUIDES) {
    if (rmNames.has(g.name)) {
      console.log(`skip (존재): ${g.name}`);
      continue;
    }
    added += 1;
    console.log(`+ 연구방법 가이드: ${g.name}`);
    if (APPLY) {
      await db.collection("archive_research_methods").add({
        ...g,
        published: true,
        curatedBy: "system:orchestra-cycle62",
        createdBy: "system:orchestra-cycle62",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  const ft = await db.collection("archive_foundation_terms").get();
  const ftNames = new Set(ft.docs.map((d) => (d.data() as { term?: string }).term ?? ""));
  if (!ftNames.has(VALIDITY_TERM.term)) {
    console.log(`+ 기초 용어: ${VALIDITY_TERM.term}`);
    if (APPLY) {
      await db.collection("archive_foundation_terms").add({
        ...VALIDITY_TERM,
        published: true,
        createdBy: "system:orchestra-cycle62",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  } else {
    console.log(`skip (존재): ${VALIDITY_TERM.term}`);
  }

  console.log(`\n신규 가이드 ${added} · ${APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ==="}`);
}
void main();
