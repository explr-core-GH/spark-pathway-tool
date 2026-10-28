import { describe, expect, it } from "vitest";
import {
  CAMP_ADJECTIVES,
  CAMP_ANIMALS,
  STAFF_WORDS,
  makeCampPassword,
  makeStaffPassword,
  randomDigits,
  randomSuffix,
} from "./credentials.server";

describe("generated credentials", () => {
  it("camp passwords are adjective-animal-NN from the lists", () => {
    for (let i = 0; i < 200; i++) {
      const [adj, animal, num] = makeCampPassword().split("-");
      expect(CAMP_ADJECTIVES).toContain(adj);
      expect(CAMP_ANIMALS).toContain(animal);
      expect(Number(num)).toBeGreaterThanOrEqual(10);
      expect(Number(num)).toBeLessThanOrEqual(99);
    }
  });

  it("word lists are large and free of duplicates", () => {
    expect(new Set(CAMP_ADJECTIVES).size).toBe(CAMP_ADJECTIVES.length);
    expect(new Set(CAMP_ANIMALS).size).toBe(CAMP_ANIMALS.length);
    expect(new Set(STAFF_WORDS).size).toBe(STAFF_WORDS.length);
    expect(CAMP_ADJECTIVES.length * CAMP_ANIMALS.length * 90).toBeGreaterThan(200_000);
  });

  it("staff passphrases are three words and a three-digit number", () => {
    for (let i = 0; i < 100; i++) {
      const parts = makeStaffPassword().split("-");
      expect(parts).toHaveLength(4);
      for (const w of parts.slice(0, 3)) expect(STAFF_WORDS).toContain(w);
      expect(parts[3]).toMatch(/^\d{3}$/);
    }
  });

  it("digits and suffixes have the requested length and alphabet", () => {
    expect(randomDigits(3)).toMatch(/^\d{3}$/);
    expect(randomSuffix(6)).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/);
    const draws = new Set(Array.from({ length: 50 }, () => randomSuffix(4)));
    expect(draws.size).toBeGreaterThan(40);
  });
});
