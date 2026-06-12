import { describe, it, expect } from "vitest";
import { tTwoSidedP, fUpperP, chi2UpperP, incompleteBeta } from "../stat-distributions";
import {
  descriptives,
  independentT,
  pairedT,
  onewayAnova,
  pearson,
  chiSquare,
  cronbachAlpha,
  levene,
  ancova,
} from "../stat-engine";

describe("stat-distributions — 통계표 임계값·항등식", () => {
  it("t 분포: 통계표 5% 임계값에서 p ≈ .05", () => {
    expect(tTwoSidedP(2.228, 10)).toBeCloseTo(0.05, 3);
    expect(tTwoSidedP(12.706, 1)).toBeCloseTo(0.05, 3);
    expect(tTwoSidedP(1.96, 1_000_000)).toBeCloseTo(0.05, 3);
  });

  it("t = 0 → p = 1, 대칭성 p(t) = p(-t)", () => {
    expect(tTwoSidedP(0, 10)).toBeCloseTo(1, 9);
    expect(tTwoSidedP(1.5, 7)).toBeCloseTo(tTwoSidedP(-1.5, 7), 12);
  });

  it("χ² 분포: 통계표 5% 임계값에서 p ≈ .05", () => {
    expect(chi2UpperP(3.841, 1)).toBeCloseTo(0.05, 3);
    expect(chi2UpperP(5.991, 2)).toBeCloseTo(0.05, 3);
  });

  it("항등식: F(1, df) 상측 p = t(df) 양측 p (F = t²)", () => {
    for (const [t, df] of [
      [2.0, 8],
      [1.5, 20],
      [3.2, 5],
    ] as const) {
      expect(fUpperP(t * t, 1, df)).toBeCloseTo(tTwoSidedP(t, df), 9);
    }
  });

  it("불완전 베타 대칭: I_x(a,b) = 1 - I_(1-x)(b,a)", () => {
    expect(incompleteBeta(2.5, 3.5, 0.3)).toBeCloseTo(1 - incompleteBeta(3.5, 2.5, 0.7), 10);
  });
});

describe("descriptives", () => {
  it("[1..5] — 평균 3, 표본 SD √2.5", () => {
    const d = descriptives([1, 2, 3, 4, 5]);
    expect(d.n).toBe(5);
    expect(d.mean).toBeCloseTo(3, 10);
    expect(d.sd).toBeCloseTo(Math.sqrt(2.5), 10);
    expect(d.skewness).toBeCloseTo(0, 9); // 대칭 분포
  });
});

describe("independentT — 손계산 검증", () => {
  it("g1=[1..5], g2=[3..7]: t = -2, df = 8", () => {
    const r = independentT([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]);
    expect(r.student.t).toBeCloseTo(-2, 9);
    expect(r.student.df).toBe(8);
    expect(r.student.p).toBeGreaterThan(0.05); // t표: t(8,5%)=2.306 > 2
    expect(r.student.p).toBeLessThan(0.12);
    expect(r.cohenD).toBeCloseTo(-2 / Math.sqrt(2.5) * Math.sqrt(2.5) / Math.sqrt(2.5), 1);
    // 등분산 동일 분포 — Welch ≈ Student
    expect(r.welch.t).toBeCloseTo(r.student.t, 9);
  });

  it("ANOVA 2집단 F = t² 항등", () => {
    const g1 = [1, 2, 3, 4, 5];
    const g2 = [3, 4, 5, 6, 7];
    const t = independentT(g1, g2).student;
    const a = onewayAnova([g1, g2]);
    expect(a.F).toBeCloseTo(t.t * t.t, 8);
    expect(a.p).toBeCloseTo(t.p, 8);
  });
});

describe("pairedT", () => {
  it("diffs=[1,2,0]: t = √3, df = 2", () => {
    const r = pairedT([1, 2, 3], [2, 4, 3]);
    expect(r.diff.mean).toBeCloseTo(1, 10);
    expect(r.t).toBeCloseTo(Math.sqrt(3), 9);
    expect(r.df).toBe(2);
  });
});

