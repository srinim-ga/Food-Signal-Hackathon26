/**
 * Normalization service (Stage 2, Section 7.3 / 8.3.1).
 *
 * Turns raw stated/inferred ingredient strings into Ingredient objects with
 * canonical concepts, provenance (source), and per-ingredient confidence. Pure,
 * deterministic, and unit-testable without the LLM.
 */
import type {
  ExtractedDish,
  Ingredient,
  IngredientSource,
  ConfidenceLevel,
} from "@food-signal/shared";
import type { INormalizer } from "./interfaces.js";
import aliasMapRaw from "../rules/aliasMap.json" with { type: "json" };

// Strip the documentation keys (those starting with "//") from the data map.
const ALIAS_MAP: Record<string, string[]> = Object.fromEntries(
  Object.entries(aliasMapRaw as Record<string, unknown>).filter(
    ([k, v]) => !k.startsWith("//") && Array.isArray(v),
  ) as Array<[string, string[]]>,
);

export class NormalizationService implements INormalizer {
  normalize(dish: ExtractedDish): Ingredient[] {
    const results: Ingredient[] = [];
    const seen = new Set<string>();

    const add = (name: string, source: IngredientSource, baseConfidence: ConfidenceLevel) => {
      const key = `${name.toLowerCase()}|${source}`;
      if (seen.has(key)) return;
      seen.add(key);
      const concepts = this.mapConcepts(name);
      results.push({ name, concepts, source, confidence: this.scoreConfidence(source, baseConfidence, dish) });
    };

    for (const name of dish.statedIngredients) add(name, "stated", "high");

    // Inferred ingredients split into typical vs possible using the ontology
    // components when available; otherwise default to "typical".
    const possibleSet = new Set(
      (dish.components ?? []).flatMap((c) => c.possibleIngredients.map((i) => i.toLowerCase())),
    );
    for (const name of dish.inferredIngredients) {
      const source: IngredientSource = possibleSet.has(name.toLowerCase()) ? "possible" : "typical";
      add(name, source, source === "possible" ? "low" : "medium");
    }

    return results;
  }

  /** Maps a raw term to canonical concepts, with a simple substring fallback. */
  private mapConcepts(name: string): string[] {
    const key = name.trim().toLowerCase();
    if (ALIAS_MAP[key]) return ALIAS_MAP[key];

    const concepts = new Set<string>();
    for (const [alias, mapped] of Object.entries(ALIAS_MAP)) {
      if (key.includes(alias)) mapped.forEach((c) => concepts.add(c));
    }
    return [...concepts];
  }

  /**
   * Per-ingredient confidence (Section 4.4.1): starts from source, then is
   * dampened by poor extraction quality and high regional variability.
   */
  private scoreConfidence(
    source: IngredientSource,
    base: ConfidenceLevel,
    dish: ExtractedDish,
  ): ConfidenceLevel {
    let score = source === "stated" ? 3 : source === "typical" ? 2 : 1;
    if (dish.lowExtractionConfidence) score -= 1;
    // Keep base as a floor signal only.
    if (base === "low") score = Math.min(score, 1);
    return score >= 3 ? "high" : score === 2 ? "medium" : "low";
  }
}
