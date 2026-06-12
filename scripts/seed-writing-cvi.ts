// 사이클 54b — 수업자료 기반 2차 보강: 작성 팁 2종 + CVI 통계 가이드 + 메타인지 전략 단락
//  · 자료 주제(학위논문작성법 APA · 서론 작성 · 전문가 타당도 CVI · 메타인지 전략)를
//    저작권 안전하게 전부 재서술 — 원문 문장 복사 없음, 학술 통설 + 공개 서지만 수록.
//  · 멱등: 제목/이름 존재 시 스킵, 메타인지 append 는 마커 문자열 존재 시 스킵.
// 실행: npx tsx scripts/seed-writing-cvi.ts          (드라이런)
//       npx tsx scripts/seed-writing-cvi.ts --apply  (적용)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const now = () => new Date().toISOString();

const NEW_TIPS = [
  {
    title: "APA 참고문헌 기본형: 저자–연도–제목–출처",
    category: "academic-convention",
    accessibleSummary: "참고문헌 한 줄은 '누가(저자), 언제(연도), 무엇을(제목), 어디에(출처)' 네 블록으로 만든다",
    explanation:
      "APA 양식의 참고문헌은 저자, 발행연도, 제목, 출처(학술지명·권·호·페이지 또는 출판사)의 네 블록을 정해진 구두점으로 잇는 구조다. 학술지 논문이면 학술지명과 권은 이탤릭, 호는 괄호, 마지막에 DOI 를 둔다. 학위논문은 제목 뒤 대괄호에 학위 종류를, 이어서 수여 기관을 쓴다. 블록 순서와 구두점만 일관되게 지켜도 참고문헌 오류의 대부분을 예방할 수 있다.",
    wrongExample: "홍길동, 플립러닝이 학습몰입에 미치는 영향, 교육공학연구, 2023",
    correctExample: "홍길동 (2023). 플립러닝이 학습몰입에 미치는 영향. 교육공학연구, 39(2), 123–150. https://doi.org/10.xxxx/xxxx",
    additionalExamples: [
      "학위논문: 홍길동 (2024). 생성형 AI 활용 수업 설계 연구 [석사학위논문]. 연세대학교 교육대학원.",
      "단행본: Mayer, R. E. (2021). Multimedia learning (3rd ed.). Cambridge University Press.",
    ],
    tags: ["APA", "참고문헌", "서지"],
  },
  {
    title: "서론은 '문제 제기 → 연구 갭 → 본 연구의 기여' 흐름으로",
    category: "academic-convention",
    accessibleSummary: "좋은 서론은 독자를 끌어들이고(왜 중요한가), 빈틈을 보여주고(무엇이 빠졌나), 약속한다(이 연구가 무엇을 더하나)",
    explanation:
      "경영학·교육학 등 사회과학 학술지 편집장들이 공통으로 권하는 서론 구조는 세 단계다. 첫째, 연구 주제가 왜 지금 중요한지 현상이나 통계로 문제를 제기한다. 둘째, 선행연구가 무엇을 밝혔고 무엇을 아직 다루지 못했는지 '갭'을 구체적으로 짚는다. 셋째, 본 연구가 그 갭을 어떻게 메우는지 연구 목적과 기여를 명시한다. 선행연구 나열로 시작해 목적이 마지막에야 등장하는 서론은 독자가 길을 잃기 쉽다.",
    wrongExample: "A(2020)는 ~을 연구하였다. B(2021)는 ~을 연구하였다. C(2022)는 … (나열 후 갑자기) 본 연구의 목적은 ~이다.",
    correctExample: "원격수업 전환 이후 학습격차가 심화되고 있다(문제). 그러나 기존 연구는 대학 맥락에 집중되어 초등 현장의 검증이 부족하다(갭). 이에 본 연구는 초등 고학년을 대상으로 ~을 검증한다(기여).",
    additionalExamples: [
      "갭 문장 예: '~에 관한 연구는 활발하지만, ~을 직접 비교한 연구는 드물다.'",
    ],
    tags: ["서론", "논문 구조", "연구 갭"],
  },
];

