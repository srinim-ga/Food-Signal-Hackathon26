/**
 * Classification service (Stage 3, Section 4.4 / 8.3.1).
 *
 * The deterministic safety core. Takes normalized ingredients + the user
 * profile, fires data-driven rules, and resolves them with a fixed precedence
 * so results are predictable and testable without the LLM. The rule that fires
 * records the concept + source it matched, which becomes the reason and the
 * server question.
 *
 * Governing principle: unknown means Caution; only positive stated conflicts
 * escalate to Avoid; nothing is ever "guaranteed safe".
 */
import type {
  AnalyzedDish,
  Classification,
  ConstraintKind,
  ExtractedDish,
  Ingredient,
  IngredientSource,
  MatchedRuleTrace,
  UserProfile,
} from "@food-signal/shared";
import type { IClassifier } from "./interfaces.js";
import rulesRaw from "../rules/rules.json" with { type: "json" };

interface RuleDef {
  id: string;
  if: string;
  conceptMatches: string[];
  whenSource: IngredientSource[];
  result: Classification;
  reasonTemplate: string;
  questionTemplate: string;
}

const RULES: RuleDef[] = (rulesRaw as { rules: RuleDef[] }).rules;

// Severity ordering used both for precedence and question ranking.
const SEVERITY: Record<Classification, number> = { Safe: 0, Caution: 1, Avoid: 2 };

interface FiredRule {
  trace: MatchedRuleTrace;
  reason: string;
  question: string;
  severity: ConstraintKind;
}

export class ClassificationService implements IClassifier {
  classify(dish: ExtractedDish, ingredients: Ingredient[], profile: UserProfile): AnalyzedDish {
    const constraints = this.expandProfile(profile);
    const fired: FiredRule[] = [];

    for (const constraint of constraints) {
      for (const rule of RULES) {
        if (!this.ruleAppliesToConstraint(rule, constraint)) continue;
        const match = this.findMatchingIngredient(rule, ingredients, constraint);
        if (!match) continue;

        fired.push({
          trace: {
            constraint: constraint.value,
            concept: match.concept,
            source: match.ingredient.source,
            result: rule.result,
          },
          reason: this.fill(rule.reasonTemplate, { concept: match.concept, constraint: constraint.value, dish: dish.dishName }),
          question: this.fill(rule.questionTemplate, { concept: match.concept, constraint: constraint.value, dish: dish.dishName }),
          severity: constraint.kind,
        });
      }
    }

    return this.resolve(dish, ingredients, fired);
  }

  /** Fixed precedence resolver: dish takes the most severe fired result. */
  private resolve(dish: ExtractedDish, ingredients: Ingredient[], fired: FiredRule[]): AnalyzedDish {
    let classification: Classification = "Safe";

    // Insufficient information -> Caution (FR-032), even with no fired rule.
    const insufficient =
      dish.lowExtractionConfidence || (dish.dishName === "Unrecognized dish");

    for (const f of fired) {
      if (SEVERITY[f.trace.result] > SEVERITY[classification]) classification = f.trace.result;
    }
    if (classification === "Safe" && insufficient) classification = "Caution";

    const reasons = dedupe(fired.map((f) => f.reason));
    if (classification === "Caution" && insufficient && reasons.length === 0) {
      reasons.push("Menu information was insufficient to confirm this dish is safe.");
    }

    return {
      dishName: dish.dishName,
      description: dish.description,
      classification,
      confidence: this.dishConfidence(ingredients, fired),
      statedIngredients: dish.statedIngredients,
      inferredIngredients: ingredients.filter((i) => i.source !== "stated"),
      reasons,
      uncertainties: dish.uncertainties ?? [],
      questionsToAsk: dedupe(fired.map((f) => f.question)),
      matchedRules: fired.map((f) => f.trace),
    };
  }

  /**
   * Dish confidence = lowest confidence among the ingredients that DROVE the
   * classification (Section 4.4.1). If nothing fired, use the weakest overall.
   */
  private dishConfidence(ingredients: Ingredient[], fired: FiredRule[]): "high" | "medium" | "low" {
    const drivers = fired.length > 0
      ? ingredients.filter((i) => fired.some((f) => i.concepts.includes(f.trace.concept)))
      : ingredients;
    if (drivers.length === 0) return "medium";
    const rank = { high: 3, medium: 2, low: 1 } as const;
    const min = Math.min(...drivers.map((d) => rank[d.confidence]));
    return min >= 3 ? "high" : min === 2 ? "medium" : "low";
  }

  private expandProfile(profile: UserProfile): Array<{ kind: ConstraintKind; value: string }> {
    const out: Array<{ kind: ConstraintKind; value: string }> = [];
    for (const a of profile.allergies ?? []) if (a.trim()) out.push({ kind: "allergy", value: normalizeAllergy(a) });
    if (isSet(profile.dietRestriction)) out.push({ kind: "restriction", value: profile.dietRestriction!.trim().toLowerCase() });
    if (isSet(profile.diet)) out.push({ kind: "diet", value: profile.diet!.trim().toLowerCase() });
    for (const c of profile.conditions ?? []) if (c.trim()) out.push({ kind: "condition", value: c.trim().toLowerCase() });
    return out;
  }

  private ruleAppliesToConstraint(rule: RuleDef, constraint: { kind: ConstraintKind; value: string }): boolean {
    const [kind, value] = rule.if.split(":");
    if (kind !== constraint.kind) return false;
    return value === "*" || value === constraint.value;
  }

  /** Finds an ingredient whose concept conflicts, respecting source gating. */
  private findMatchingIngredient(
    rule: RuleDef,
    ingredients: Ingredient[],
    constraint: { kind: ConstraintKind; value: string },
  ): { ingredient: Ingredient; concept: string } | null {
    // Wildcard allergy rules match the allergy value mapped to a concept.
    const targetConcepts = rule.conceptMatches.includes("__allergy_concept__")
      ? [allergyToConcept(constraint.value)]
      : rule.conceptMatches;

    for (const ingredient of ingredients) {
      if (!rule.whenSource.includes(ingredient.source)) continue;
      const hit = ingredient.concepts.find((c) => targetConcepts.includes(c));
      if (hit) return { ingredient, concept: hit };
    }
    return null;
  }

  private fill(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? key);
  }
}

// --- helpers ---

function isSet(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0 && v.trim().toLowerCase() !== "none" && v.trim().toLowerCase() !== "no-preference";
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

/** Normalize common allergy aliases (FR-008). */
function normalizeAllergy(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Map a user's allergy word to a canonical concept id used in rules/aliasMap. */
function allergyToConcept(allergy: string): string {
  const a = allergy.toLowerCase();
  if (a.includes("peanut")) return "peanut";
  if (a.includes("tree nut") || a === "nuts" || a.includes("nut")) return "tree_nut";
  if (a.includes("shell")) return "shellfish";
  if (a.includes("dairy") || a.includes("milk") || a.includes("lactose")) return "dairy";
  if (a.includes("egg")) return "egg";
  if (a.includes("soy")) return "soy";
  if (a.includes("wheat") || a.includes("gluten")) return "wheat";
  if (a.includes("sesame")) return "sesame";
  if (a.includes("fish")) return "fish";
  if (a.includes("coconut")) return "coconut";
  return a.replace(/\s+/g, "_");
}
