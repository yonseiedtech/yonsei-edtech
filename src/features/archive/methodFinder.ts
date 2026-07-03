// 통계방법 추천 마법사 — 결정 트리 로직 (UI 비의존, 순수 함수)
//  · 학생이 질문에 답하면 적합한 통계방법(seedKey)을 추천한다.
//  · seedKey 는 scripts/seed-statmethod-decision-dims-2026-06-30.ts 가 각 방법에 부여한 안정 키.
//  · ⚠ 참고용 추천이며 최종 설계는 지도교수와 상의 — UI 에 고지.

export type FinderAnswers = Record<string, string>;

export interface FinderOption {
  value: string;
  label: string;
  hint?: string;
}

/** 용어가 어려운 학습자를 위한 쉬운 풀이 + 예시 */
export interface FinderTermHelp {
  term: string;
  def: string;
}

export interface FinderQuestion {
  id: string;
  /** 이 질문을 보여줄 조건 (이전 답안 기준). 없으면 항상 노출. */
  when?: (a: FinderAnswers) => boolean;
  title: string;
  help?: string;
  /** 종속/독립변인 등 어려운 용어 풀이(예시 포함) — UI 에서 '용어 도움말'로 노출 */
  terms?: FinderTermHelp[];
  options: FinderOption[];
}

/** 동일 데이터로 시도해볼 수 있는 다른 방법(이유 포함) */
export interface FinderAlternative {
  seedKey: string;
  /** 언제·왜 이 방법을 대신 쓰는지 */
  reason: string;
}

export interface FinderResult {
  /** 추천 통계방법 seedKey (statistical-method:{slug}) */
  primary: string;
  /** 동일 데이터로 시도해볼 수 있는 다른 방법(이유 포함) */
  alternatives: FinderAlternative[];
  /** 추천 근거 한두 문장 */
  rationale: string;
}

