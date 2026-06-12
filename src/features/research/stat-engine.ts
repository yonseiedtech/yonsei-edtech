/**
 * 통계 분석 엔진 (2026-06-12, 사이클 33~34)
 *
 * 브라우저 안에서만 동작하는 순수 함수 — 데이터는 서버로 전송되지 않는다.
 * 결과는 SPSS 관행(표본 SD, SPSS식 왜도·첨도, 평균 중심 Levene)을 따른다.
 * 정확성은 손계산 케이스·통계표 임계값·수학 항등식(t²=F 등) 테스트로 검증.
 *
 * ⚠ 본 엔진은 작성 보조용 빠른 분석이다 — 학위논문 제출 전 최종 수치는
 *   SPSS·R 등 검증된 도구로 재확인할 것을 안내한다.
 */

import { tTwoSidedP, fUpperP, chi2UpperP } from "./stat-distributions";

// ── 기술통계 ──

export interface DescriptiveStats {
  n: number;
  mean: number;
  /** 표본 표준편차 (n-1) */
  sd: number;
  /** SPSS식 왜도 G1 */
  skewness: number;
  /** SPSS식 첨도 G2 (excess) */
  kurtosis: number;
  min: number;
  max: number;
}

export function descriptives(values: number[]): DescriptiveStats {
  const n = values.length;
  if (n === 0) return { n: 0, mean: NaN, sd: NaN, skewness: NaN, kurtosis: NaN, min: NaN, max: NaN };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const v of values) {
    const d = v - mean;
    m2 += d * d;
    m3 += d * d * d;
    m4 += d * d * d * d;
  }
  const variance = n > 1 ? m2 / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  // SPSS G1 / G2 (n 이 작으면 NaN 허용)
  let skewness = NaN;
  let kurtosis = NaN;
  if (n > 2 && sd > 0) {
    const s3 = Math.pow(m2 / (n - 1), 1.5);
    skewness = ((n * m3) / ((n - 1) * (n - 2))) / s3;
  }
  if (n > 3 && sd > 0) {
    const s4 = Math.pow(m2 / (n - 1), 2);
    kurtosis =
      ((n * (n + 1) * m4) / ((n - 1) * (n - 2) * (n - 3))) / s4 -
      (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  }
  return { n, mean, sd, skewness, kurtosis, min: Math.min(...values), max: Math.max(...values) };
}

// ── Levene 등분산성 (평균 중심 — SPSS 기본) ──

export interface LeveneResult {
  F: number;
  df1: number;
  df2: number;
  p: number;
}

export function levene(groups: number[][]): LeveneResult {
  const z = groups.map((g) => {
    const m = g.reduce((a, b) => a + b, 0) / g.length;
    return g.map((v) => Math.abs(v - m));
  });
  const a = onewayAnovaCore(z);
  return { F: a.F, df1: a.dfb, df2: a.dfw, p: a.p };
}

// ── t검정 ──

export interface TTestResult {
  t: number;
  df: number;
  p: number;
}

export interface IndependentTResult {
  group1: DescriptiveStats;
  group2: DescriptiveStats;
  levene: LeveneResult;
  student: TTestResult;
  welch: TTestResult;
  /** Cohen's d (pooled SD) */
  cohenD: number;
}

export function independentT(g1: number[], g2: number[]): IndependentTResult {
  const d1 = descriptives(g1);
  const d2 = descriptives(g2);
  const n1 = d1.n;
  const n2 = d2.n;
  const v1 = d1.sd * d1.sd;
  const v2 = d2.sd * d2.sd;

  const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
  const seP = Math.sqrt(pooledVar * (1 / n1 + 1 / n2));
  const tS = (d1.mean - d2.mean) / seP;
  const dfS = n1 + n2 - 2;

  const seW = Math.sqrt(v1 / n1 + v2 / n2);
  const tW = (d1.mean - d2.mean) / seW;
  const dfW =
    Math.pow(v1 / n1 + v2 / n2, 2) /
    (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));

  return {
    group1: d1,
    group2: d2,
    levene: levene([g1, g2]),
    student: { t: tS, df: dfS, p: tTwoSidedP(tS, dfS) },
    welch: { t: tW, df: dfW, p: tTwoSidedP(tW, dfW) },
    cohenD: (d1.mean - d2.mean) / Math.sqrt(pooledVar),
  };
}

export interface PairedTResult {
  diff: DescriptiveStats;
  t: number;
  df: number;
  p: number;
  /** Cohen's d (차이값 기준 d_z) */
  cohenD: number;
}

export function pairedT(pre: number[], post: number[]): PairedTResult {
  const n = Math.min(pre.length, post.length);
  const diffs = Array.from({ length: n }, (_, i) => post[i] - pre[i]);
  const d = descriptives(diffs);
  const t = d.mean / (d.sd / Math.sqrt(n));
  const df = n - 1;
  return { diff: d, t, df, p: tTwoSidedP(t, df), cohenD: d.mean / d.sd };
}

