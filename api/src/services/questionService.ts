/**
 * Question service (Stage 4, Section 4.5 / 4.5.1).
 *
 * Deduplicates questions across dishes, ranks them by severity (allergy >
 * restriction > diet), and splits them into shared (profile-level) questions
 * and dish-specific ones. Reduces user effort so a diner can ask a few
 * questions, not manage a per-dish checklist.
 */
import type { AnalyzedDish, ConstraintKind, ServerQuestion } from "@food-signal/shared";
import type { IQuestionGenerator } from "./interfaces.js";

const SEVERITY_ORDER: Record<ConstraintKind, number> = {
  allergy: 0,
  restriction: 1,
  diet: 2,
  condition: 3,
};

/** Max shared questions shown by default (Section 4.5.1 cap). */
const SHARED_QUESTION_CAP = 5;

export class QuestionService implements IQuestionGenerator {
  build(dishes: AnalyzedDish[]): { perDish: AnalyzedDish[]; shared: ServerQuestion[] } {
    // Count how many dishes raise each question text to find shared concerns.
    const occurrences = new Map<string, { count: number; severity: ConstraintKind }>();

    for (const dish of dishes) {
      for (const q of dish.questionsToAsk) {
        const severity = severityForQuestion(dish);
        const existing = occurrences.get(q);
        if (existing) {
          existing.count += 1;
          existing.severity = mostSevere(existing.severity, severity);
        } else {
          occurrences.set(q, { count: 1, severity });
        }
      }
    }

    // A question raised by 2+ dishes becomes a shared, profile-level question.
    const shared: ServerQuestion[] = [];
    const sharedTexts = new Set<string>();
    for (const [text, meta] of occurrences.entries()) {
      if (meta.count >= 2) {
        sharedTexts.add(text);
        shared.push({ id: hashId(text), text, severity: meta.severity, dishName: null });
      }
    }

    shared.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    const cappedShared = shared.slice(0, SHARED_QUESTION_CAP);

    // Remove shared questions from individual dishes to avoid repetition.
    const perDish = dishes.map((dish) => ({
      ...dish,
      questionsToAsk: dish.questionsToAsk.filter((q) => !sharedTexts.has(q)),
    }));

    return { perDish, shared: cappedShared };
  }
}

function severityForQuestion(dish: AnalyzedDish): ConstraintKind {
  const kinds = (dish.matchedRules ?? []).map((r) => inferKind(r.constraint));
  return kinds.reduce<ConstraintKind>((acc, k) => mostSevere(acc, k), "condition");
}

function inferKind(constraint: string): ConstraintKind {
  const c = constraint.toLowerCase();
  if (["vegetarian", "vegan", "halal", "kosher", "gluten-free", "lactose-free"].includes(c)) return "restriction";
  if (["low-sodium", "low-sugar", "low-fat", "high-protein", "avoid-spicy"].includes(c)) return "diet";
  if (["gerd", "diabetes", "hypertension"].some((x) => c.includes(x))) return "condition";
  return "allergy";
}

function mostSevere(a: ConstraintKind, b: ConstraintKind): ConstraintKind {
  return SEVERITY_ORDER[a] <= SEVERITY_ORDER[b] ? a : b;
}

function hashId(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `q_${Math.abs(hash)}`;
}
