/**
 * Food Signal domain models.
 *
 * These types describe the core business concepts from the MVP requirements:
 * user profile, extracted dishes, ingredients (with provenance and confidence),
 * risk classification, and server questions.
 *
 * MVP scope note: the PRD mentions chronic "conditions" as a future-leaning
 * concept. The MVP Requirements (Screen 1) require only Diet Restriction, Diet,
 * and Allergies. We model `conditions` as an OPTIONAL, forward-compatible field
 * that the MVP UI does not populate. See Food-Signal-MVP-Requirements Section 2.
 */

/** Current schema version for the analysis contract. Bump on breaking changes. */
export const SCHEMA_VERSION = "1.0.0" as const;

/** Where an ingredient came from. Drives confidence and messaging (FR-020). */
export type IngredientSource = "stated" | "typical" | "possible";

/** Confidence label surfaced to the user (FR-031, Section 4.4.1). */
export type ConfidenceLevel = "high" | "medium" | "low";

/** User-facing risk classification for a dish (FR-025). */
export type Classification = "Safe" | "Caution" | "Avoid";

/** Category of a user profile constraint, used by the deterministic rules. */
export type ConstraintKind = "allergy" | "restriction" | "diet" | "condition";

/**
 * The user's dietary profile. At least one of dietRestriction, diet, or
 * allergies must be meaningfully populated (FR-005 / FR-006).
 */
export interface UserProfile {
  /** e.g. "vegetarian", "vegan", "halal", "gluten-free". Optional. */
  dietRestriction?: string | null;
  /** e.g. "low sodium", "high protein". Optional. */
  diet?: string | null;
  /** Free-text allergies, normalized to a list. Optional. */
  allergies?: string[];
  /**
   * Forward-compatible: chronic conditions (GERD, hypertension, ...).
   * Not collected by the MVP UI. Present so the pipeline can extend without a
   * contract change. See PRD Section 8.1.
   */
  conditions?: string[];
}

/** A single ingredient with provenance and per-ingredient confidence. */
export interface Ingredient {
  /** Original display term as read from the menu or inferred. */
  name: string;
  /** Normalized allergen/restriction concepts (e.g. ["dairy"], ["tree_nut"]). */
  concepts: string[];
  /** Whether it was stated, typical, or possible (FR-020). */
  source: IngredientSource;
  /** Per-ingredient confidence (Section 4.4.1). */
  confidence: ConfidenceLevel;
}

/** A component of a compound/regional dish (Section 7.2 ontology). */
export interface DishComponent {
  name: string;
  type?: string;
  typicalIngredients: string[];
  possibleIngredients: string[];
  confidence: ConfidenceLevel;
}

/**
 * Raw structured output produced by the extraction stage (LLM or stub), before
 * deterministic rules run. Never rendered directly as a final result (Section 8.4).
 */
export interface ExtractedDish {
  dishName: string;
  description?: string;
  region?: string;
  statedIngredients: string[];
  inferredIngredients: string[];
  components?: DishComponent[];
  preparationRisks?: string[];
  /** Things the model could not confirm; drives questions (FR-022). */
  uncertainties?: string[];
  /** Candidate questions proposed by the model, refined later. */
  candidateQuestions?: string[];
  /** Extraction quality flag for ambiguity handling (Section 4.3.3). */
  lowExtractionConfidence?: boolean;
}

/** A question the user can ask restaurant staff (Section 4.5). */
export interface ServerQuestion {
  /** Stable id for dedup/copy actions. */
  id: string;
  text: string;
  /** Severity tier used for ranking (allergy > restriction > diet). */
  severity: ConstraintKind;
  /** Dish this question relates to, or null if profile-level/shared. */
  dishName: string | null;
}

/** A record of a fired deterministic rule; becomes a reason + question. */
export interface MatchedRuleTrace {
  constraint: string;
  concept: string;
  source: IngredientSource;
  result: Classification;
}

/** The fully analyzed dish rendered on the results screen. */
export interface AnalyzedDish {
  dishName: string;
  description?: string;
  classification: Classification;
  confidence: ConfidenceLevel;
  statedIngredients: string[];
  inferredIngredients: Ingredient[];
  reasons: string[];
  uncertainties: string[];
  questionsToAsk: string[];
  /** Audit trail of which rules produced the classification. */
  matchedRules?: MatchedRuleTrace[];
}

/** Aggregate, advisory analysis confidence (Section 4.4.2). */
export interface OverallConfidence {
  level: ConfidenceLevel;
  reason: string;
}

/** Menu input source type. */
export type MenuSourceType = "image" | "pdf" | "text";
