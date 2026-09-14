/**
 * Screen 3: Results (MVP Requirements Section 3 / 4.6).
 *
 * Groups dishes into Avoid, Caution, and Safe; shows the profile summary,
 * overall confidence, shared questions, and the always-present disclaimer.
 * Redirects to the profile screen if there is no result in the session.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Classification } from "@food-signal/shared";
import { useSession } from "../state/SessionContext";
import { DishCard } from "../components/DishCard";
import { SharedQuestions } from "../components/SharedQuestions";

// Show highest risk first (Avoid, then Caution, then Safe).
const GROUP_ORDER: Classification[] = ["Avoid", "Caution", "Safe"];

export function ResultsPage() {
  const navigate = useNavigate();
  const { result, profile } = useSession();

  useEffect(() => {
    if (!result) navigate("/");
  }, [result, navigate]);

  if (!result) return null;

  const grouped = GROUP_ORDER.map((classification) => ({
    classification,
    dishes: result.items.filter((d) => d.classification === classification),
  }));

  return (
    <div className="results">
      <section className="card summary" aria-labelledby="results-heading">
        <h1 id="results-heading">Results</h1>
        <p className="profile-summary">
          Profile:{" "}
          {[
            profile.dietRestriction,
            profile.diet,
            ...(profile.allergies ?? []),
          ]
            .filter(Boolean)
            .join(", ") || "—"}
        </p>
        <p className="overall-confidence">
          Overall confidence: <strong>{result.overallConfidence.level}</strong> —{" "}
          {result.overallConfidence.reason}
        </p>
        <p className="counts">
          {result.summary.avoidCount} avoid · {result.summary.cautionCount} caution ·{" "}
          {result.summary.safeCount} safe
        </p>
      </section>

      <SharedQuestions questions={result.sharedQuestions} />

      {grouped.map(
        ({ classification, dishes }) =>
          dishes.length > 0 && (
            <section key={classification} className="group" aria-label={`${classification} dishes`}>
              <h2>{classification}</h2>
              {dishes.map((dish) => (
                <DishCard key={dish.dishName} dish={dish} />
              ))}
            </section>
          ),
      )}

      <p className="disclaimer" role="note">
        {result.disclaimer}
      </p>

      <div className="actions">
        <button className="btn-secondary" onClick={() => navigate("/menu")}>
          Analyze another menu
        </button>
        <button className="btn-link" onClick={() => navigate("/")}>
          Edit profile
        </button>
      </div>
    </div>
  );
}
