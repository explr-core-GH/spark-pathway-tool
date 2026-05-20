import { describe, it, expect } from "vitest";
import {
  reverseCode,
  scoreConstruct,
  pairedChange,
  cohenLabel,
  wilcoxonSignedRank,
  type ItemResponseValue,
} from "./scoring";
import type { SurveyItem } from "./index";

const item = (id: string, reverse = false): SurveyItem => ({
  id,
  text: id,
  reverse_coded: reverse,
});
const ans = (value: number | null, skipped = false): ItemResponseValue => ({
  value,
  skipped,
});

describe("reverseCode", () => {
  it("flips a 5-point scale: 1↔5, 2↔4, 3↔3", () => {
    expect(reverseCode(1)).toBe(5);
    expect(reverseCode(2)).toBe(4);
    expect(reverseCode(3)).toBe(3);
    expect(reverseCode(4)).toBe(2);
    expect(reverseCode(5)).toBe(1);
  });
});

describe("scoreConstruct", () => {
  it("averages plain (non-reverse) items", () => {
    const items = [item("a"), item("b"), item("c"), item("d")];
    const responses = {
      a: ans(4),
      b: ans(2),
      c: ans(5),
      d: ans(1),
    };
    // (4 + 2 + 5 + 1) / 4 = 3
    expect(scoreConstruct(items, responses)).toBe(3);
  });

  it("reverse-codes flagged items before averaging", () => {
    // 'b' is reverse-coded: a raw 5 ("Math is my worst subject — Strongly
    // Agree") must score as 1 (low self-efficacy).
    const items = [item("a"), item("b", true)];
    const responses = { a: ans(4), b: ans(5) };
    // a=4, b=reverseCode(5)=1 → mean (4 + 1) / 2 = 2.5
    expect(scoreConstruct(items, responses)).toBe(2.5);
  });

  it("excludes skipped items from the mean (skip ≠ zero)", () => {
    const items = [item("a"), item("b"), item("c"), item("d")];
    const responses = {
      a: ans(4),
      b: ans(2),
      c: ans(null, true), // skipped
      d: ans(null, true), // skipped
    };
    // Only a + b count → (4 + 2) / 2 = 3, NOT (4+2+0+0)/4 = 1.5
    expect(scoreConstruct(items, responses)).toBe(3);
  });

  it("returns null when fewer than 50% of items are answered", () => {
    const items = [item("a"), item("b"), item("c"), item("d")];
    // only 1 of 4 answered = 25%
    expect(scoreConstruct(items, { a: ans(5) })).toBeNull();
  });

  it("returns a mean at exactly 50% answered", () => {
    const items = [item("a"), item("b"), item("c"), item("d")];
    const responses = { a: ans(4), b: ans(2) }; // 2 of 4 = 50%
    expect(scoreConstruct(items, responses)).toBe(3);
  });
});

describe("pairedChange", () => {
  it("computes mean change and Cohen's d on a hand-checked pair", () => {
    // pre/post for 4 students. diffs = [1, 0, 2, 0], meanChange = 0.75.
    // variance = ((.25)² + (.75)² + (1.25)² + (.75)²) / 3 = 2.75/3
    // sdChange = sqrt(0.91667) = 0.957427
    // cohensD = 0.75 / 0.957427 = 0.78335
    const pre = [3, 4, 2, 5];
    const post = [4, 4, 4, 5];
    const r = pairedChange(pre, post)!;
    expect(r.n).toBe(4);
    expect(r.meanPre).toBe(3.5);
    expect(r.meanPost).toBe(4.25);
    expect(r.meanChange).toBeCloseTo(0.75, 6);
    expect(r.sdChange).toBeCloseTo(0.957427, 5);
    expect(r.cohensD).toBeCloseTo(0.78335, 4);
    // t = 0.75 / (0.957427 / 2) = 1.56672
    expect(r.t).toBeCloseTo(1.56672, 4);
    // p is a valid probability
    expect(r.p).toBeGreaterThan(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it("returns null for fewer than 2 pairs", () => {
    expect(pairedChange([3], [4])).toBeNull();
    expect(pairedChange([], [])).toBeNull();
  });

  it("gives a near-zero p-value for a large, consistent shift", () => {
    // Every student up by 2, with a little noise so sd > 0.
    const pre = [2, 3, 2, 3, 2, 3, 2, 3, 2, 3];
    const post = [4, 5, 4, 5, 4, 5, 4, 4, 5, 5];
    const r = pairedChange(pre, post)!;
    expect(r.meanChange).toBeGreaterThan(1.5);
    expect(r.p).toBeLessThan(0.001);
  });
});

describe("cohenLabel", () => {
  it("buckets effect sizes", () => {
    expect(cohenLabel(0.1)).toBe("negligible");
    expect(cohenLabel(0.3)).toBe("small");
    expect(cohenLabel(0.6)).toBe("medium");
    expect(cohenLabel(0.9)).toBe("large");
    // sign-independent
    expect(cohenLabel(-0.9)).toBe("large");
  });
});

describe("wilcoxonSignedRank", () => {
  it("ranks an all-positive, tie-free shift (hand-checked)", () => {
    // diffs = [1,2,3,4,5], no ties → ranks 1..5, all positive.
    // W+ = 15, W- = 0. meanW = 5·6/4 = 7.5.
    // varW = 5·6·11/24 = 13.75, sdW = 3.70810.
    // z = (15 - 7.5 - 0.5) / 3.70810 = 7 / 3.70810 = 1.88774.
    const r = wilcoxonSignedRank([1, 1, 1, 1, 1], [2, 3, 4, 5, 6])!;
    expect(r.n).toBe(5);
    expect(r.wPlus).toBe(15);
    expect(r.wMinus).toBe(0);
    expect(r.z).toBeCloseTo(1.88774, 4);
    expect(r.p).toBeCloseTo(0.059, 2);
  });

  it("drops zero-difference pairs before ranking", () => {
    // diffs = [1, 0, 2, 0, 3] → three non-zero pairs.
    const r = wilcoxonSignedRank([1, 2, 3, 4, 5], [2, 2, 5, 4, 8])!;
    expect(r.n).toBe(3);
    expect(r.wPlus).toBe(6); // ranks 1+2+3, all positive
    expect(r.wMinus).toBe(0);
  });

  it("averages ranks within tie groups", () => {
    // diffs = [1, 2, 2, 3] → abs ranks: 1, 2.5, 2.5, 4. all positive.
    const r = wilcoxonSignedRank([0, 0, 0, 0], [1, 2, 2, 3])!;
    expect(r.n).toBe(4);
    expect(r.wPlus).toBeCloseTo(10, 6); // 1 + 2.5 + 2.5 + 4
  });

  it("returns null with fewer than 2 non-zero pairs", () => {
    expect(wilcoxonSignedRank([3, 3], [3, 3])).toBeNull(); // all zero diffs
    expect(wilcoxonSignedRank([3], [5])).toBeNull();
  });

  it("yields a small p for a large consistent shift", () => {
    const pre = [2, 2, 3, 2, 3, 2, 3, 2, 3, 2];
    const post = [4, 5, 5, 4, 5, 4, 5, 4, 5, 4];
    const r = wilcoxonSignedRank(pre, post)!;
    expect(r.p).toBeLessThan(0.01);
  });
});
