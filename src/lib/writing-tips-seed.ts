// 학술 글쓰기 가이드 — 시드 (~16개, published: false 로 적재)
//
// 운영자가 검수 후 published=true 로 토글하여 공개. 학술적 책임 회피를 위해
// hedge 표현 ("일반적으로", "흔히", "통상", "권장된다") 위주.
//
// 카테고리별 분포:
// - translationese (번역투): 7
// - subject-predicate (주술호응): 3
// - tense-voice (시제·태): 3
// - spelling-spacing (맞춤법·표기): 3
// - academic-convention (학술 관례): 3
//
// 총 19개 (운영자가 콘솔에서 추가·삭제 가능).

import { writingTipsApi } from "./bkend";
import type {
  WritingTip,
  WritingTipCategory,
  WritingTipExample,
} from "@/types";

interface SeedEntry {
  title: string;
  category: WritingTipCategory;
  wrongExample: string;
  correctExample: string;
  explanation: string;
  accessibleSummary?: string;
  tags?: string[];
  additionalExamples?: string[];
}

const SEED_WRITING_TIPS: SeedEntry[] = [
  // ─── translationese (번역투 7) ───
  {
    title: "이중 피동 표현 피하기",
    category: "translationese",
    wrongExample: "본 연구에서는 ~ 도구가 사용되어진다.",
    correctExample: "본 연구에서는 ~ 도구를 사용한다 / ~ 도구가 사용된다.",
    explanation:
      "'~되어진다' 는 피동 어미 '-되-' 와 또 다른 피동 표현 '-어지-' 가 겹친 이중 피동입니다. 학술 한국어에서는 일반적으로 단일 피동 또는 능동 표현이 자연스러우며, 국립국어원도 이중 피동 표현을 비표준으로 안내하고 있습니다.",
    accessibleSummary:
      "'되-' 와 '어지-' 를 동시에 쓰면 '두 번 수동' 이 됩니다. 한 번이면 충분합니다.",
    tags: ["피동", "이중피동", "기본"],
    additionalExamples: [
      "❌ 결과가 도출되어진다 → ✅ 결과가 도출된다",
      "❌ 의미가 부여되어진다 → ✅ 의미가 부여된다 / 의미를 부여한다",
    ],
  },
  {
    title: "'~에 있어서' 남용 줄이기",
    category: "translationese",
    wrongExample: "본 연구에 있어서 가장 중요한 한계는 표본의 크기이다.",
    correctExample: "본 연구에서 가장 중요한 한계는 표본의 크기이다.",
    explanation:
      "'~에 있어서' 는 일본어식 표현 '~において' 의 번역에서 유래한 표현으로 흔히 지적됩니다. 통상 '~에서', '~의 경우', '~에 관해서' 등으로 바꾸면 더 자연스러우며 문장도 짧아집니다.",
    accessibleSummary:
      "'~에 있어서' 는 흔히 자리만 차지하는 군더더기입니다. '~에서' 로 바꾸면 거의 같은 뜻이 됩니다.",
    tags: ["관용구", "일본어투", "남용"],
    additionalExamples: [
      "❌ 교육에 있어서 평가의 역할 → ✅ 교육에서 평가의 역할",
      "❌ 학습자에 있어서 동기는 → ✅ 학습자에게 동기는 / 학습자의 동기는",
    ],
  },
  {
    title: "'~을 통해' 남용 줄이기",
    category: "translationese",
    wrongExample: "본 연구는 설문조사를 통해 결과를 도출하였다.",
    correctExample: "본 연구는 설문조사로 결과를 도출하였다.",
    explanation:
      "'~을 통해' 는 영어 'through' 의 직역에서 비롯된 표현으로 자주 쓰이지만, 한국어에서는 조사 '-(으)로' 가 더 간결하고 자연스러운 경우가 많습니다. 모든 '~을 통해' 가 잘못은 아니지만, 단순 도구·수단을 가리킬 때는 '-(으)로' 가 권장됩니다.",
    accessibleSummary:
      "수단·도구를 가리킬 때는 '~을 통해' 보다 '-(으)로' 가 더 깔끔합니다.",
    tags: ["영어투", "남용", "조사"],
    additionalExamples: [
      "❌ 분석을 통해 도출된 → ✅ 분석으로 도출된 / 분석한 결과 도출된",
      "❌ 인터뷰를 통해 자료를 수집하였다 → ✅ 인터뷰로 자료를 수집하였다",
    ],
  },
  {
    title: "'~에 대한 연구' 등 중복 어휘 피하기",
    category: "translationese",
    wrongExample: "학습 동기에 대한 연구를 수행하였다.",
    correctExample: "학습 동기를 연구하였다.",
    explanation:
      "'~에 대한 연구를 수행하다' 는 영어 'conduct a study on X' 의 직역으로 흔히 쓰이지만, '~을 연구하다' 한 동사로 충분히 표현됩니다. 중복 어휘를 줄이면 문장이 간결해지고 의미 전달이 분명해집니다.",
    accessibleSummary:
      "'~에 대한 연구를 수행하였다' = '~을 연구하였다'. 짧게 쓰는 것이 일반적으로 권장됩니다.",
    tags: ["중복", "영어투", "간결성"],
    additionalExamples: [
      "❌ ~에 대한 검토가 이루어졌다 → ✅ ~을 검토하였다",
      "❌ ~에 대한 분석을 진행하였다 → ✅ ~을 분석하였다",
    ],
  },
  {
    title: "'~을 가지고 있다' 영어식 표현 다듬기",
    category: "translationese",
    wrongExample: "본 연구는 다음과 같은 한계점을 가지고 있다.",
    correctExample: "본 연구의 한계점은 다음과 같다 / 본 연구에는 다음과 같은 한계점이 있다.",
    explanation:
      "영어 'have' 의 직역으로 'A 가 B 를 가지고 있다' 가 자주 쓰이지만, 한국어에서는 'A 에 B 가 있다' 또는 'A 의 B 는 다음과 같다' 가 더 자연스러운 경우가 많습니다.",
    accessibleSummary:
      "'have' 를 '가지고 있다' 로 통째 번역하면 어색합니다. '~에 ~이 있다' 가 더 한국어다운 표현입니다.",
    tags: ["have", "직역", "영어투"],
    additionalExamples: [
      "❌ 의미를 가지고 있다 → ✅ 의미가 있다 / ~을 의미한다",
      "❌ 가능성을 가지고 있다 → ✅ 가능성이 있다",
    ],
  },
  {
    title: "'보여진다 / 말해진다' 등 부자연스러운 피동",
    category: "translationese",
    wrongExample: "결과가 통계적으로 유의한 것으로 보여진다.",
    correctExample: "결과가 통계적으로 유의한 것으로 나타났다 / 보인다.",
    explanation:
      "'보이다' 는 이미 그 자체로 피동의 의미를 가지므로 '-어지-' 를 덧붙인 '보여지다' 는 이중 피동입니다. '말하여지다' 도 마찬가지로 흔히 비표준으로 지적되는 표현입니다. '나타나다', '보인다', '논의된다' 등으로 다듬는 것이 권장됩니다.",
    accessibleSummary:
      "'보이다' 자체가 이미 피동입니다. '보여진다' 처럼 또 피동을 붙이면 어색해집니다.",
    tags: ["이중피동", "보여지다", "말해지다"],
    additionalExamples: [
      "❌ ~로 말해진다 → ✅ ~로 알려져 있다 / ~로 논의된다",
      "❌ ~로 여겨진다 → ✅ ~로 여기는 경향이 있다 / ~로 보인다",
    ],
  },
  {
    title: "'~로 사료된다' 대신 명확한 동사 사용",
    category: "translationese",
    wrongExample: "이는 학습몰입이 매개 역할을 한 것으로 사료된다.",
    correctExample: "이는 학습몰입이 매개 역할을 한 것으로 판단된다 / 보인다.",
    explanation:
      "'사료(思料)된다' 는 일본어 한자어 영향이 남은 격식 표현으로 흔히 지적됩니다. 학술 글에서는 '판단된다', '보인다', '추정된다', '시사한다' 등 의미가 더 분명한 동사를 권장합니다.",
    accessibleSummary:
      "'사료된다' 는 듣기엔 격식 있어 보이지만 일본어 한자어 잔재로 흔히 지적됩니다. '판단된다' 가 일반적으로 더 자연스럽습니다.",
    tags: ["일본어투", "격식", "한자어"],
    additionalExamples: [
      "❌ ~로 사료된다 → ✅ ~로 판단된다 / ~로 보인다",
      "❌ 효과가 있을 것으로 사료된다 → ✅ 효과가 있을 것으로 보인다",
    ],
  },

  // ─── subject-predicate (주술호응 3) ───
  {
    title: "긴 문장에서 주어 분실 주의",
    category: "subject-predicate",
    wrongExample:
      "본 연구는 학습몰입과 자기효능감의 관계를 분석하고, 자기조절학습 전략의 매개 효과를 검증함으로써 학습자의 학업성취 향상에 기여할 수 있을 것이다.",
    correctExample:
      "본 연구는 학습몰입과 자기효능감의 관계를 분석하고, 자기조절학습 전략의 매개 효과를 검증한다. 이를 통해 학습자의 학업성취 향상에 기여할 수 있을 것이다.",
    explanation:
      "한 문장에 동사가 여러 개 이어지면 주어와 마지막 동사의 호응이 흐려지기 쉽습니다. 일반적으로 한 문장에 핵심 동사 1~2개로 끊어 쓰는 것이 권장됩니다.",
    accessibleSummary:
      "문장이 길어질수록 주어가 길을 잃습니다. 두 문장으로 끊으면 호응이 살아납니다.",
    tags: ["긴문장", "주어", "기본"],
    additionalExamples: [
      "한 문장 = 한 가지 핵심 동작으로 끊는 연습 권장",
    ],
  },
  {
    title: "'본 연구의 목적은 ~이다' 일관성",
    category: "subject-predicate",
    wrongExample: "본 연구의 목적은 ~ 관계를 분석하고자 한다.",
    correctExample: "본 연구의 목적은 ~ 관계를 분석하는 데 있다 / 본 연구는 ~ 관계를 분석하고자 한다.",
    explanation:
      "'~의 목적은' 으로 시작했으면 서술어는 '~이다 / ~에 있다 / ~을 ~함이다' 등 명사·명사구로 받아야 호응이 맞습니다. '~의 목적은 ~하고자 한다' 는 주어와 서술어가 어긋난 형태로 자주 지적됩니다.",
    accessibleSummary:
      "'목적은' 으로 시작했으면 마지막은 '~것이다 / ~에 있다' 로 받아야 합니다.",
    tags: ["호응", "목적", "기본"],
    additionalExamples: [
      "❌ 본 연구의 목적은 ~ 살펴보고자 한다 → ✅ 본 연구의 목적은 ~ 살펴보는 데 있다",
      "❌ 본 연구의 목적은 ~ 한다 → ✅ 본 연구는 ~ 한다",
    ],
  },
  {
    title: "능동·피동 혼용 피하기",
    category: "subject-predicate",
    wrongExample: "본 연구자는 자료를 수집하고, 분석되었다.",
    correctExample: "본 연구자는 자료를 수집하여 분석하였다.",
    explanation:
      "같은 주어에 능동과 피동을 섞으면 호응이 어색해집니다. 한 문장 안에서는 능동·피동을 일관되게 사용하는 것이 일반적으로 권장됩니다.",
    accessibleSummary:
      "주어가 한 명인데 한 번은 '~한다' 다른 한 번은 '~된다' 면 어색합니다. 둘 중 하나로 통일하세요.",
    tags: ["피동", "능동", "일관성"],
    additionalExamples: [
      "❌ 데이터를 수집하고 분석되었다 → ✅ 데이터를 수집하고 분석하였다",
    ],
  },

  // ─── tense-voice (시제·태 3) ───
  {
    title: "연구 결과 기술은 과거시제 권장",
    category: "tense-voice",
    wrongExample: "분석 결과 두 집단 간 평균 차이가 통계적으로 유의하다.",
    correctExample: "분석 결과 두 집단 간 평균 차이가 통계적으로 유의하였다 / 유의한 것으로 나타났다.",
    explanation:
      "이미 종결된 분석·실험 결과는 일반적으로 과거시제로 기술합니다. APA 매뉴얼도 결과(Results) 와 논의(Discussion) 의 사실 기술은 과거시제를 권장합니다. 단, 이론적 명제(정의·법칙) 는 현재시제로 적습니다.",
    accessibleSummary:
      "'했다' 가 끝난 일은 '~했다 / ~였다' 로. 일반 법칙은 '~이다' 로.",
    tags: ["과거시제", "결과", "APA"],
    additionalExamples: [
      "❌ 효과가 나타난다 → ✅ 효과가 나타났다 (결과 기술)",
      "❌ 분석을 진행한다 → ✅ 분석을 진행하였다 (이미 한 연구)",
    ],
  },
  {
    title: "이론·정의는 현재시제 권장",
    category: "tense-voice",
    wrongExample: "Vygotsky(1978) 는 근접발달영역을 ~로 정의하였다.",
    correctExample: "Vygotsky(1978) 는 근접발달영역을 ~로 정의한다.",
    explanation:
      "보편적 정의·이론·법칙은 일반적으로 현재시제로 기술하는 것이 권장됩니다. APA 매뉴얼은 '이론·정의 = 현재', '특정 연구의 결과 = 과거' 라는 시제 구분을 안내합니다. 다만 시제 처리는 학술지·지도교수 지침에 따라 다를 수 있습니다.",
    accessibleSummary:
      "이론·정의는 시간을 초월하므로 '~이다 / ~한다' 가 자연스럽습니다.",
    tags: ["현재시제", "이론", "APA"],
    additionalExamples: [
      "❌ ~로 주장하였다 (현재까지 유효한 이론) → ✅ ~로 주장한다",
    ],
  },
  {
    title: "영문 학술 수동 → 한국어 능동 권장",
    category: "tense-voice",
    wrongExample: "자료는 SPSS 28.0 에 의해 분석되었다.",
    correctExample: "자료는 SPSS 28.0 으로 분석하였다 / 분석되었다.",
    explanation:
      "영문 학술 글은 'data were analyzed by SPSS' 처럼 수동태가 흔하지만, 한국어에서는 행위자(연구자)가 분명할 때 능동형이 일반적으로 더 자연스럽습니다. 다만 행위자가 비핵심 정보일 때는 한국어 피동도 그대로 사용할 수 있습니다.",
    accessibleSummary:
      "영문 수동은 한국어에서 그대로 따라가지 않아도 됩니다. '~으로 분석하였다' 가 흔히 더 자연스럽습니다.",
    tags: ["피동", "능동", "영어투"],
    additionalExamples: [
      "❌ ~에 의해 측정되었다 → ✅ ~으로 측정하였다",
    ],
  },

  // ─── spelling-spacing (맞춤법·표기 3) ───
  {
    title: "'연구결과' vs '연구 결과' 띄어쓰기",
    category: "spelling-spacing",
    wrongExample: "연구결과는 다음과 같다.",
    correctExample: "연구 결과는 다음과 같다.",
    explanation:
      "'연구' 와 '결과' 는 각각 독립적인 명사이므로 일반적으로 띄어 씁니다. 다만 학술지·논문 양식에서는 '연구결과' 를 합성어처럼 붙여 쓰는 관행도 있어 통일성을 유지하는 것이 권장됩니다. 동일 논문 내에서는 한 가지 표기로 일관되게 작성하세요.",
    accessibleSummary:
      "원칙은 '연구 결과' (띄어쓰기). 논문 내 일관성이 가장 중요합니다.",
    tags: ["띄어쓰기", "표기일관성"],
    additionalExamples: [
      "✅ '연구 목적' / '연구 방법' / '연구 결과' (원칙 띄어쓰기)",
    ],
  },
  {
    title: "외래어 표기: '데이터 / 데이타'",
    category: "spelling-spacing",
    wrongExample: "본 연구에서는 데이타를 수집하였다.",
    correctExample: "본 연구에서는 데이터를 수집하였다.",
    explanation:
      "외래어표기법(국립국어원) 에 따르면 'data' 의 표준 표기는 '데이터' 입니다. '데이타' 는 비표준 표기로 흔히 지적됩니다. 비슷한 사례로 '컴퓨터(○)/컴퓨타(✕)', '메뉴(○)/메뉴얼(✕→매뉴얼)' 등이 있습니다.",
    accessibleSummary:
      "외래어는 국립국어원 표준 표기를 따르는 것이 일반적으로 권장됩니다.",
    tags: ["외래어", "표기", "국립국어원"],
    additionalExamples: [
      "❌ 메뉴얼 → ✅ 매뉴얼",
      "❌ 컨텐츠 → ✅ 콘텐츠",
    ],
  },
  {
    title: "'되다' 와 '하다' 구분",
    category: "spelling-spacing",
    wrongExample: "자료의 분석이 안되어 결과 도출이 지연되었다.",
    correctExample: "자료의 분석이 안 되어 결과 도출이 지연되었다.",
    explanation:
      "'안 되다' (부정 부사 '안' + 동사 '되다') 는 띄어 쓰고, '안되다' (한 단어 형용사: '잘되지 못하다') 는 붙여 씁니다. 의미에 따라 띄어쓰기가 달라집니다. '되-' 와 '돼-' 도 자주 혼동되므로, '돼' 가 '되어' 의 줄임임을 기억하면 도움이 됩니다.",
    accessibleSummary:
      "'안 되어' 처럼 행위가 안 일어났을 때는 띄어 씁니다. '안되네' (잘 안 풀리네) 는 붙입니다.",
    tags: ["띄어쓰기", "되다", "기본"],
    additionalExamples: [
      "❌ 분석이 잘안된다 → ✅ 분석이 잘 안 된다",
      "❌ 안되요 → ✅ 안 돼요 (안 되어요)",
    ],
  },

  // ─── academic-convention (학술 관례 3) ───
  {
    title: "'본 연구는' 일관 사용 권장",
    category: "academic-convention",
    wrongExample: "이 연구에서는 ~을 다루고, 본 연구에서는 ~을 살펴본다.",
    correctExample: "본 연구에서는 ~을 다루고, ~을 살펴본다.",
    explanation:
      "학술 논문에서는 자기 연구를 가리키는 표현으로 흔히 '본 연구' 를 사용합니다. '이 연구', '본고', '본 논문' 도 가능하지만, 한 논문 내에서는 한 가지 표현으로 통일하는 것이 일반적으로 권장됩니다.",
    accessibleSummary:
      "내 연구를 가리키는 표현은 한 가지로 통일하세요. '본 연구' 가 가장 일반적입니다.",
    tags: ["용어일관성", "본연구"],
    additionalExamples: [
      "✅ 한 논문 내에서 '본 연구' 또는 '본 논문' 중 하나로 통일",
    ],
  },
  {
    title: "1인칭 '나·우리' 회피",
    category: "academic-convention",
    wrongExample: "내가 자료를 수집하여 분석하였다.",
    correctExample: "연구자는 자료를 수집하여 분석하였다 / 본 연구에서는 자료를 수집·분석하였다.",
    explanation:
      "한국 학술 글쓰기에서는 1인칭 대명사('나·내·우리') 의 직접 사용을 일반적으로 피하고, '연구자', '본 연구' 등 제3자적 표현을 권장합니다. 단, 최근 일부 영문 학술지(APA 7th 포함) 는 'I/we' 의 사용을 허용·권장하고 있어, 한국어 학술지·지도교수 지침을 우선 확인하는 것이 좋습니다.",
    accessibleSummary:
      "한국 학위논문에서는 '내가' 대신 '연구자' 가 일반적입니다. 영문 논문 관행과 다르니 지침 확인이 필요합니다.",
    tags: ["1인칭", "관례", "연구자"],
    additionalExamples: [
      "❌ 우리는 ~을 발견하였다 → ✅ 본 연구는 ~을 발견하였다",
    ],
  },
  {
    title: "인용 패턴: 저자(연도) 와 (저자, 연도)",
    category: "academic-convention",
    wrongExample: "선행연구(Smith) 에서는 2018년에 ~을 보고하였다.",
    correctExample: "Smith(2018) 는 ~을 보고하였다 / 선행연구에서는 ~이 보고되었다(Smith, 2018).",
    explanation:
      "APA 7판 인용 방식은 두 가지 패턴이 일반적입니다: 본문 인용 'Smith(2018) 는 ~이라고 보고하였다' 또는 괄호 인용 '~이 보고되었다(Smith, 2018)'. 두 패턴을 한 문장 안에서 섞거나, 저자명과 연도를 따로 떨어뜨려 적는 것은 권장되지 않습니다.",
    accessibleSummary:
      "Smith 와 2018 은 한 덩어리로 묶어야 합니다. 'Smith(2018)' 또는 '(Smith, 2018)' 두 가지 중 하나로.",
    tags: ["APA", "인용", "기본"],
    additionalExamples: [
      "✅ Vygotsky(1978) 는 ~을 정의하였다",
      "✅ ~로 정의되었다(Vygotsky, 1978)",
    ],
  },
];

export interface WritingTipSeedResult {
  created: number;
  skipped: number;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** 동일 제목(title) 의 항목은 스킵하고 나머지를 draft 로 일괄 생성. */
export async function seedWritingTips(
  userId: string,
  existing: WritingTip[],
): Promise<WritingTipSeedResult> {
  const existingTitles = new Set(existing.map((t) => t.title.trim()));
  let created = 0;
  let skipped = 0;
  for (const entry of SEED_WRITING_TIPS) {
    if (existingTitles.has(entry.title)) {
      skipped += 1;
      continue;
    }
    const additionalExamples: WritingTipExample[] | undefined =
      entry.additionalExamples && entry.additionalExamples.length > 0
        ? entry.additionalExamples.map((text) => ({ id: newId(), text }))
        : undefined;
    await writingTipsApi.create({
      title: entry.title,
      category: entry.category,
      wrongExample: entry.wrongExample,
      correctExample: entry.correctExample,
      explanation: entry.explanation,
      accessibleSummary: entry.accessibleSummary,
      tags: entry.tags,
      additionalExamples,
      published: false,
      createdBy: userId,
    });
    created += 1;
  }
  return { created, skipped };
}
