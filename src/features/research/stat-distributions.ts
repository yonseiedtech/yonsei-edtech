/**
 * 통계 분포 함수 — p값 계산 코어 (2026-06-12, 사이클 33)
 *
 * t·F·χ² 분포의 p값은 정규화 불완전 베타/감마 함수 2개로 전부 환원된다.
 * 구현: Lanczos lnGamma + 연속분수(베타) + 급수/연속분수(감마) — 표준 수치 알고리즘.
 * 정확성은 통계표 임계값(t·χ² 5% 등)과 수학 항등식(t²=F(1,df) 등) 테스트로 검증.
 */

const MAXIT = 300;
const EPS = 3e-12;
const FPMIN = 1e-300;

/** ln Γ(x) — Lanczos 근사 (x > 0) */
export function lnGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    // 반사 공식
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  }
  const xm = x - 1;
  let a = c[0];
  const t = xm + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (xm + i);
  return 0.5 * Math.log(2 * Math.PI) + (xm + 0.5) * Math.log(t) - t + Math.log(a);
}

/** 불완전 베타 연속분수 (Numerical Recipes betacf) */
function betacf(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** 정규화 불완전 베타 I_x(a, b) */
export function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** 정규화 하부 불완전 감마 P(a, x) — 급수 전개 */
function gammaPSeries(a: number, x: number): number {
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 1; n <= MAXIT; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

/** 정규화 상부 불완전 감마 Q(a, x) — 연속분수 */
function gammaQCF(a: number, x: number): number {
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= MAXIT; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** 정규화 상부 불완전 감마 Q(a, x) = 1 - P(a, x) */
export function gammaQ(a: number, x: number): number {
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 1;
  if (x < a + 1) return 1 - gammaPSeries(a, x);
  return gammaQCF(a, x);
}

// ── 분포별 p값 ──

/** t 분포 양측 p값 — P(|T| ≥ |t|) */
export function tTwoSidedP(t: number, df: number): number {
  if (!Number.isFinite(t) || df <= 0) return NaN;
  return incompleteBeta(df / 2, 0.5, df / (df + t * t));
}

/** F 분포 상측 p값 — P(F ≥ f) */
export function fUpperP(f: number, df1: number, df2: number): number {
  if (df1 <= 0 || df2 <= 0) return NaN;
  if (f <= 0) return 1;
  return incompleteBeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * f));
}

/** χ² 분포 상측 p값 — P(X ≥ x) */
export function chi2UpperP(x: number, df: number): number {
  if (df <= 0) return NaN;
  if (x <= 0) return 1;
  return gammaQ(df / 2, x / 2);
}
