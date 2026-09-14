/**
 * Analysis orchestrator - the pipeline coordinator.
 *
 * Runs the four stages in order (extract -> normalize -> classify -> questions),
 * then computes the aggregate confidence and assembles the AnalyzeResponse.
 * It depends only on the service interfaces, so any stage can be swapped via DI.
 */
import { randomUUID } from "node:crypto";
import {
  DISCLAIMER,
  SCHEMA_VERSION,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type AnalyzedDish,
} from "@food-signal/shared";
import type {
  IClassifier,
  IConfidenceAggregator,
  IMenuExtractor,
  INormalizer,
  IQuestionGenerator,
} from "./interfaces.js";
import type { Logger } from "../logging/logger.js";

export interface OrchestratorDeps {
  extractor: IMenuExtractor;
  normalizer: INormalizer;
  classifier: IClassifier;
  questions: IQuestionGenerator;
  confidence: IConfidenceAggregator;
  logger: Logger;
}

export class AnalysisOrchestrator {
  constructor(private readonly deps: OrchestratorDeps) {}

  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const { extractor, normalizer, classifier, questions, confidence, logger } = this.deps;

    // Stage 1: extraction (LLM or stub).
    const extracted = await extractor.extract(request.menu);
    logger.info("Extraction complete", { dishCount: extracted.length });

    // Stages 2 + 3: normalize and classify each dish deterministically.
    const analyzed: AnalyzedDish[] = extracted.map((dish) => {
      const ingredients = normalizer.normalize(dish);
      return classifier.classify(dish, ingredients, request.profile);
    });

    // Stage 4: deduplicate/rank questions.
    const { perDish, shared } = questions.build(analyzed);

    // Aggregate confidence (advisory only).
    const overallConfidence = confidence.aggregate(perDish, extracted);

    const summary = {
      safeCount: perDish.filter((d) => d.classification === "Safe").length,
      cautionCount: perDish.filter((d) => d.classification === "Caution").length,
      avoidCount: perDish.filter((d) => d.classification === "Avoid").length,
    };

    return {
      analysisId: randomUUID(),
      schemaVersion: SCHEMA_VERSION,
      // Echo back a sanitized profile summary (Section 9 contract).
      profileSummary: request.profile,
      overallConfidence,
      summary,
      items: perDish,
      sharedQuestions: shared,
      disclaimer: DISCLAIMER,
    };
  }
}
