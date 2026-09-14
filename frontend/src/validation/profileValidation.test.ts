/**
 * Unit tests for client-side profile validation (FR-005 / FR-006).
 */
import { describe, it, expect } from "vitest";
import { validateProfile, parseAllergies } from "../validation/profileValidation";

describe("validateProfile", () => {
  it("is invalid when all fields are empty", () => {
    expect(validateProfile({}).valid).toBe(false);
  });

  it("is invalid when fields contain only whitespace", () => {
    expect(validateProfile({ dietRestriction: "  ", allergies: ["   "] }).valid).toBe(false);
  });

  it("is valid with a diet restriction", () => {
    expect(validateProfile({ dietRestriction: "vegetarian" }).valid).toBe(true);
  });

  it("is valid with an allergy", () => {
    expect(validateProfile({ allergies: ["peanuts"] }).valid).toBe(true);
  });

  it("treats 'none'/'no-preference' as not meaningful", () => {
    expect(validateProfile({ dietRestriction: "none", diet: "no-preference" }).valid).toBe(false);
  });
});

describe("parseAllergies", () => {
  it("splits and trims comma-separated values", () => {
    expect(parseAllergies(" peanuts , shellfish ,, dairy ")).toEqual(["peanuts", "shellfish", "dairy"]);
  });
});
