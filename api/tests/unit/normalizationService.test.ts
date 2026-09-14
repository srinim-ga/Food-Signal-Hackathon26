/**
 * Unit tests for ingredient normalization (alias map + provenance).
 */
import { describe, it, expect } from "vitest";
import type { ExtractedDish } from "@food-signal/shared";
import { NormalizationService } from "../../src/services/normalizationService.js";

const normalizer = new NormalizationService();

describe("NormalizationService", () => {
  it("maps paneer and ghee to the dairy concept", () => {
    const dish: ExtractedDish = {
      dishName: "Palak Paneer",
      statedIngredients: ["paneer"],
      inferredIngredients: ["ghee"],
    };
    const ingredients = normalizer.normalize(dish);
    const concepts = ingredients.flatMap((i) => i.concepts);
    expect(concepts).toContain("dairy");
  });

  it("marks stated ingredients as high confidence", () => {
    const dish: ExtractedDish = {
      dishName: "Test",
      statedIngredients: ["cashew"],
      inferredIngredients: [],
    };
    const [ingredient] = normalizer.normalize(dish);
    expect(ingredient.source).toBe("stated");
    expect(ingredient.confidence).toBe("high");
  });

  it("classifies component 'possible' ingredients with lower confidence", () => {
    const dish: ExtractedDish = {
      dishName: "Vegetable Biryani",
      statedIngredients: [],
      inferredIngredients: ["cashew"],
      components: [
        { name: "biryani", typicalIngredients: [], possibleIngredients: ["cashew"], confidence: "low" },
      ],
    };
    const [ingredient] = normalizer.normalize(dish);
    expect(ingredient.source).toBe("possible");
    expect(ingredient.confidence).toBe("low");
  });
});
