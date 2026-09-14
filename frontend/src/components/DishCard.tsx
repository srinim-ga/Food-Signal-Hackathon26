/**
 * Dish result card: name, classification, confidence, reasons, inferred
 * ingredients (labeled by source), uncertainties, and dish-specific questions.
 * Inferred ingredients are shown under a "Likely, please confirm" heading and
 * never mixed with stated facts (FR-020).
 */
import { useState } from "react";
import type { AnalyzedDish } from "@food-signal/shared";
import { ClassificationBadge } from "./ClassificationBadge";

export function DishCard({ dish }: { dish: AnalyzedDish }) {
  const [showAll, setShowAll] = useState(false);
  const inferred = showAll ? dish.inferredIngredients : dish.inferredIngredients.slice(0, 3);

  return (
    <article className="dish-card">
      <header className="dish-card-header">
        <h3>{dish.dishName}</h3>
        <div className="dish-badges">
          <ClassificationBadge value={dish.classification} />
          <span className="confidence" aria-label={`Confidence: ${dish.confidence}`}>
            Confidence: {dish.confidence}
          </span>
        </div>
      </header>

      {dish.reasons.length > 0 && (
        <ul className="reasons">
          {dish.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}

      {inferred.length > 0 && (
        <div className="inferred">
          <h4>Likely, please confirm</h4>
          <ul>
            {inferred.map((ing, i) => (
              <li key={i}>
                {ing.name} <span className="tag">{ing.source}</span>
              </li>
            ))}
          </ul>
          {dish.inferredIngredients.length > 3 && (
            <button className="btn-link" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : "Show all likely ingredients"}
            </button>
          )}
        </div>
      )}

      {dish.questionsToAsk.length > 0 && (
        <div className="dish-questions">
          <h4>Ask about this dish</h4>
          <ul>
            {dish.questionsToAsk.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
