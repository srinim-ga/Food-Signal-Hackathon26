/**
 * Service interfaces (abstractions for dependency injection).
 *
 * Depending on interfaces here lets us swap the Azure OpenAI extractor for the
 * offline stub, or replace the rule engine, without touching the orchestrator
 * or the HTTP function. This is the primary extension surface of the backend.
 */
import type {
  AnalyzedDish,
  ExtractedDish,
  Ingredient,
  MenuInput,
  OverallConfidence,
  ServerQuestion,
  UserProfile,
} from "@food-signal/shared";

/** Reads a menu (image/pdf/text) and returns structured dishes (Stage 1). */
export interface IMenuExtractor {
  /**
   * @throws AppError (EXTRACTION_FAILED / MODEL_TIMEOUT / MODEL_INVALID_OUTPUT)
   */
  extract(menu: MenuInput): Promise<ExtractedDish[]>;
}

/** Maps raw ingredient terms to canonical concepts with provenance (Stage 2). */
export interface INormalizer {
  normalize(dish: ExtractedDish): Ingredient[];
}

/** Applies deterministic rules to classify a dish (Stage 3). */
export interface IClassifier {
  classify(
    dish: ExtractedDish,
    ingredients: Ingredient[],
    profile: UserProfile,
  ): AnalyzedDish;
}

/** Generates, deduplicates, and ranks server questions (Stage 4). */
export interface IQuestionGenerator {
  build(dishes: AnalyzedDish[]): { perDish: AnalyzedDish[]; shared: ServerQuestion[] };
}

/** Computes the advisory aggregate confidence (Section 4.4.2). */
export interface IConfidenceAggregator {
  aggregate(dishes: AnalyzedDish[], extraction: ExtractedDish[]): OverallConfidence;
}