const CVI_GUIDE = {
  name: "내용타당도지수(CVI)",
  category: "측정·타당도",
  summary: "전문가 패널 평정으로 측정도구·프로그램 문항의 내용타당도를 수치화하는 지표 (I-CVI·S-CVI)",
  description:
    "내용타당도지수(Content Validity Index)는 개발한 문항이나 프로그램 구성요소가 측정하려는 내용을 적절히 대표하는지 전문가 패널의 평정으로 수치화하는 방법이다. 각 전문가가 문항별 관련성을 4점 척도(전혀 관련 없음~매우 관련 있음)로 평가하면, 3~4점을 준 전문가 비율로 문항 수준 I-CVI 를, 문항 전체의 평균으로 척도 수준 S-CVI 를 산출한다. 교육공학의 설계·개발연구에서 프로그램 시안이나 검사도구의 전문가 검토 단계에 널리 쓰인다.",
  assumptions: [
    "전문가 패널이 해당 내용 영역의 실질적 전문성을 갖출 것 (통상 3~10인)",
    "평정 척도와 '관련성' 정의를 전문가에게 동일하게 안내할 것",
    "문항이 측정 구인의 내용 영역을 빠짐없이 표집하도록 사전 설계할 것",
  ],
  whenToUse: [
    "설계·개발연구에서 프로그램 구성요소의 전문가 검토를 수치 근거로 남기고 싶을 때",
    "새 검사지·설문 문항의 내용타당도를 보고해야 할 때",
    "델파이 조사와 함께 도구 정련 라운드를 운영할 때",
  ],
  procedure: [
    "1. 전문가 패널 구성(3~10인)과 평정 기준 안내",
    "2. 문항별 관련성 4점 척도 평정 수집",
    "3. I-CVI 산출 — 문항별 3·4점 평정 전문가 비율",
    "4. S-CVI 산출 — I-CVI 평균(S-CVI/Ave) 또는 전원 일치 비율(S-CVI/UA)",
    "5. 기준 미달 문항 수정·삭제 후 필요 시 재평정",
  ],
  interpretationKeys: [
    "전문가 6인 이상이면 I-CVI ≥ .78 을 수용 기준으로 보는 관례가 널리 쓰임 (Polit & Beck, 2006)",
    "S-CVI/Ave ≥ .90 이면 척도 전체의 내용타당도가 우수하다고 해석",
    "전문가 5인 이하 소규모 패널은 I-CVI 1.00(전원 일치)을 요구하는 보수적 기준 권장",
    "수치와 함께 전문가의 질적 의견(수정 제안)을 반영 과정으로 보고하면 설득력이 높아짐",
  ],
  references: [
    "Polit, D. F., & Beck, C. T. (2006). The content validity index: Are you sure you know what's being reported? Research in Nursing & Health, 29(5), 489–497.",
    "Lynn, M. R. (1986). Determination and quantification of content validity. Nursing Research, 35(6), 382–386.",
  ],
};

const META_APPEND =
  "\n\n실천 전략으로는 스스로 묻고 답하며 이해를 점검하는 자기질문, 학습 전–중–후를 '아는 것·알고 싶은 것·배운 것'으로 조직하는 KWL, 훑어보기–질문–읽기–숙고–암송–복습 단계로 독해를 구조화하는 PQ4R, 문제 확인–정의–대안 탐색–실행–회고로 문제해결을 점검하는 IDEAL 등이 대표적이다. 이들 전략은 디지털 학습환경에서 메타인지 스캐폴딩(점검 프롬프트·학습 일지·대시보드)으로 구현되곤 한다.";

async function main() {
  // 1) 작성 팁 2종
  const tips = await db.collection("archive_writing_tips").get();
  const tipTitles = new Set(tips.docs.map((d) => (d.data() as { title?: string }).title ?? ""));
  for (const t of NEW_TIPS) {
    if (tipTitles.has(t.title)) {
      console.log(`skip (존재): ${t.title}`);
      continue;
    }
    console.log(`+ 작성 팁: ${t.title}`);
    if (APPLY) {
      await db.collection("archive_writing_tips").add({
        ...t,
        published: true,
        createdBy: "system:orchestra-cycle54",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  // 2) CVI 통계 가이드
  const sm = await db.collection("archive_statistical_methods").get();
  const smNames = new Set(sm.docs.map((d) => (d.data() as { name?: string }).name ?? ""));
  if (!smNames.has(CVI_GUIDE.name)) {
    console.log(`+ 통계 가이드: ${CVI_GUIDE.name}`);
    if (APPLY) {
      await db.collection("archive_statistical_methods").add({
        ...CVI_GUIDE,
        alumniThesisIds: [],
        published: true,
        curatedBy: "system:orchestra-cycle54",
        createdBy: "system:orchestra-cycle54",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  } else {
    console.log(`skip (존재): ${CVI_GUIDE.name}`);
  }

  // 3) 메타인지 전략 단락 append (마커: "자기질문")
  const meta = await db.collection("archive_concepts").where("name", "==", "메타인지").get();
  const m = meta.docs[0];
  if (m) {
    const desc = (m.data() as { description?: string }).description ?? "";
    if (desc.includes("자기질문")) {
      console.log("skip (보유): 메타인지 전략 단락");
    } else {
      console.log("~ 보강: 메타인지 description 에 전략 단락 추가");
      if (APPLY) {
        await db.collection("archive_concepts").doc(m.id).update({
          description: desc + META_APPEND,
          updatedAt: now(),
        });
      }
    }
  }

  console.log(APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ===");
}

void main();
