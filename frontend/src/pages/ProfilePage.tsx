/**
 * Screen 1: Profile (MVP Requirements Section 3 / 4.1).
 *
 * Diet Restriction and Diet dropdowns + free-text Allergies. Continue is enabled
 * only when at least one meaningful input is provided (FR-005 / FR-006).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DIET_OPTIONS, DIET_RESTRICTION_OPTIONS } from "@food-signal/shared";
import { useSession } from "../state/SessionContext";
import { parseAllergies, validateProfile } from "../validation/profileValidation";

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, setProfile } = useSession();

  const [dietRestriction, setDietRestriction] = useState(profile.dietRestriction ?? "");
  const [diet, setDiet] = useState(profile.diet ?? "");
  const [allergiesText, setAllergiesText] = useState((profile.allergies ?? []).join(", "));
  const [error, setError] = useState<string | undefined>();

  const handleContinue = () => {
    const next = {
      dietRestriction: dietRestriction || null,
      diet: diet || null,
      allergies: parseAllergies(allergiesText),
    };
    const result = validateProfile(next);
    if (!result.valid) {
      setError(result.message);
      return;
    }
    setError(undefined);
    setProfile(next);
    navigate("/menu");
  };

  return (
    <section className="card" aria-labelledby="profile-heading">
      <h1 id="profile-heading">Your dietary profile</h1>
      <p className="muted">Provide at least one: a diet restriction, a diet preference, or an allergy.</p>

      <div className="field">
        <label htmlFor="dietRestriction">Diet restriction</label>
        <select
          id="dietRestriction"
          value={dietRestriction}
          onChange={(e) => setDietRestriction(e.target.value)}
        >
          {DIET_RESTRICTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="diet">Diet</label>
        <select id="diet" value={diet} onChange={(e) => setDiet(e.target.value)}>
          {DIET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="allergies">Allergies</label>
        <input
          id="allergies"
          type="text"
          placeholder="e.g. peanuts, shellfish, dairy"
          value={allergiesText}
          onChange={(e) => setAllergiesText(e.target.value)}
          aria-describedby={error ? "profile-error" : undefined}
        />
        <span className="hint">Separate multiple allergies with commas.</span>
      </div>

      {error && (
        <p id="profile-error" className="error" role="alert">
          {error}
        </p>
      )}

      <button className="btn-primary" onClick={handleContinue}>
        Continue
      </button>
    </section>
  );
}
