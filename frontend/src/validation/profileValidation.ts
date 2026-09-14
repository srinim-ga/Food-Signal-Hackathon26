/**
 * Client-side profile validation (FR-005 / FR-006).
 *
 * Mirrors the server-side rule: at least one meaningful input is required.
 * Keeping it here gives instant feedback; the server re-validates regardless.
 */
import type { UserProfile } from "@food-signal/shared";
import { PROFILE_REQUIRED_MESSAGE } from "@food-signal/shared";

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

function isMeaningful(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.trim().toLowerCase() !== "none";
}

export function validateProfile(profile: UserProfile): ValidationResult {
  const hasRestriction = isMeaningful(profile.dietRestriction);
  const hasDiet = isMeaningful(profile.diet) && profile.diet?.trim().toLowerCase() !== "no-preference";
  const hasAllergy = (profile.allergies ?? []).some(isMeaningful);

  if (hasRestriction || hasDiet || hasAllergy) return { valid: true };
  return { valid: false, message: PROFILE_REQUIRED_MESSAGE };
}

/** Parse a comma-separated allergy string into a trimmed list (FR-004). */
export function parseAllergies(raw: string): string[] {
  return raw
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}