describe("pearson — 손계산 검증", () => {
  it("완전 상관 r = ±1", () => {
    expect(pearson([1, 2, 3], [10, 20, 30]).r).toBeCloseTo(1, 10);
    expect(pearson([1, 2, 3], [3, 2, 1]).r).toBeCloseTo(-1, 10);
  });

  it("x=[1,2,3,4], y=[2,1,4,3] → r = 0.6", () => {
    const r = pearson([1, 2, 3, 4], [2, 1, 4, 3]);
    expect(r.r).toBeCloseTo(0.6, 10);
    expect(r.df).toBe(2);
  });
});

describe("chiSquare — 손계산 검증", () => {
  it("[[10,20],[20,10]]: 기대빈도 전부 15, χ² = 6.667, df = 1", () => {
    const r = chiSquare([
      [10, 20],
      [20, 10],
    ]);
    expect(r.expected[0][0]).toBeCloseTo(15, 10);
    expect(r.chi2).toBeCloseTo(20 / 3, 8);
    expect(r.df).toBe(1);
    expect(r.p).toBeLessThan(0.05);
    expect(r.lowExpectedRatio).toBe(0);
  });
});

describe("cronbachAlpha", () => {
  it("모든 문항이 동일하면 α = 1", () => {
    const item = [1, 2, 3, 4, 5];
    const r = cronbachAlpha([item, [...item], [...item]]);
    expect(r.alpha).toBeCloseTo(1, 10);
    expect(r.k).toBe(3);
  });
});

describe("levene", () => {
  it("동일 분포 두 집단 — F ≈ 0", () => {
    const r = levene([
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
    ]);
    expect(r.F).toBeCloseTo(0, 9);
    expect(r.p).toBeCloseTo(1, 6);
  });
});

describe("ancova — 속성·시나리오 검증", () => {
  it("기울기 동질·절편 차 5: commonSlope ≈ 2, 동질성 충족, 조정평균 차 ≈ 5", () => {
    const r = ancova([
      { label: "통제", y: [2.1, 3.9, 6.0, 8.0], cov: [1, 2, 3, 4] }, // ≈ 2x
      { label: "실험", y: [7.0, 9.1, 10.9, 13.0], cov: [1, 2, 3, 4] }, // ≈ 2x + 5
    ]);
    expect(r).not.toBeNull();
    expect(r!.commonSlope).toBeCloseTo(2, 1);
    expect(r!.homogeneity.p).toBeGreaterThan(0.5); // 상호작용 비유의 = 가정 충족
    expect(r!.group.p).toBeLessThan(0.001); // 집단 효과 매우 유의
    const diff = r!.groups[1].adjustedMean - r!.groups[0].adjustedMean;
    expect(diff).toBeCloseTo(5, 1);
  });

  it("공변량 균형이면 조정평균 = 원평균", () => {
    const r = ancova([
      { label: "A", y: [3, 4, 5.2], cov: [1, 2, 3] },
      { label: "B", y: [5, 6.1, 7], cov: [1, 2, 3] },
    ]);
    expect(r).not.toBeNull();
    for (const g of r!.groups) {
      expect(g.adjustedMean).toBeCloseTo(g.meanY, 6);
    }
  });

  it("모형 포함 관계: SS_group, SS_cov ≥ 0", () => {
    const r = ancova([
      { label: "A", y: [2, 5, 3, 8, 6], cov: [1, 4, 2, 7, 5] },
      { label: "B", y: [4, 7, 9, 5, 8], cov: [2, 5, 8, 3, 6] },
    ]);
    expect(r).not.toBeNull();
    expect(r!.group.ss).toBeGreaterThanOrEqual(-1e-9);
    expect(r!.covariate.ss).toBeGreaterThanOrEqual(-1e-9);
    expect(r!.group.partialEta2).toBeGreaterThanOrEqual(0);
    expect(r!.group.partialEta2).toBeLessThanOrEqual(1);
  });
});