// ── 일원 ANOVA ──

export interface AnovaResult {
  groups: DescriptiveStats[];
  ssb: number;
  ssw: number;
  dfb: number;
  dfw: number;
  msb: number;
  msw: number;
  F: number;
  p: number;
  eta2: number;
}

function onewayAnovaCore(groups: number[][]) {
  const all = groups.flat();
  const grand = all.reduce((a, b) => a + b, 0) / all.length;
  let ssb = 0;
  let ssw = 0;
  for (const g of groups) {
    const m = g.reduce((a, b) => a + b, 0) / g.length;
    ssb += g.length * (m - grand) * (m - grand);
    for (const v of g) ssw += (v - m) * (v - m);
  }
  const dfb = groups.length - 1;
  const dfw = all.length - groups.length;
  const msb = ssb / dfb;
  const msw = ssw / dfw;
  const F = msb / msw;
  return { ssb, ssw, dfb, dfw, msb, msw, F, p: fUpperP(F, dfb, dfw) };
}

export function onewayAnova(groups: number[][]): AnovaResult {
  const core = onewayAnovaCore(groups);
  return {
    groups: groups.map(descriptives),
    ...core,
    eta2: core.ssb / (core.ssb + core.ssw),
  };
}

// ── 상관 ──

export interface PearsonResult {
  r: number;
  n: number;
  t: number;
  df: number;
  p: number;
}

export function pearson(xs: number[], ys: number[]): PearsonResult {
  const n = Math.min(xs.length, ys.length);
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const r = sxy / Math.sqrt(sxx * syy);
  const df = n - 2;
  const rClamped = Math.max(-0.9999999999, Math.min(0.9999999999, r));
  const t = rClamped * Math.sqrt(df / (1 - rClamped * rClamped));
  return { r, n, t, df, p: tTwoSidedP(t, df) };
}

// ── 카이제곱 독립성 검정 ──

export interface ChiSquareResult {
  chi2: number;
  df: number;
  p: number;
  expected: number[][];
  /** 기대빈도 5 미만 셀 비율 (0~1) — 0.2 초과 시 가정 위반 경고 */
  lowExpectedRatio: number;
  n: number;
}

export function chiSquare(observed: number[][]): ChiSquareResult {
  const rows = observed.length;
  const cols = observed[0]?.length ?? 0;
  const rowSum = observed.map((r) => r.reduce((a, b) => a + b, 0));
  const colSum = Array.from({ length: cols }, (_, j) => observed.reduce((a, r) => a + r[j], 0));
  const n = rowSum.reduce((a, b) => a + b, 0);
  const expected = observed.map((r, i) => r.map((_, j) => (rowSum[i] * colSum[j]) / n));
  let chi2 = 0;
  let low = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const e = expected[i][j];
      chi2 += ((observed[i][j] - e) * (observed[i][j] - e)) / e;
      if (e < 5) low += 1;
    }
  }
  const df = (rows - 1) * (cols - 1);
  return { chi2, df, p: chi2UpperP(chi2, df), expected, lowExpectedRatio: low / (rows * cols), n };
}

// ── Cronbach's α ──

export interface CronbachResult {
  alpha: number;
  k: number;
  n: number;
}

/** items[i] = i번째 문항의 응답 배열 (응답자 순서 동일) */
export function cronbachAlpha(items: number[][]): CronbachResult {
  const k = items.length;
  const n = items[0]?.length ?? 0;
  const variance = (vals: number[]) => {
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    return vals.reduce((a, v) => a + (v - m) * (v - m), 0) / (vals.length - 1);
  };
  const itemVarSum = items.reduce((a, it) => a + variance(it), 0);
  const totals = Array.from({ length: n }, (_, r) => items.reduce((a, it) => a + it[r], 0));
  const totalVar = variance(totals);
  return { alpha: (k / (k - 1)) * (1 - itemVarSum / totalVar), k, n };
}

// ── OLS (가우스-조던) — ANCOVA 용 ──

function solveLinear(A: number[][], b: number[]): number[] | null {
  const m = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < m; col++) {
    let pivot = col;
    for (let r = col + 1; r < m; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[pivot][col])) pivot = r;
    }
    if (Math.abs(aug[pivot][col]) < 1e-12) return null; // 특이 행렬
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    for (let r = 0; r < m; r++) {
      if (r === col) continue;
      const f = aug[r][col] / aug[col][col];
      for (let c = col; c <= m; c++) aug[r][c] -= f * aug[col][c];
    }
  }
  return aug.map((row, i) => row[m] / aug[i][i]);
}

