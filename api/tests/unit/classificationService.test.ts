/**
 * Unit tests for the deterministic classifier (safety core).
 *
 * These run WITHOUT the LLM - the whole point of the deterministic layer is that
 * allergy/restriction decisions are testable and predictable (Section 8.3.1).
 * Extend this suite with every new rule you add to rules.json.
 */
import { describe, it, expect } from "vitest";
import type { ExtractedDish, UserProfile } from "@food-signal/shared";
import { NormalizationService } from "../../src/services/normalizationService.js";
import { ClassificationService } from "../../src/services/classificationService.js";

const normalizer = new NormalizationService();
const classifier = new ClassificationService();

function analyze(dish: ExtractedDish, profile: UserProfile) {
  const ingredients = normalizer.normalize(dish);
  return classifier.classify(dish, ingredients, profile);
}

describe("ClassificationService", () => {
  it("marks a stated tree-nut ingredient as Avoid for a tree-nut allergy", () => {
    const dish: ExtractedDish = {
      dishName: "Cashew Korma",
      statedIngredients: ["cashew", "cream"],
      inferredIngredients: [],
    };
    const result = analyze(dish, { allergies: ["tree nuts"] });
    expect(result.classification).toBe("Avoid");
    expect(result.reasons.join(" ")).toMatch(/tree_nut/i);
  });

  it("marks an inferred (typical) allergen as Caution, not Avoid", () => {
    const dish: ExtractedDish = {
      dishName: "Pesto Pasta",
      statedIngredients: [],
      inferredIngredients: ["pine nut"],
    };
    const result = analyze(dish, { allergies: ["tree nuts"] });
    expect(result.classification).toBe("Caution");
  });

  it("classifies chicken as Avoid for a vegetarian restriction", () => {
    const dish: ExtractedDish = {
      dishName: "Grilled Chicken Salad",
      statedIngredients: ["chicken", "lettuce"],
      inferredIngredients: [],
    };
    const result = analyze(dish, { dietRestriction: "vegetarian" });
    expect(result.classification).toBe("Avoid");
  });

  it("defaults to Caution when extraction confidence is low", () => {
    const dish: ExtractedDish = {
      dishName: "Unrecognized dish",
      statedIngredients: [],
      inferredIngredients: [],
      lowExtractionConfidence: true,
    };
    const result = analyze(dish, { diet: "low-sodium" });
    expect(result.classification).toBe("Caution");
  });

  it("returns Safe when no rule fires and extraction is confident", () => {
    const dish: ExtractedDish = {
      dishName: "Steamed Rice",
      statedIngredients: ["rice"],
      inferredIngredients: [],
    };
    const result = analyze(dish, { allergies: ["peanuts"] });
    expect(result.classification).toBe("Safe");
  });

  it("takes the most severe result among multiple fired rules", () => {
    const dish: ExtractedDish = {
      dishName: "Shrimp Ramen",
      statedIngredients: ["shrimp", "noodles"],
      inferredIngredients: ["salt"],
    };
    const result = analyze(dish, { allergies: ["shellfish"], diet: "low-sodium" });
    expect(result.classification).toBe("Avoid");
  });
});
