// 교육공학 통계방법 가이드 — 기본 시드 (published: false 로 적재)
//
// 운영자가 검수 후 published=true 로 토글하여 공개. 학술적 책임 회피를 위해
// summary 만 객관적인 짧은 정의로 채우고, 가정·절차·구문 등 상세는 운영자
// 재량으로 채우도록 비워둠.

import { statisticalMethodsApi } from "./bkend";
import type {
  StatisticalMethod,
  StatisticalMethodCategory,
} from "@/types/statistical-method";

interface SeedEntry {
  name: string;
  category: StatisticalMethodCategory;
  summary: string;
}

const SEED_STATISTICAL_METHODS: SeedEntry[] = [
  // ANOVA 계열 (4)
  {
    name: "ANOVA (일원분산분석)",
    category: "anova_family",
    summary:
      "한 개의 범주형 독립변수에 따른 연속형 종속변수 평균이 집단 간에 통계적으로 차이가 있는지 검정하는 분산분석 기법.",
  },
  {
    name: "ANCOVA (공분산분석)",
    category: "anova_family",
    summary:
      "공변량을 통제한 후 범주형 독립변수에 따른 연속형 종속변수의 집단 간 평균 차이를 검정하는 분산분석 확장 기법.",
  },
  {
    name: "MANOVA (다변량분산분석)",
    category: "anova_family",
    summary:
      "두 개 이상의 연속형 종속변수에 대한 범주형 독립변수의 집단 간 평균 차이를 동시에 검정하는 다변량 분산분석 기법.",
  },
  {
    name: "MANCOVA (다변량공분산분석)",
    category: "anova_family",
    summary:
      "공변량을 통제한 상태에서 두 개 이상의 연속형 종속변수에 대한 집단 간 평균 차이를 검정하는 MANOVA 확장 기법.",
  },
  // 기본 차이검정 (1)
  {
    name: "t-test (독립/대응표본)",
    category: "anova_family",
    summary:
      "두 집단의 평균 차이(독립표본) 또는 동일 표본의 두 시점 평균 차이(대응표본)를 검정하는 모수 통계 기법.",
  },
  // 회귀분석 (2)
  {
    name: "다중회귀분석",
    category: "regression",
    summary:
      "두 개 이상의 독립변수가 한 개의 연속형 종속변수를 어떻게 예측·설명하는지 회귀계수와 결정계수로 추정하는 기법.",
  },
  {
    name: "로지스틱회귀분석",
    category: "regression",
    summary:
      "이분형(또는 다항) 종속변수의 발생 확률을 독립변수들로 예측하는 일반화선형모형 기반의 회귀 기법.",
  },
  // 요인분석 (2)
  {
    name: "탐색적 요인분석(EFA)",
    category: "factor",
    summary:
      "관측변수들 사이의 상관 구조에서 잠재요인을 자료 기반으로 탐색하여 도구의 차원성을 확인하는 분석 기법.",
  },
  {
    name: "확인적 요인분석(CFA)",
    category: "factor",
    summary:
      "사전에 가정된 요인 구조가 관측 자료에 적합한지 모형 적합도 지수로 검증하는 측정모형 분석 기법.",
  },
  // SEM (1)
  {
    name: "구조방정식모형(SEM)",
    category: "sem",
    summary:
      "잠재변인을 포함한 다중 인과 관계와 측정모형을 동시에 추정·평가하는 다변량 통계 분석 기법.",
  },
];

export interface StatisticalMethodSeedResult {
  created: number;
  skipped: number;
}

/** 동일 이름의 항목은 스킵하고 나머지를 draft 로 일괄 생성. */
export async function seedStatisticalMethods(
  userId: string,
  existing: StatisticalMethod[],
): Promise<StatisticalMethodSeedResult> {
  const existingNames = new Set(existing.map((m) => m.name.trim()));
  let created = 0;
  let skipped = 0;
  for (const entry of SEED_STATISTICAL_METHODS) {
    if (existingNames.has(entry.name)) {
      skipped += 1;
      continue;
    }
    await statisticalMethodsApi.create({
      name: entry.name,
      category: entry.category,
      summary: entry.summary,
      published: false,
      createdBy: userId,
    });
    created += 1;
  }
  return { created, skipped };
}