export const FINDER_QUESTIONS: FinderQuestion[] = [
  {
    id: "goal",
    title: "이 분석으로 가장 알고 싶은 것은 무엇인가요?",
    help: "연구 질문의 성격을 고르면 그에 맞는 갈래로 안내합니다.",
    options: [
      { value: "difference", label: "집단 간 차이·평균 비교", hint: "예: 실험집단 vs 통제집단의 점수 차이" },
      { value: "relationship", label: "변수 간 관계·예측", hint: "예: A가 높을수록 B도 높은가 / A로 B를 예측" },
      { value: "structure", label: "척도의 구조·타당도", hint: "예: 문항들이 몇 개 요인으로 묶이나 / 측정모형 검증" },
      { value: "categorical", label: "범주(빈도) 간 연관", hint: "예: 성별과 합격 여부가 관련 있나" },
    ],
  },
  // ── 차이 비교 갈래 ──
  {
    id: "dvCount",
    when: (a) => a.goal === "difference",
    title: "결과(종속)변수는 몇 개인가요?",
    help: "점수처럼 비교하려는 연속형 결과의 개수입니다.",
    terms: [
      {
        term: "종속변인 = 결과변수",
        def: "연구에서 '결과'로 측정하는 값. 처치·집단에 따라 달라지길 기대하는 것. 예: 시험 점수, 만족도, 자기효능감 점수.",
      },
    ],
    options: [
      { value: "one", label: "1개", hint: "예: 사후 시험점수 하나" },
      { value: "two_or_more", label: "2개 이상", hint: "예: 흥미·자기효능감·성취를 함께" },
    ],
  },
  {
    id: "groups",
    when: (a) => a.goal === "difference",
    title: "비교할 집단(조건)은 어떻게 되나요?",
    help: "여기서 집단을 나누는 기준이 보통 독립변인입니다.",
    terms: [
      {
        term: "독립변인 = 원인·조건변수",
        def: "결과에 영향을 준다고 보는 원인·조건. 집단을 나누는 기준이 됩니다. 예: 교수법(A/B), 집단(실험/통제), 학년.",
      },
    ],
    options: [
      { value: "two", label: "서로 다른 2집단", hint: "예: 실험 vs 통제" },
      { value: "three_or_more", label: "3집단 이상", hint: "예: A·B·C 교수법" },
      { value: "one_repeated", label: "같은 대상의 전·후(1집단 반복)", hint: "예: 처치 전후 같은 학생" },
      { value: "one_repeated_multi", label: "같은 대상 3회 이상 반복측정", hint: "예: 사전·중간·사후" },
    ],
  },
  {
    id: "covariate",
    // QA-v2: 반복측정(1집단) 설계에서 공변량 질문이 ANCOVA(집단 비교)로 오라우팅하던 결함 —
    // 집단 간 비교 설계에서만 묻는다.
    when: (a) => a.goal === "difference" && (a.groups === "two" || a.groups === "three_or_more"),
    title: "통제하고 싶은 공변량이 있나요?",
    help: "사전점수·학년 등 결과에 영향을 주는 변수를 보정하고 싶다면 '있다'.",
    options: [
      { value: "yes", label: "있다 (예: 사전점수 보정)" },
      { value: "no", label: "없다" },
    ],
  },
  {
    id: "normality",
    when: (a) =>
      a.goal === "difference" &&
      a.dvCount !== "two_or_more" &&
      (a.covariate === "no" || a.groups === "one_repeated" || a.groups === "one_repeated_multi"),
    title: "표본 크기와 정규성은 어떤가요?",
    help: "집단당 30명 미만의 작은 표본이거나 점수 분포가 심하게 치우쳤다면 비모수 검정이 안전합니다.",
    terms: [
      {
        term: "비모수 검정",
        def: "점수 자체가 아니라 순위로 비교하는 방법. 정규분포 가정이 필요 없어 소표본·치우친 분포에서 안전합니다.",
      },
    ],
    options: [
      { value: "ok", label: "표본이 충분하거나 정규성 확보", hint: "예: 집단당 30명 이상" },
      { value: "violated", label: "소표본이거나 정규성 의심", hint: "예: 집단당 10~20명, 치우친 분포" },
    ],
  },
  // ── 관계·예측 갈래 ──
  {
    id: "dvType",
    when: (a) => a.goal === "relationship",
    title: "예측·설명하려는 결과변수의 형태는?",
    terms: [
      {
        term: "종속변인 = 결과변수",
        def: "예측·설명의 대상이 되는 값. 예: 성취도 점수(연속형), 합격 여부(이분형).",
      },
    ],
    options: [
      { value: "continuous", label: "연속형 (점수·수치)", hint: "예: 성취도 점수" },
      { value: "binary", label: "이분형 (예/아니오)", hint: "예: 합격/불합격, 지속/중단" },
      { value: "latent", label: "잠재변인 간 복합 인과", hint: "예: 매개·다중경로 모형" },
    ],
  },
  {
    id: "predictors",
    when: (a) => a.goal === "relationship" && a.dvType === "continuous",
    title: "예측변수를 여러 개로 모형화하나요?",
    terms: [
      {
        term: "예측변인(독립변인)",
        def: "결과를 예측·설명하는 데 쓰는 변수. 예: 학습시간·동기·사전성취로 성취도를 예측한다면 이 셋이 예측변인.",
      },
    ],
    options: [
      { value: "multiple", label: "예측변수 여러 개로 예측·설명", hint: "회귀모형" },
      { value: "just_relation", label: "두 변수의 관계 강도만 본다", hint: "상관" },
    ],
  },
  // ── 구조·타당도 갈래 ──
  {
    id: "structureGoal",
    when: (a) => a.goal === "structure",
    title: "측정·구조에서 무엇을 하려 하나요?",
    options: [
      { value: "explore", label: "문항이 몇 요인으로 묶이는지 탐색", hint: "요인 구조를 모를 때" },
      { value: "confirm", label: "가설화한 요인 구조를 검증", hint: "측정모형 확인" },
      { value: "latent_causal", label: "잠재변인 간 인과 구조까지 검증", hint: "측정+구조 동시" },
      { value: "content_validity", label: "문항 내용타당도 점검", hint: "전문가 평정 기반" },
    ],
  },
];

/** 다음에 물어볼(아직 답하지 않은) 질문. 없으면 null = 완료. */
export function nextQuestion(a: FinderAnswers): FinderQuestion | null {
  for (const q of FINDER_QUESTIONS) {
    if (q.when && !q.when(a)) continue;
    if (a[q.id] == null) return q;
  }
  return null;
}

/** 현재까지의 답안 흐름에서 노출되는 질문들(진행 표시용). */
export function activeQuestions(a: FinderAnswers): FinderQuestion[] {
  return FINDER_QUESTIONS.filter((q) => !q.when || q.when(a));
}

const SK = (slug: string) => `statistical-method:${slug}`;
const alt = (slug: string, reason: string): FinderAlternative => ({ seedKey: SK(slug), reason });