/** OLS 적합 — 잔차제곱합과 계수 반환 (X 는 절편 열 포함) */
function olsSSE(X: number[][], y: number[]): { sse: number; beta: number[] } | null {
  const p = X[0].length;
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    for (let a = 0; a < p; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = a; b < p; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  for (let a = 0; a < p; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
  const beta = solveLinear(XtX, Xty);
  if (!beta) return null;
  let sse = 0;
  for (let i = 0; i < X.length; i++) {
    let pred = 0;
    for (let a = 0; a < p; a++) pred += X[i][a] * beta[a];
    sse += (y[i] - pred) * (y[i] - pred);
  }
  return { sse, beta };
}

// ── ANCOVA (일원, 공변량 1개) ──

export interface AncovaGroupInput {
  label: string;
  /** 종속변수 (사후점수 등) */
  y: number[];
  /** 공변량 (사전점수 등) — y 와 길이 동일 */
  cov: number[];
}

export interface AncovaResult {
  /** 회귀계수 동질성 검정 — p > .05 여야 ANCOVA 가정 충족 */
  homogeneity: { F: number; df1: number; df2: number; p: number };
  covariate: { ss: number; df: number; ms: number; F: number; p: number };
  group: { ss: number; df: number; ms: number; F: number; p: number; partialEta2: number };
  error: { ss: number; df: number; ms: number };
  /** 공통 기울기 (공변량 회귀계수) */
  commonSlope: number;
  groups: { label: string; n: number; meanY: number; sdY: number; meanCov: number; adjustedMean: number }[];
}

export function ancova(inputs: AncovaGroupInput[]): AncovaResult | null {
  const k = inputs.length;
  if (k < 2) return null;
  const N = inputs.reduce((a, g) => a + g.y.length, 0);

  // 디자인 행렬 구성 — 절편 + (k-1) 더미 + 공변량 [+ 상호작용]
  const rows: { y: number; dummies: number[]; cov: number }[] = [];
  inputs.forEach((g, gi) => {
    g.y.forEach((yv, i) => {
      const dummies = new Array(k - 1).fill(0);
      if (gi > 0) dummies[gi - 1] = 1;
      rows.push({ y: yv, dummies, cov: g.cov[i] });
    });
  });
  const y = rows.map((r) => r.y);

  const Xfull = rows.map((r) => [1, ...r.dummies, r.cov]);
  const XcovOnly = rows.map((r) => [1, r.cov]);
  const XgroupOnly = rows.map((r) => [1, ...r.dummies]);
  const Xinter = rows.map((r) => [1, ...r.dummies, r.cov, ...r.dummies.map((d) => d * r.cov)]);

  const full = olsSSE(Xfull, y);
  const covOnly = olsSSE(XcovOnly, y);
  const groupOnly = olsSSE(XgroupOnly, y);
  const inter = olsSSE(Xinter, y);
  if (!full || !covOnly || !groupOnly || !inter) return null;

  const dfErr = N - k - 1;
  const mse = full.sse / dfErr;

  // 회귀계수 동질성: full vs 상호작용 모형
  const dfInter = k - 1;
  const dfErrInter = N - 2 * k;
  const Fh = (full.sse - inter.sse) / dfInter / (inter.sse / dfErrInter);

  // 집단 효과 (공변량 통제 후): covOnly vs full
  const ssGroup = covOnly.sse - full.sse;
  const Fg = ssGroup / (k - 1) / mse;

  // 공변량 효과 (집단 통제 후): groupOnly vs full
  const ssCov = groupOnly.sse - full.sse;
  const Fc = ssCov / 1 / mse;

  const commonSlope = full.beta[k]; // [절편, 더미 k-1, cov]
  const grandCov = rows.reduce((a, r) => a + r.cov, 0) / N;

  return {
    homogeneity: { F: Fh, df1: dfInter, df2: dfErrInter, p: fUpperP(Fh, dfInter, dfErrInter) },
    covariate: { ss: ssCov, df: 1, ms: ssCov, F: Fc, p: fUpperP(Fc, 1, dfErr) },
    group: {
      ss: ssGroup,
      df: k - 1,
      ms: ssGroup / (k - 1),
      F: Fg,
      p: fUpperP(Fg, k - 1, dfErr),
      partialEta2: ssGroup / (ssGroup + full.sse),
    },
    error: { ss: full.sse, df: dfErr, ms: mse },
    commonSlope,
    groups: inputs.map((g) => {
      const d = descriptives(g.y);
      const meanCov = g.cov.reduce((a, b) => a + b, 0) / g.cov.length;
      return {
        label: g.label,
        n: d.n,
        meanY: d.mean,
        sdY: d.sd,
        meanCov,
        adjustedMean: d.mean - commonSlope * (meanCov - grandCov),
      };
    }),
  };
}
