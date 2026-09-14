/**
 * Offline stub extractor (default when USE_STUB_EXTRACTOR=true).
 *
 * Lets the entire scaffold run and demo without any Azure dependency. It reads
 * pasted text (or a fixed sample for image/pdf inputs), matches lines against
 * the curated dish ontology, and returns TYPICAL composition marked with the
 * appropriate provenance. This is NOT a safety source - it mirrors the shape the
 * real LLM extractor must produce so downstream stages are identical.
 *
 * Extension point: replace with AzureOpenAIExtractor by flipping the feature
 * flag; the orchestrator is unaware of which implementation it received.
 */
import type { ExtractedDish, MenuInput } from "@food-signal/shared";
import type { IMenuExtractor } from "./interfaces.js";
import ontology from "../rules/dishOntology.json" with { type: "json" };

interface OntologyDish {
  dishName: string;
  aliases: string[];
  region: string;
  typicalIngredients: string[];
  possibleIngredients: string[];
  preparationRisks: string[];
  highVariability?: boolean;
}

const DISHES = (ontology as { dishes: OntologyDish[] }).dishes;

export class StubMenuExtractor implements IMenuExtractor {
  async extract(menu: MenuInput): Promise<ExtractedDish[]> {
    const text = this.resolveText(menu).toLowerCase();
    const matched: ExtractedDish[] = [];

    for (const dish of DISHES) {
      const hit = dish.aliases.some((alias) => text.includes(alias.toLowerCase()));
      if (!hit) continue;
      matched.push(this.toExtractedDish(dish));
    }

    // If nothing matched (e.g. an unknown menu), return one low-confidence
    // placeholder so the pipeline still yields a cautious, non-crashing result.
    if (matched.length === 0) {
      matched.push({
        dishName: "Unrecognized dish",
        statedIngredients: [],
        inferredIngredients: [],
        uncertainties: ["Could not confidently read this dish from the menu."],
        lowExtractionConfidence: true,
      });
    }

    return matched;
  }

  private toExtractedDish(dish: OntologyDish): ExtractedDish {
    return {
      dishName: dish.dishName,
      region: dish.region,
      statedIngredients: [],
      inferredIngredients: [...dish.typicalIngredients, ...dish.possibleIngredients],
      components: [
        {
          name: dish.dishName,
          typicalIngredients: dish.typicalIngredients,
          possibleIngredients: dish.possibleIngredients,
          confidence: dish.highVariability ? "low" : "medium",
        },
      ],
      preparationRisks: dish.preparationRisks,
      uncertainties: dish.highVariability
        ? ["Regional variations may change ingredients; confirm with staff."]
        : [],
    };
  }

  /** For image/pdf inputs the stub cannot OCR, so it falls back to a sample. */
  private resolveText(menu: MenuInput): string {
    if (menu.sourceType === "text") return menu.content;
    return SAMPLE_MENU_TEXT;
  }
}

/** Fallback demo menu used when a non-text source is provided to the stub. */
export const SAMPLE_MENU_TEXT = [
  "Pesto Pasta - basil pesto with parmesan",
  "Shrimp Ramen - noodles in a rich broth",
  "Grilled Chicken Salad - fresh greens and dressing",
  "Palak Paneer - spinach and cottage cheese curry",
  "Vegetable Biryani - fragrant spiced rice",
].join("\n");
