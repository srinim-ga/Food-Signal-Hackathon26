/**
 * Integration test for the full analysis pipeline via the orchestrator.
 *
 * Uses the offline StubMenuExtractor so it runs in CI with no Azure resources.
 * This exercises extract -> normalize -> classify -> questions -> aggregate
 * end to end, matching the AnalyzeResponse contract.
 */
import { describe, it, expect } from "vitest";
import type { AnalyzeRequest } from "@food-signal/shared";
import { AnalysisOrchestrator } from "../../src/services/analysisOrchestrator.js";
import { StubMenuExtractor } from "../../src/services/stubExtractor.js";
import { NormalizationService } from "../../src/services/normalizationService.js";
import { ClassificationService } from "../../src/services/classificationService.js";
import { QuestionService } from "../../src/services/questionService.js";
import { ConfidenceAggregator } from "../../src/services/confidenceService.js";
import { consoleLogger } from "../../src/logging/logger.js";

function buildOrchestrator() {
  return new AnalysisOrchestrator({
    extractor: new StubMenuExtractor(),
    normalizer: new NormalizationService(),
    classifier: new ClassificationService(),
    questions: new QuestionService(),
    confidence: new ConfidenceAggregator(),
    logger: consoleLogger,
  });
}

describe("Analyze pipeline (integration, stub extractor)", () => {
  it("returns a well-formed AnalyzeResponse for a demo menu", async () => {
    const request: AnalyzeRequest = {
      profile: { allergies: ["tree nuts", "shellfish"], diet: "low-sodium" },
      menu: {
        sourceType: "text",
        content: "Pesto Pasta, Shrimp Ramen, Grilled Chicken Salad, Palak Paneer, Vegetable Biryani",
      },
    };

    const result = await buildOrchestrator().analyze(request);

    expect(result.schemaVersion).toBeDefined();
    expect(result.items.length).toBeGreaterThanOrEqual(3);
    expect(result.disclaimer).toContain("informational");
    // Every Caution/Avoid dish must have at least one reason (FR-030).
    for (const dish of result.items) {
      if (dish.classification !== "Safe") {
        expect(dish.reasons.length).toBeGreaterThan(0);
      }
    }
    // Aggregate confidence is advisory and present (Section 4.4.2).
    expect(["high", "medium", "low"]).toContain(result.overallConfidence.level);
  });

  it("flags shellfish in Shrimp Ramen as Avoid", async () => {
    const request: AnalyzeRequest = {
      profile: { allergies: ["shellfish"] },
      menu: { sourceType: "text", content: "Shrimp Ramen" },
    };
    const result = await buildOrchestrator().analyze(request);
    const ramen = result.items.find((d) => d.dishName.includes("Ramen"));
    expect(ramen?.classification).toBe("Avoid");
  });
});
