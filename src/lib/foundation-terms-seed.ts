// 교육공학 기초 용어 가이드 — 시드 (~22 개, published: false 로 적재)
//
// 운영자가 검수 후 published=true 로 토글하여 공개. 학술적 책임 회피를 위해
// 학부 통계학·교육공학 일반론 수준의 hedge 표현 ("일반적으로", "흔히", "통상") 위주.
//
// "비슷하지만 다른" (confusedWith) 페어는 양방향이 되도록 작성 —
// term A 의 confusedWith 에 term B 가 들어가면, term B 의 confusedWith 에도 term A 가 들어감.
// confusedTermLabel 은 한국어 용어명을 그대로 사용 (시드 적재 후 운영자가 confusedTermId 보강 가능).

import { foundationTermsApi } from "./bkend";
import type {
  FoundationTerm,
  FoundationTermCategory,
  FoundationTermConfusion,
} from "@/types";

interface SeedConfusion {
  /** 헷갈리는 다른 용어 라벨 (시드 내 term 명 또는 외부 자유 텍스트) */
  label: string;
  /** 차이점 설명 */
  distinction: string;
}

interface SeedEntry {
  term: string;
  abbreviation?: string;
  englishName?: string;
  category: FoundationTermCategory;
  summary: string;
  accessibleSummary?: string;
  definition?: string;
  examples?: string[];
  confusedWith?: SeedConfusion[];
}

