/**
 * Confidence aggregator (Section 4.4.2).
 *
 * Produces one advisory overall confidence for the whole analysis. Combines
 * extraction quality, menu completeness, and coverage, then dampens by the
 * weakest safety-critical dish so the aggregate can never look more confident
 * than the riskiest important result. It NEVER upgrades a dish to Safe.
 */
import type {
  AnalyzedDish,
  ConfidenceLevel,
  ExtractedDish,
  OverallConfidence,
} from "@food-signal/shared";
import type { IConfidenceAggregator } from "./interfaces.js";

const RANK: Record<ConfidenceLevel, number> = { low: 1, medium: 2, high: 3 };

export class ConfidenceAggregator implements IConfidenceAggregator {
  aggregate(dishes: AnalyzedDish[], extraction: ExtractedDish[]): OverallConfidence {
    if (dishes.length === 0) {
      return { level: "low", reason: "No dishes could be analyzed from the menu." };
    }

    // Signal 1: extraction quality.
    const poorExtraction = extraction.filter((d) => d.lowExtractionConfidence).length;
    const extractionScore = 1 - poorExtraction / extraction.length; // 0..1

    // Signal 2: menu completeness (dishes with any stated ingredients).
    const withStated = dishes.filter((d) => d.statedIngredients.length > 0).length;
    const completeness = withStated / dishes.length;

    // Signal 3: coverage (dishes not resting on low confidence).
    const nonLow = dishes.filter((d) => d.confidence !== "low").length;
    const coverage = nonLow / dishes.length;

    const combined = extractionScore * 0.4 + completeness * 0.3 + coverage * 0.3;
    let level: ConfidenceLevel = combined >= 0.66 ? "high" : combined >= 0.33 ? "medium" : "low";

    // Weakest-link dampening: any safety-critical dish on low confidence pulls down.
    const criticalLow = dishes.some(
      (d) => (d.classification === "Avoid" || d.classification === "Caution") && d.confidence === "low",
    );
    if (criticalLow && RANK[level] > RANK.medium) level = "medium";
    if (criticalLow && dishes.every((d) => d.confidence === "low")) level = "low";

    return { level, reason: reasonFor(level) };
  }
}

function reasonFor(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "Based largely on stated menu details; still confirm with staff.";
    case "medium":
      return "Based partly on typical recipes; confirm with staff.";
    case "low":
    default:
      return "Menu information was limited; confirm all details with staff.";
  }
}