/** 답안 → 추천. 완료되지 않은 답안이면 null. */
export function recommend(a: FinderAnswers): FinderResult | null {
  if (nextQuestion(a) != null) return null;

  if (a.goal === "categorical") {
    return {
      primary: SK("chi-square"),
      alternatives: [alt("logistic-regression", "예측·통제변수를 넣어 결과(예/아니오)를 모형화하고 싶을 때")],
      rationale:
        "범주(빈도) 간 연관을 보는 질문이므로 카이제곱 검정이 적합합니다. 기대빈도가 작으면 Fisher 정확검정을 검토하세요.",
    };
  }

  if (a.goal === "difference") {
    const multiDv = a.dvCount === "two_or_more";
    const cov = a.covariate === "yes";
    if (cov) {
      return multiDv
        ? {
            primary: SK("mancova"),
            alternatives: [
              alt("ancova", "결과를 하나(총점)로 묶으면 더 단순·견고"),
              alt("manova", "공변량 통제가 필요 없을 때"),
            ],
            rationale:
              "여러 결과변수를 공변량으로 보정해 집단 차이를 보므로 MANCOVA가 적합합니다. 결과를 하나(총점)로 묶으면 ANCOVA가 더 단순·견고할 수 있습니다.",
          }
        : {
            primary: SK("ancova"),
            alternatives: [
              alt("anova-oneway", "공변량 없이 단순 집단 비교만 하면"),
              alt("t-test", "집단이 2개뿐이고 공변량이 없으면"),
            ],
            rationale:
              "공변량(예: 사전점수)을 보정한 뒤 집단 차이를 보므로 ANCOVA가 적합합니다. 회귀선 동질성 가정을 먼저 확인하세요.",
          };
    }
    if (multiDv) {
      return {
        primary: SK("manova"),
        alternatives: [
          alt("anova-oneway", "결과를 하나씩 따로 볼 때(+다중비교 보정)"),
          alt("mancova", "공변량을 함께 통제하려면"),
        ],
        rationale:
          "여러 결과변수의 집단 차이를 동시에 보므로 MANOVA가 적합합니다. 개별 결과만 보려면 결과별 ANOVA + 다중비교 보정도 가능합니다.",
      };
    }
    if (a.groups === "one_repeated_multi") {
      return a.normality === "violated"
        ? {
            primary: SK("friedman"),
            alternatives: [
              alt("rm-anova", "표본이 충분하고 정규성·구형성이 확보되면"),
              alt("wilcoxon-signed-rank", "2시점만 비교하면"),
            ],
            rationale:
              "같은 대상의 3회 이상 반복측정을 소표본·비정규 상황에서 비교하므로 Friedman 검정이 적합합니다. 유의하면 Wilcoxon 쌍별 사후검정(Bonferroni)으로 확인하세요.",
          }
        : {
            primary: SK("rm-anova"),
            alternatives: [
              alt("friedman", "소표본·비정규면 비모수 대안"),
              alt("hlm", "결측 시점이 많거나 성장 궤적을 모형화하려면"),
            ],
            rationale:
              "같은 대상의 3회 이상 반복측정 평균 변화를 보므로 반복측정 분산분석(RM-ANOVA)이 적합합니다. 구형성 위반 시 Greenhouse-Geisser 보정을 쓰세요.",
          };
    }
    if (a.groups === "three_or_more") {
      if (a.normality === "violated") {
        return {
          primary: SK("kruskal-wallis"),
          alternatives: [
            alt("anova-oneway", "표본이 충분하고 정규성이 확보되면"),
            alt("mann-whitney", "집단이 2개뿐이면"),
          ],
          rationale:
            "3집단 이상을 소표본·비정규 상황에서 비교하므로 Kruskal-Wallis H 검정이 적합합니다. 유의하면 Dunn 사후검정(Bonferroni)으로 어느 집단 간 차이인지 확인하세요.",
        };
      }
      return {
        primary: SK("anova-oneway"),
        alternatives: [
          alt("ancova", "사전점수 등 공변량을 통제하려면"),
          alt("manova", "결과변수가 여러 개면"),
        ],
        rationale:
          "3집단 이상의 한 결과변수 평균을 비교하므로 일원분산분석(ANOVA)이 적합합니다. 유의하면 사후검정으로 어느 집단인지 확인하세요.",
      };
    }
    // two or one_repeated
    if (a.normality === "violated") {
      return a.groups === "one_repeated"
        ? {
            primary: SK("wilcoxon-signed-rank"),
            alternatives: [alt("t-test", "차이 점수가 정규분포이면 대응표본 t-검정")],
            rationale:
              "같은 대상의 전·후 비교를 소표본·비정규 상황에서 하므로 Wilcoxon 부호순위 검정이 적합합니다.",
          }
        : {
            primary: SK("mann-whitney"),
            alternatives: [alt("t-test", "표본이 충분하고 정규성이 확보되면")],
            rationale:
              "서로 다른 2집단을 소표본·비정규 상황에서 비교하므로 Mann-Whitney U 검정이 적합합니다. 중앙값과 효과크기 r 을 함께 보고하세요.",
          };
    }
    return {
      primary: SK("t-test"),
      alternatives: [
        alt("anova-oneway", "집단이 3개 이상으로 늘면"),
        alt("ancova", "사전점수 등 공변량을 통제하려면"),
      ],
      rationale:
        a.groups === "one_repeated"
          ? "같은 대상의 전·후 한 결과를 비교하므로 대응표본 t-검정이 적합합니다."
          : "서로 다른 2집단의 한 결과를 비교하므로 독립표본 t-검정이 적합합니다. 등분산이 의심되면 Welch 보정을 쓰세요.",
    };
  }

  if (a.goal === "relationship") {
    if (a.dvType === "binary") {
      return {
        primary: SK("logistic-regression"),
        alternatives: [
          alt("multiple-regression", "결과가 연속형(점수)이면"),
          alt("chi-square", "예측변수 없이 범주 간 연관만 보면"),
        ],
        rationale: "결과가 이분형(예/아니오)이므로 로지스틱 회귀가 적합합니다.",
      };
    }
    if (a.dvType === "latent") {
      return {
        primary: SK("sem"),
        alternatives: [
          alt("multiple-regression", "관측변수만의 단순 예측이면"),
          alt("cfa", "측정모형(요인구조)만 검증하려면"),
        ],
        rationale:
          "잠재변인을 포함한 복합 인과(매개·다중경로)를 동시에 검증하므로 구조방정식모형(SEM)이 적합합니다.",
      };
    }
    // continuous
    if (a.predictors === "multiple") {
      return {
        primary: SK("multiple-regression"),
        alternatives: [
          alt("correlation", "두 변수의 관계 강도만 보면"),
          alt("sem", "잠재변인·매개를 포함하면"),
        ],
        rationale:
          "여러 예측변수로 연속형 결과를 예측·설명하므로 다중회귀가 적합합니다. 다중공선성을 점검하세요.",
      };
    }
    return {
      primary: SK("correlation"),
      alternatives: [alt("multiple-regression", "예측·통제변수를 추가해 설명하려면")],
      rationale:
        "두 변수의 관계 강도·방향을 보므로 상관분석이 적합합니다. 정규성이 어려우면 Spearman 순위상관을 쓰세요.",
    };
  }

  // structure
  switch (a.structureGoal) {
    case "explore":
      return {
        primary: SK("efa"),
        alternatives: [
          alt("cfa", "요인 구조 가설을 검증하려면"),
          alt("cronbach-alpha", "확인된 요인별 문항 신뢰도 보고에는"),
        ],
        rationale: "요인 구조를 모르는 상태에서 탐색하므로 탐색적 요인분석(EFA)이 적합합니다.",
      };
    case "confirm":
      return {
        primary: SK("cfa"),
        alternatives: [
          alt("efa", "구조를 모를 때 탐색부터"),
          alt("sem", "잠재변인 간 인과까지 보려면"),
          alt("cronbach-alpha", "요인별 문항 신뢰도 보고에는"),
        ],
        rationale: "가설화한 요인 구조를 검증하므로 확인적 요인분석(CFA)이 적합합니다.",
      };
    case "latent_causal":
      return {
        primary: SK("sem"),
        alternatives: [
          alt("cfa", "측정모형만 검증하려면"),
          alt("multiple-regression", "관측변수만의 단순 예측이면"),
        ],
        rationale: "측정모형과 잠재변인 간 인과를 동시에 검증하므로 구조방정식모형(SEM)이 적합합니다.",
      };
    case "content_validity":
      return {
        primary: SK("cvi"),
        alternatives: [alt("cfa", "수집한 자료로 구성타당도를 검증하려면")],
        rationale: "문항의 내용타당도를 전문가 평정으로 점검하므로 내용타당도지수(CVI)가 적합합니다.",
      };
    default:
      return null;
  }
}