const SEED_FOUNDATION_TERMS: SeedEntry[] = [
  // ─── variables (변인 4종) ───
  {
    term: "독립변인",
    abbreviation: "IV",
    englishName: "Independent Variable",
    category: "variables",
    summary:
      "연구자가 인위적으로 조작하거나 분류 기준으로 사용하여 종속변인에 미치는 효과를 검증하는 변인.",
    accessibleSummary:
      "내가 '바꿔보는 것'. 실험에서 '약 A 와 B 중 어느 쪽을 줄까' 처럼 연구자가 정하는 조건이 독립변인입니다.",
    examples: [
      "수업 방식(강의식 vs 토론식) — 학습 성취도에 미치는 영향 검증",
      "피드백 유형(즉시 vs 지연) — 동기에 미치는 영향 검증",
    ],
    confusedWith: [
      {
        label: "종속변인",
        distinction:
          "독립변인은 '원인 후보'로 연구자가 조작·분류하는 쪽이고, 종속변인은 '결과'로 측정하는 쪽입니다. 일반적으로 화살표는 독립변인 → 종속변인 방향으로 그립니다.",
      },
    ],
  },
  {
    term: "종속변인",
    abbreviation: "DV",
    englishName: "Dependent Variable",
    category: "variables",
    summary:
      "독립변인의 효과를 받아 측정되는 결과 변인. 연구자가 관찰·기록하는 대상.",
    accessibleSummary:
      "내가 '재보는 것'. 약 A 를 먹은 사람들의 '회복 속도' 처럼, 조작 후 결과로 측정하는 것이 종속변인입니다.",
    examples: [
      "학업 성취도 점수",
      "학습 몰입도 설문 점수",
      "과제 완수까지 걸린 시간",
    ],
    confusedWith: [
      {
        label: "독립변인",
        distinction:
          "종속변인은 '결과'로 측정하는 쪽이고, 독립변인은 '원인 후보'로 조작·분류하는 쪽입니다. 통상 독립변인 → 종속변인 순으로 인과 화살표를 그립니다.",
      },
    ],
  },
  {
    term: "매개변인",
    englishName: "Mediator",
    category: "variables",
    summary:
      "독립변인의 효과가 종속변인에 전달되는 경로 중간에 위치하여 '왜·어떻게' 그 효과가 일어나는지 설명하는 변인.",
    accessibleSummary:
      "원인과 결과 사이의 '징검다리'. 'X 가 Y 에 영향을 미치는데 그 중간 단계가 M' 이라고 설명할 때 M 이 매개변인입니다.",
    examples: [
      "수업 방식 → 흥미 → 학업 성취 (흥미가 매개)",
      "피드백 → 자기효능감 → 과제 지속 (자기효능감이 매개)",
    ],
    confusedWith: [
      {
        label: "조절변인",
        distinction:
          "매개변인은 X → M → Y 처럼 인과 경로의 '중간 단계' 입니다. 반면 조절변인은 X → Y 효과의 '강도·방향'을 바꾸는 별도 변인입니다. 일반적으로 매개는 'why·how', 조절은 'when·for whom' 질문에 답합니다.",
      },
    ],
  },
  {
    term: "조절변인",
    englishName: "Moderator",
    category: "variables",
    summary:
      "독립변인이 종속변인에 미치는 효과의 강도나 방향을 변화시키는 변인.",
    accessibleSummary:
      "효과의 '볼륨 조절기'. 같은 수업도 학습자 특성에 따라 효과가 다르게 나타날 때, 그 특성이 조절변인입니다.",
    examples: [
      "수업 방식 × 사전 지식 → 학업 성취 (사전 지식 수준에 따라 효과 다름)",
      "피드백 → 동기, 단 자기효능감 높은 학습자에서만 효과가 큼",
    ],
    confusedWith: [
      {
        label: "매개변인",
        distinction:
          "조절변인은 X → Y 효과의 '강도·방향'을 바꾸는 별도 변인 (상호작용항으로 분석). 매개변인은 X → M → Y 처럼 인과 경로의 '중간 단계' 입니다. 통상 조절은 'when', 매개는 'why' 에 답합니다.",
      },
    ],
  },

  // ─── research-design (연구설계 4종) ───
  {
    term: "연구모형",
    englishName: "Research Model",
    category: "research-design",
    summary:
      "연구문제·변인·가설을 시각화하여 변인 간 관계를 화살표·박스로 표현한 도식.",
    accessibleSummary:
      "연구의 '설계도'. 어떤 변인이 어떤 변인에 영향을 주는지 화살표로 그린 한 장의 큰 그림입니다.",
    examples: [
      "X → Y 단순 인과 모형",
      "X → M → Y 매개 모형 + 조절변인 Z",
    ],
  },
  {
    term: "처치",
    englishName: "Treatment",
    category: "research-design",
    summary:
      "실험·준실험 연구에서 독립변인을 구현하기 위해 연구 참여자에게 의도적으로 제공하는 조작 또는 개입.",
    accessibleSummary:
      "실험에서 '한쪽 집단에 일부러 해보는 것'. 새 교수법을 시험할 때 '실험 집단에는 새 교수법, 통제 집단에는 기존 교수법' 처럼 제공하는 조건이 처치입니다.",
    confusedWith: [
      {
        label: "중재 (Intervention)",
        distinction:
          "처치(treatment) 는 통상 실험·준실험 설계에서 변인 조작 단위를 가리키는 용어로 자주 쓰이고, 중재(intervention) 는 임상·교육 현장에서 문제 개선을 목적으로 한 프로그램·개입 전체를 가리키는 더 넓은 표현으로 흔히 사용됩니다. 학문 분야에 따라 호환되어 쓰이기도 합니다.",
      },
    ],
  },
  {
    term: "무선할당",
    englishName: "Random Assignment",
    category: "research-design",
    summary:
      "실험 참여자를 처치·통제 집단에 무작위로 배정하여 집단 간 사전 차이를 평균적으로 통제하는 절차.",
    accessibleSummary:
      "동전을 던져 '앞면이면 실험집단, 뒷면이면 통제집단' 처럼 무작위로 나누는 것. 사전 차이를 평균적으로 상쇄해 처치 효과를 깔끔하게 비교할 수 있게 합니다.",
    confusedWith: [
      {
        label: "무선표집",
        distinction:
          "무선할당은 '이미 모집된 참여자를 무작위로 처치/통제 집단에 배정'하는 절차로 내적 타당도와 관련됩니다. 무선표집(random sampling) 은 '모집단에서 표본을 무작위로 뽑는' 절차로 외적 타당도(일반화) 와 관련됩니다.",
      },
    ],
  },
  {
    term: "사전-사후 설계",
    englishName: "Pretest-Posttest Design",
    category: "research-design",
    summary:
      "처치 전후로 동일 측정도구를 사용해 종속변인을 측정하고 변화량을 비교하는 연구 설계.",
    accessibleSummary:
      "처치 '전' 과 '후' 의 점수를 모두 재서 얼마나 변했는지를 보는 설계. 통제 집단까지 함께 사전-사후를 재면 처치 효과를 비교적 명확하게 보여줍니다.",
  },

  // ─── instructional-design (교수설계 3종) ───
  {
    term: "교수체제설계",
    abbreviation: "ISD",
    englishName: "Instructional Systems Design",
    category: "instructional-design",
    summary:
      "분석·설계·개발·실행·평가의 체계적 절차로 교수·학습 환경을 설계하는 시스템적 접근 (예: ADDIE 모형).",
    accessibleSummary:
      "수업·교육 프로그램을 '체계적인 순서' 로 만들어가는 큰 틀. ADDIE(분석-설계-개발-실행-평가) 처럼 단계별로 진행되는 절차를 강조합니다.",
    confusedWith: [
      {
        label: "교수설계 (ID)",
        distinction:
          "ISD(교수체제설계) 는 시스템 관점에서 '분석부터 평가까지 전 절차'를 다루는 거시적 틀로 자주 쓰이고, ID(교수설계) 는 그 안에서 학습 목표·자료·전략을 구체적으로 만드는 활동을 좁게 가리키는 경우가 흔합니다. 학자에 따라 두 용어를 호환해 쓰기도 합니다.",
      },
    ],
  },
  {
    term: "교수설계",
    abbreviation: "ID",
    englishName: "Instructional Design",
    category: "instructional-design",
    summary:
      "학습 목표 달성을 위해 학습 내용·전략·자료·평가를 계획하고 구조화하는 활동.",
    accessibleSummary:
      "어떻게 가르치면 좋을지 '한 차시 또는 한 단원' 단위에서 설계하는 활동. 무엇을 가르치고, 어떤 자료·활동·평가로 진행할지를 짜는 과정입니다.",
    confusedWith: [
      {
        label: "교수체제설계 (ISD)",
        distinction:
          "ID(교수설계) 는 학습 자료·전략 등 구체적 설계 활동을 가리키는 데 자주 사용되고, ISD(교수체제설계) 는 분석부터 평가까지의 전 과정을 시스템 관점에서 다루는 거시 틀을 가리키는 경향이 있습니다.",
      },
    ],
  },
  {
    term: "교육과정",
    englishName: "Curriculum",
    category: "instructional-design",
    summary:
      "학습 목표·내용·경험·평가의 총체적 계획 — 한 과목·학년·학교 단위의 학습 경험을 포괄.",
    accessibleSummary:
      "'무엇을 가르치고 배울 것인가' 의 큰 그림. 한 학기·한 학년 전체에 걸쳐 어떤 내용·경험을 다룰지를 종합적으로 계획한 것이 교육과정입니다.",
    confusedWith: [
      {
        label: "Syllabus (강의계획서)",
        distinction:
          "Curriculum(교육과정) 은 통상 학교·학년·전공 단위의 거시적 계획이고, Syllabus(강의계획서) 는 한 과목·한 학기 단위의 미시적 운영 문서(주차별 주제·과제·평가 비중 등) 입니다.",
      },
    ],
  },

  // ─── systems-theory (체제이론 3종) ───
  {
    term: "체제",
    englishName: "System",
    category: "systems-theory",
    summary:
      "상호작용하는 구성요소들이 공동의 목적을 위해 유기적으로 연결된 전체 — 교수설계에서 분석·설계·개발·실행·평가의 상호의존을 강조.",
    accessibleSummary:
      "여러 부품이 '서로 연결되어 함께 작동하는' 하나의 큰 덩어리. 한 부분을 바꾸면 다른 부분에도 영향을 주는 통합된 구조를 가리킵니다.",
    confusedWith: [
      {
        label: "체계",
        distinction:
          "교육공학에서 '체제(system)' 는 통상 상호작용·통합·전체성을 강조하는 systems theory 맥락에서 사용되고, '체계' 는 일상적으로 '잘 정리된 순서·구조' 라는 의미로 쓰입니다. 한국어로는 자주 혼용되지만 학술 글에서는 의미 차이가 강조됩니다.",
      },
    ],
  },
  {
    term: "체계",
    englishName: "Ordered Structure",
    category: "systems-theory",
    summary:
      "일정한 원리에 따라 순서 있게 정리된 구조 — 일상어에서 '잘 정리된 순서·조직' 의 의미로 자주 사용.",
    accessibleSummary:
      "'정리된 순서' 자체에 가까운 의미. 책장에 책을 '체계적으로 꽂는다' 처럼, 일정한 기준으로 잘 정리된 상태를 가리킵니다.",
    confusedWith: [
      {
        label: "체제",
        distinction:
          "'체계' 는 '잘 정리된 순서·구조' 의 일반적 의미, '체제(system)' 는 상호작용·전체성·시스템 사고를 강조하는 학술 용어로 흔히 구분됩니다. 한국어 자연스러운 표현에서는 호환되어 쓰이기도 하지만, 교육공학·시스템 이론 글에서는 의도적으로 분리해서 사용합니다.",
      },
    ],
  },
  {
    term: "체제적 분석",
    englishName: "Systemic Analysis",
    category: "systems-theory",
    summary:
      "구성요소 간 상호작용과 전체성을 함께 고려하여 문제를 진단·해결하는 분석 접근.",
    accessibleSummary:
      "문제를 한 부분만 보지 않고 '연결망 전체' 로 보는 접근. 학습 부진을 학생 한 명의 문제로만 보지 않고 수업·자료·평가·환경 전체와의 관계로 분석합니다.",
    confusedWith: [
      {
        label: "체계적 분석 (Systematic Analysis)",
        distinction:
          "'체제적(systemic)' 분석은 통상 시스템·상호작용·전체성을 강조하고, '체계적(systematic)' 분석은 절차의 단계성·일관성·반복가능성을 강조하는 경향이 있습니다. 영문도 systemic vs systematic 로 구분됩니다.",
      },
    ],
  },

  // ─── measurement (측정·평가 7종) ───
  {
    term: "모집단",
    englishName: "Population",
    category: "measurement",
    summary:
      "연구자가 일반화하고자 하는 대상 전체의 집합.",
    accessibleSummary:
      "연구가 결과를 적용하고 싶은 '전체 사람들'. 예: '서울 시내 중학교 1학년 학생 전체' 가 모집단이라면, 우리는 그 전체에 대해 결론을 내리고 싶은 것입니다.",
    confusedWith: [
      {
        label: "표본",
        distinction:
          "모집단은 일반화 대상 '전체' 이고, 표본은 그중 실제 자료를 수집한 '일부' 입니다. 표본의 결과를 모집단으로 추론(통계적 추론) 하는 것이 양적 연구의 기본 흐름입니다.",
      },
    ],
  },
  {
    term: "표본",
    englishName: "Sample",
    category: "measurement",
    summary:
      "모집단에서 추출된 일부 — 실제 자료 수집과 분석의 단위.",
    accessibleSummary:
      "전체 중에서 '실제로 조사한 일부'. 모집단 전체를 조사하기 어려우니 대표성 있는 일부만 뽑아 분석한 뒤 모집단으로 추론합니다.",
    confusedWith: [
      {
        label: "모집단",
        distinction:
          "표본은 실제 자료를 수집한 '일부', 모집단은 일반화 대상 '전체' 입니다. 표본 크기가 작거나 편향되면 모집단 추론이 흔히 부정확해집니다.",
      },
    ],
  },
  {
    term: "표집",
    englishName: "Sampling",
    category: "measurement",
    summary:
      "모집단에서 표본을 추출하는 절차 — 무선·층화·편의 표집 등 다양한 방법.",
    accessibleSummary:
      "전체 중에서 '어떤 방식으로 일부를 뽑을지' 의 절차. 무작위로 뽑을 수도 있고, 학년별로 비율 맞춰 뽑을 수도 있습니다.",
  },
  {
    term: "효과크기",
    englishName: "Effect Size",
    category: "measurement",
    summary:
      "두 변인 간 관계의 강도 또는 처치 효과의 크기를 표준화된 지표로 표현한 값 (예: Cohen's d, r, η²).",
    accessibleSummary:
      "처치 효과가 '얼마나 크게' 나타났는지를 숫자로 표현한 것. p값은 '효과가 있는가' 의 통계적 유의성을, 효과크기는 '얼마나 큰 효과인가' 의 실제 크기를 알려줍니다.",
  },
  {
    term: "신뢰도",
    englishName: "Reliability",
    category: "measurement",
    summary:
      "측정도구가 동일 대상을 일관되게 측정하는 정도 — 반복 측정 시 결과가 일관될수록 신뢰도가 높음.",
    accessibleSummary:
      "측정 결과의 '일관성'. 같은 사람을 두 번 재거나, 비슷한 문항을 여러 개 모았을 때 점수가 일관되게 나오면 신뢰도가 높습니다.",
    examples: [
      "Cronbach α (내적일관성 신뢰도)",
      "재검사 신뢰도 — 같은 도구로 시간 간격 두고 측정한 두 점수의 상관",
    ],
    confusedWith: [
      {
        label: "타당도",
        distinction:
          "신뢰도는 '일관되게 재는가'(consistency), 타당도는 '재고자 하는 것을 정확히 재는가'(accuracy) 입니다. 일반적으로 신뢰도가 낮으면 타당도도 낮지만, 신뢰도가 높다고 자동으로 타당도가 높은 것은 아닙니다.",
      },
    ],
  },
  {
    term: "타당도",
    englishName: "Validity",
    category: "measurement",
    summary:
      "측정도구가 측정하고자 하는 구성개념을 실제로 측정하는 정도 — 내용·준거·구성 타당도 등으로 세분.",
    accessibleSummary:
      "측정도구가 '재려는 것을 제대로 재는가'. 자기효능감 척도라면, 정말 자기효능감을 재고 있는지(다른 것을 잘못 재고 있지는 않은지) 의 정확성입니다.",
    examples: [
      "내용 타당도 — 문항이 구성개념의 영역을 충분히 대표하는가",
      "구성 타당도 — 확인적 요인분석·수렴/판별 타당도",
      "준거 타당도 — 외부 준거와의 상관(공인/예측)",
    ],
    confusedWith: [
      {
        label: "신뢰도",
        distinction:
          "타당도는 '재려는 것을 정확히 재는가'(accuracy), 신뢰도는 '일관되게 재는가'(consistency) 입니다. 통상 타당도가 더 본질적이고, 신뢰도는 타당도의 필요조건 정도로 다뤄집니다.",
      },
      {
        label: "타당성",
        distinction:
          "타당도(validity) 는 측정도구가 구성개념을 제대로 재는지에 관한 측정 이론 용어이고, '타당성' 은 일상어로 '논리·근거가 합당한가' 의 일반적 정당화 의미로 쓰입니다. 한국어에서 자주 혼용되지만 학술적으로는 구분합니다.",
      },
    ],
  },
  {
    term: "타당성",
    englishName: "Soundness / Justification",
    category: "measurement",
    summary:
      "주장·논리·근거가 합당하고 정당화되는 정도 — 일상어에서 '말이 되는지' 의 일반적 정당화 의미.",
    accessibleSummary:
      "어떤 주장·계획이 '논리적으로 말이 되는가'. '이 연구의 타당성' 처럼 쓰일 때는 측정도구가 아니라 주장·이유의 합당함을 가리키는 경우가 많습니다.",
    confusedWith: [
      {
        label: "타당도",
        distinction:
          "'타당성' 은 논리·근거의 합당함을 가리키는 일상·일반어이고, '타당도(validity)' 는 측정도구가 구성개념을 제대로 측정하는지에 관한 측정 이론 용어입니다. 학술 글에서는 의도적으로 구분하는 것이 좋습니다.",
      },
    ],
  },

  // ─── learning-theory (학습이론 2종) ───
  {
    term: "근접발달영역",
    abbreviation: "ZPD",
    englishName: "Zone of Proximal Development",
    category: "learning-theory",
    summary:
      "학습자가 혼자서는 해결하기 어렵지만 유능한 타인의 도움(scaffolding) 으로는 해결할 수 있는 과제 영역 — Vygotsky.",
    accessibleSummary:
      "혼자서는 못 풀지만 도움받으면 풀 수 있는 '딱 알맞은 난이도' 의 영역. 너무 쉽거나 너무 어려운 과제 사이의 '학습 황금 구간' 입니다.",
  },
  {
    term: "인지부하",
    englishName: "Cognitive Load",
    category: "learning-theory",
    summary:
      "작업기억에 가해지는 정신적 처리 부담 — 내재적·외재적·관련 부하로 구분 (Sweller 외).",
    accessibleSummary:
      "머리에 한 번에 담을 수 있는 양의 '한계'. 학습 자료가 복잡하거나 산만하면 작업기억이 과부하되어 학습이 일반적으로 어려워집니다.",
  },
];

