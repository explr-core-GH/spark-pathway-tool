// EXPLR STEM survey scoring.
//
// The S-STEM is validated at the CONSTRUCT (scale) level — never report
// item-level pre/post change as a top-line finding. These helpers compute
// construct means (with reverse-coding) and paired pre→post statistics.
//
// All math here is unit-tested in scoring.test.ts.

import type { SurveyItem } from "./index";

/**
 * Reverse-code a raw response. On a 5-point scale: 1↔5, 2↔4, 3↔3.
 * General form: reversed = (scaleMax + scaleMin) - raw. The four
 * negatively-worded S-STEM items (math_1/3/5, science_8) are all on the
 * 5-point agreement scale, so reversed = 6 - raw.
 */
export function reverseCode(raw: number, scaleMin = 1, scaleMax = 5): number {
  return scaleMax + scaleMin - raw;
}

export type ItemResponseValue = {
  /** raw value the student gave (1-5 or 1-4); null if skipped/unanswered */
  value: number | null;
  skipped: boolean;
};

/**
 * Mean score for one construct.
 *
 * - Reverse-codes flagged items inline (raw values are stored elsewhere).
 * - Excludes skipped / unanswered items from BOTH numerator and denominator
 *   — a skip is missing data, not a zero.
 * - Returns null when fewer than 50% of the construct's items were answered
 *   (too little data to form a reliable construct mean).
 */
export function scoreConstruct(
  items: SurveyItem[],
  responses: Record<string, ItemResponseValue>,
  scaleMin = 1,
  scaleMax = 5,
): number | null {
  const answered: number[] = [];
  for (const item of items) {
    const r = responses[item.id];
    if (!r || r.skipped || r.value == null) continue;
    answered.push(
      item.reverse_coded
        ? reverseCode(r.value, scaleMin, scaleMax)
        : r.value,
    );
  }
  if (items.length === 0) return null;
  if (answered.length / items.length < 0.5) return null;
  return answered.reduce((a, b) => a + b, 0) / answered.length;
}

export type PairedChange = {
  n: number;
  meanPre: number;
  meanPost: number;
  meanChange: number;
  sdChange: number;
  t: number;
  /** two-tailed p-value for the paired-samples t-test */
  p: number;
  cohensD: number;
};

/**
 * Paired-samples comparison for one construct across matched pre/post
 * scores. `pre[i]` and `post[i]` must be the same student.
 *
 * Cohen's d here is the paired form: meanChange / sdChange. Interpretation:
 * 0.2 small · 0.5 medium · 0.8 large.
 */
export function pairedChange(pre: number[], post: number[]): PairedChange | null {
  const n = Math.min(pre.length, post.length);
  if (n < 2) return null;

  const diffs: number[] = [];
  let sumPre = 0;
  let sumPost = 0;
  for (let i = 0; i < n; i++) {
    diffs.push(post[i] - pre[i]);
    sumPre += pre[i];
    sumPost += post[i];
  }
  const meanChange = diffs.reduce((a, b) => a + b, 0) / n;
  const variance =
    diffs.reduce((a, d) => a + (d - meanChange) ** 2, 0) / (n - 1);
  const sdChange = Math.sqrt(variance);

  const se = sdChange / Math.sqrt(n);
  const t = se > 0 ? meanChange / se : 0;
  const df = n - 1;
  const p = sdChange > 0 ? twoTailedTP(t, df) : 1;
  const cohensD = sdChange > 0 ? meanChange / sdChange : 0;

  return {
    n,
    meanPre: sumPre / n,
    meanPost: sumPost / n,
    meanChange,
    sdChange,
    t,
    p,
    cohensD,
  };
}

/** Cohen's d magnitude label. */
export function cohenLabel(d: number): "negligible" | "small" | "medium" | "large" {
  const a = Math.abs(d);
  if (a < 0.2) return "negligible";
  if (a < 0.5) return "small";
  if (a < 0.8) return "medium";
  return "large";
}

// ---- t-distribution p-value ----------------------------------------------
// Two-tailed p-value for a t statistic with df degrees of freedom, via the
// regularized incomplete beta function (Numerical Recipes, betai/betacf).

function twoTailedTP(t: number, df: number): number {
  if (df <= 0) return 1;
  const x = df / (df + t * t);
  // The two-tailed t p-value equals I_x(df/2, 1/2).
  return regIncompleteBeta(x, df / 2, 0.5);
}

/** Regularized incomplete beta function I_x(a, b). */
function regIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Continued fraction for the incomplete beta function. */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 1e-12;
  const FPMIN = 1e-30;
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
    aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
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

/** Lanczos approximation of ln Γ(z). */
function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    // reflection formula
    return (
      Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
    );
  }
  z -= 1;
  let a = c[0];
  const tt = z + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (z + i);
  return (
    0.5 * Math.log(2 * Math.PI) +
    (z + 0.5) * Math.log(tt) -
    tt +
    Math.log(a)
  );
}