export interface FoundationTermSeedResult {
  created: number;
  skipped: number;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** 동일 이름(term) 의 항목은 스킵하고 나머지를 draft 로 일괄 생성. */
export async function seedFoundationTerms(
  userId: string,
  existing: FoundationTerm[],
): Promise<FoundationTermSeedResult> {
  const existingTerms = new Set(existing.map((t) => t.term.trim()));
  let created = 0;
  let skipped = 0;
  for (const entry of SEED_FOUNDATION_TERMS) {
    if (existingTerms.has(entry.term)) {
      skipped += 1;
      continue;
    }
    const confusedWith: FoundationTermConfusion[] | undefined = entry.confusedWith
      ? entry.confusedWith.map((c) => ({
          id: newId(),
          confusedTermLabel: c.label,
          distinction: c.distinction,
        }))
      : undefined;
    const examples = entry.examples
      ? entry.examples.map((text) => ({ id: newId(), text }))
      : undefined;
    await foundationTermsApi.create({
      term: entry.term,
      abbreviation: entry.abbreviation,
      englishName: entry.englishName,
      category: entry.category,
      summary: entry.summary,
      accessibleSummary: entry.accessibleSummary,
      definition: entry.definition,
      examples,
      confusedWith,
      published: false,
      createdBy: userId,
    });
    created += 1;
  }
  return { created, skipped };
}
